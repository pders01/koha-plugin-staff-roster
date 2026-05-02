package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Rrule -
Subset of RFC 5545 RRULE handling: parse, build, label, applies-on.

=head1 DESCRIPTION

Supports FREQ=WEEKLY|MONTHLY, BYDAY (with optional ordinal prefix
1MO / -1FR for monthly), INTERVAL, UNTIL. Backed by
DateTime::Event::ICal for canonical apply-checks; the fast path skips
the heavy machinery for the common weekly INTERVAL=1 + no-UNTIL case.

=cut

use Modern::Perl;

use Exporter qw(import);

use DateTime::Event::ICal;
use DateTime::Format::ICal;
use Koha::DateUtils;

our @EXPORT_OK = qw(
    rrule_from_params parsed_rrule
    dows_from_rrule byday_from_rrule rrule_label
    slot_applies_on slot_anchor
);

# Map iCal weekday codes (BYDAY) <-> 0..6 with Sunday = 0 (Perl/JS convention).
my %ICAL_TO_DOW = ( SU => 0, MO => 1, TU => 2, WE => 3, TH => 4, FR => 5, SA => 6 );
my %DOW_TO_ICAL = reverse %ICAL_TO_DOW;

=head2 rrule_from_params(%params)

Build an RRULE string from a structured params hash. Keys:

  freq       'WEEKLY' (default) or 'MONTHLY'
  dows       arrayref of 0..6 weekday ints (required)
  ordinal    signed int -1..4; only meaningful when freq=MONTHLY (1MO, -1FR)
  interval   positive int; omitted unless > 1
  until_date 'YYYY-MM-DD'; encoded as UTC end-of-day

Returns the empty string when no usable weekdays were supplied.

=cut

sub rrule_from_params {
    my (%p)  = @_;
    my $freq = $p{freq} || 'WEEKLY';
    my @dows = @{ $p{dows} || [] };
    return q{} if !@dows;
    my @codes = grep {defined} map { $DOW_TO_ICAL{$_} } @dows;
    return q{} if !@codes;
    if ( $freq eq 'MONTHLY' && defined $p{ordinal} && $p{ordinal} != 0 ) {
        my $ord = int $p{ordinal};
        @codes = map {"$ord$_"} @codes;
    }
    my @parts = ("FREQ=$freq");
    push @parts, "INTERVAL=$p{interval}" if $p{interval} && $p{interval} > 1;
    push @parts, 'BYDAY=' . join q{,}, @codes;
    if ( $p{until_date} && $p{until_date} =~ /^(\d{4})-(\d{2})-(\d{2})$/ ) {
        push @parts, "UNTIL=$1$2${3}T235959Z";
    }
    return join q{;}, @parts;
}

=head2 parsed_rrule($rrule)

Parse RRULE into a structured hashref for UI prefill, validation, and
label rendering. Always returns the same shape (with sane defaults).

=cut

sub parsed_rrule {
    my ($rrule) = @_;
    my %out = (
        freq        => 'WEEKLY',
        interval    => 1,
        dows        => [],
        byday_codes => [],
        ordinal     => undef,
        until_date  => undef,
    );
    return \%out if !$rrule;
    if ( $rrule =~ /FREQ=([A-Z]+)/sm )               { $out{freq}       = $1; }
    if ( $rrule =~ /INTERVAL=(\d+)/sm )              { $out{interval}   = $1 + 0; }
    if ( $rrule =~ /UNTIL=(\d{4})(\d{2})(\d{2})/sm ) { $out{until_date} = "$1-$2-$3"; }
    if ( $rrule =~ /BYDAY=([^;]+)/sm ) {
        my @dows;
        my @byday_codes;
        my %ord_seen;
        for my $tok ( split /,/sm, $1 ) {
            next if $tok !~ /^(-?\d+)?([A-Z]{2})$/sm;
            my ( $ord, $code ) = ( $1, $2 );
            next if !defined $ICAL_TO_DOW{$code};
            push @dows,        $ICAL_TO_DOW{$code};
            push @byday_codes, $code;
            $ord_seen{$ord} = 1 if defined $ord;
        }
        $out{dows}        = \@dows;
        $out{byday_codes} = \@byday_codes;
        my @ord_list = keys %ord_seen;
        $out{ordinal} = $ord_list[0] + 0 if @ord_list == 1;
    }
    return \%out;
}

sub dows_from_rrule  { return parsed_rrule( $_[0] )->{dows}; }
sub byday_from_rrule { return parsed_rrule( $_[0] )->{byday_codes}; }

=head2 rrule_label($rrule)

Human-readable summary of an RRule.

  "Mon, Wed"
  "Every 2 weeks: Mon"
  "1st Monday of month (until 2026-08-31)"

=cut

sub rrule_label {
    my ($rrule) = @_;
    my $p = parsed_rrule($rrule);
    return q{} if !@{ $p->{dows} };
    my @day_names    = qw( Sunday Monday Tuesday Wednesday Thursday Friday Saturday );
    my $days         = join q{, }, map { substr $day_names[$_], 0, 3 } @{ $p->{dows} };
    my $until_suffix = $p->{until_date} ? " (until $p->{until_date})" : q{};
    if ( $p->{freq} eq 'MONTHLY' ) {
        my %ord_label = ( 1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th', -1 => 'Last' );
        my $ord       = $p->{ordinal}      ? ( $ord_label{ $p->{ordinal} } || $p->{ordinal} ) : 'Each';
        my $every     = $p->{interval} > 1 ? "Every $p->{interval} months: "                  : q{};
        return "$every$ord $days of month$until_suffix";
    }
    my $every = $p->{interval} > 1 ? "Every $p->{interval} weeks: " : q{};
    return "$every$days$until_suffix";
}

=head2 slot_applies_on($rrule, $date, $anchor_iso?)

Does the slot's RRule apply on the given ISO date?

C<$anchor_iso> (optional, YYYY-MM-DD) is the recurrence dtstart;
required for INTERVAL>1 to be deterministic. Falls back to C<$date>
if omitted, which keeps the old behavior for plain weekly rules.

=cut

sub slot_applies_on {
    my ( $rrule, $date, $anchor_iso ) = @_;
    return 0 if !$rrule || !$date;
    my $dt = eval { Koha::DateUtils::dt_from_string( $date, 'iso' ) };
    return 0 if !$dt;

    my $p = parsed_rrule($rrule);
    return 0 if !@{ $p->{dows} };

    if ( $p->{freq} eq 'WEEKLY' && $p->{interval} == 1 && !$p->{until_date} ) {
        my $wday = $dt->day_of_week % 7;    # 1=Mon..7=Sun -> 0..6 with Sunday=0
        return scalar grep { $_ == $wday } @{ $p->{dows} };
    }

    my $anchor
        = $anchor_iso
        ? eval { Koha::DateUtils::dt_from_string( $anchor_iso, 'iso' ) }
        : $dt->clone;
    $anchor ||= $dt->clone;
    $anchor->truncate( to => 'day' );

    my $set = eval { DateTime::Format::ICal->parse_recurrence( recurrence => $rrule, dtstart => $anchor, ); };
    if ( !$set ) {
        my $err = $@ || 'unknown';
        warn "StaffRoster: RRule parse failed for '$rrule': $err";
        return 0;
    }

    my $check = $dt->clone->truncate( to => 'day' );
    return $set->contains($check) ? 1 : 0;
}

=head2 slot_anchor($dbh, $slot_id)

Lookup a slot's recurrence anchor (its parent roster's
C<effective_from>) for deterministic INTERVAL handling. Cheap
single-row read.

=cut

sub slot_anchor {
    my ( $dbh, $slot_id ) = @_;
    return if !$slot_id;
    my ($anchor) = $dbh->selectrow_array(
        q{SELECT r.effective_from FROM staff_roster_slots s
          JOIN staff_roster r ON s.roster_id = r.id WHERE s.id = ?},
        undef, $slot_id
    );
    return $anchor;
}

1;
