#!/usr/bin/perl

# Hot-path tests for the RRule helpers in Koha::Plugin::Xyz::Paulderscheid::StaffRoster.
# Run from inside the KTD container (Koha libs + DateTime::Event::ICal needed):
#
#   cat t/rrule.t | docker exec -i dev-koha-1 perl -
#
# or, if t/ has been copied into the container's plugin tree:
#
#   docker exec dev-koha-1 prove -v /var/lib/koha/kohadev/plugins/t/rrule.t

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

# Prefer the source repo when this test runs from there (CI / host); fall back
# to the deployed container path so prove inside the container works too.
for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';

use_ok('Koha::Plugin::Xyz::Paulderscheid::StaffRoster')
    or BAIL_OUT('plugin module did not load');

# Pull the file-scoped subs by name; they are intentionally not methods.
no strict 'refs';
my $NS         = 'Koha::Plugin::Xyz::Paulderscheid::StaffRoster::';
my $build      = \&{"${NS}_rrule_from_params"};
my $parse      = \&{"${NS}_parsed_rrule"};
my $dows_from  = \&{"${NS}_dows_from_rrule"};
my $byday_from = \&{"${NS}_byday_from_rrule"};
my $label      = \&{"${NS}_rrule_label"};
my $applies    = \&{"${NS}_slot_applies_on"};
use strict 'refs';

subtest '_rrule_from_params builds canonical RRULE strings' => sub {
    is( $build->( freq => 'WEEKLY', dows => [ 1, 3, 5 ] ), 'FREQ=WEEKLY;BYDAY=MO,WE,FR', 'plain weekly multi-day' );

    is( $build->( freq => 'MONTHLY', dows => [1], ordinal => 1 ), 'FREQ=MONTHLY;BYDAY=1MO', 'monthly first Monday' );

    is( $build->( freq => 'MONTHLY', dows => [ 1, 3 ], ordinal => -1 ),
        'FREQ=MONTHLY;BYDAY=-1MO,-1WE',
        'monthly last Mon + last Wed'
    );

    is( $build->( freq => 'WEEKLY', dows => [1], interval => 2 ),
        'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO',
        'INTERVAL only emitted when > 1'
    );

    is( $build->( freq => 'WEEKLY', dows => [1], interval => 1 ), 'FREQ=WEEKLY;BYDAY=MO', 'INTERVAL=1 stays implicit' );

    is( $build->( freq => 'WEEKLY', dows => [3], until_date => '2026-05-15' ),
        'FREQ=WEEKLY;BYDAY=WE;UNTIL=20260515T235959Z',
        'UNTIL encoded as end-of-day UTC'
    );

    is( $build->( freq => 'WEEKLY', dows => [] ),   q{}, 'no dows -> empty' );
    is( $build->( freq => 'WEEKLY', dows => [99] ), q{}, 'invalid dows -> empty' );

    # Ordinal is ignored for WEEKLY since BYDAY ordinals are a monthly concept.
    is( $build->( freq => 'WEEKLY', dows => [1], ordinal => 2 ),
        'FREQ=WEEKLY;BYDAY=MO', 'ordinal silently dropped on WEEKLY' );
};

subtest '_parsed_rrule round-trips structured data' => sub {
    my $p1 = $parse->('FREQ=WEEKLY;BYDAY=MO,FR');
    is( $p1->{freq},     'WEEKLY', 'freq' );
    is( $p1->{interval}, 1,        'default interval = 1' );
    is_deeply( $p1->{dows},        [ 1,    5 ],    'dows extracted in BYDAY order' );
    is_deeply( $p1->{byday_codes}, [ 'MO', 'FR' ], 'byday_codes preserved' );
    is( $p1->{ordinal},    undef, 'no ordinal on plain weekly' );
    is( $p1->{until_date}, undef, 'no UNTIL' );

    my $p2 = $parse->('FREQ=MONTHLY;BYDAY=2WE');
    is( $p2->{freq},    'MONTHLY', 'monthly freq' );
    is( $p2->{ordinal}, 2,         'ordinal extracted from BYDAY prefix' );
    is_deeply( $p2->{dows}, [3], 'dow stripped from ordinal prefix' );

    my $p3 = $parse->('FREQ=WEEKLY;INTERVAL=3;BYDAY=TU;UNTIL=20260801T235959Z');
    is( $p3->{interval},   3,            'interval parsed' );
    is( $p3->{until_date}, '2026-08-01', 'UNTIL re-formatted as ISO date' );

    # Mixed ordinals -> ambiguous, leave ordinal undef so the form falls back.
    my $p4 = $parse->('FREQ=MONTHLY;BYDAY=1MO,2WE');
    is( $p4->{ordinal}, undef, 'mixed ordinals collapse to undef' );

    my $p5 = $parse->(undef);
    is( $p5->{freq}, 'WEEKLY', 'undef rrule still returns defaulted shape' );
    is_deeply( $p5->{dows}, [], 'undef rrule has empty dows' );
};

subtest 'shim helpers stay backwards-compatible' => sub {
    is_deeply( $dows_from->('FREQ=WEEKLY;BYDAY=MO,WE'),    [ 1, 3 ], 'weekly dows' );
    is_deeply( $dows_from->('FREQ=MONTHLY;BYDAY=1MO,2WE'), [ 1, 3 ], 'monthly: ordinals stripped, weekday ints recovered' );
    is_deeply(
        $byday_from->('FREQ=MONTHLY;BYDAY=1MO,-1FR'),
        [ 'MO', 'FR' ],
        'byday shim returns weekday-only codes for client-side filters'
    );
    is_deeply( $byday_from->(q{}), [], 'empty rrule -> empty list' );
};

subtest '_rrule_label renders human-readable summaries' => sub {
    is( $label->('FREQ=WEEKLY;BYDAY=MO,WE,FR'),                  'Mon, Wed, Fri',          'plain weekly' );
    is( $label->('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO'),             'Every 2 weeks: Mon',     'interval prefix' );
    is( $label->('FREQ=WEEKLY;BYDAY=WE;UNTIL=20260515T235959Z'), 'Wed (until 2026-05-15)', 'until suffix' );
    is( $label->('FREQ=MONTHLY;BYDAY=1MO'),                      '1st Mon of month',       'monthly first' );
    is( $label->('FREQ=MONTHLY;BYDAY=-1FR'),                     'Last Fri of month',      'monthly last' );
    is( $label->('FREQ=MONTHLY;INTERVAL=2;BYDAY=3WE'), 'Every 2 months: 3rd Wed of month', 'monthly with interval' );
    is( $label->(q{}),                                 q{},                                'empty rrule -> empty label' );
};

subtest '_slot_applies_on weekly fast path' => sub {

    # 2026-05-04 is Mon, 05-05 is Tue, 05-06 is Wed.
    my $r = 'FREQ=WEEKLY;BYDAY=MO,WE,FR';
    is( $applies->( $r,  '2026-05-04' ), 1, 'Mon hit' );
    is( $applies->( $r,  '2026-05-05' ), 0, 'Tue miss' );
    is( $applies->( $r,  '2026-05-06' ), 1, 'Wed hit' );
    is( $applies->( $r,  '2026-05-08' ), 1, 'Fri hit' );
    is( $applies->( q{}, '2026-05-04' ), 0, 'empty rrule -> 0' );
    is( $applies->( $r,  q{} ),          0, 'empty date -> 0' );
};

subtest '_slot_applies_on respects UNTIL' => sub {
    my $r = 'FREQ=WEEKLY;BYDAY=WE;UNTIL=20260513T235959Z';
    is( $applies->( $r, '2026-05-13' ), 1, 'Wed on UNTIL day still applies' );
    is( $applies->( $r, '2026-05-20' ), 0, 'Wed past UNTIL drops out' );
};

subtest '_slot_applies_on respects INTERVAL with anchor' => sub {

    # Every 2 weeks on Monday, anchored to 2026-05-04.
    my $r = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO';
    is( $applies->( $r, '2026-05-04', '2026-05-04' ), 1, 'anchor week hit' );
    is( $applies->( $r, '2026-05-11', '2026-05-04' ), 0, 'odd off-week skipped' );
    is( $applies->( $r, '2026-05-18', '2026-05-04' ), 1, 'even week hit' );
};

subtest '_slot_applies_on monthly nth weekday' => sub {

    # 1st Monday of month: May 4 yes, May 11 no, June 1 yes (also a Monday and the 1st).
    my $r = 'FREQ=MONTHLY;BYDAY=1MO';
    is( $applies->( $r, '2026-05-04', '2026-05-01' ), 1, '1st Mon May' );
    is( $applies->( $r, '2026-05-11', '2026-05-01' ), 0, '2nd Mon May skipped' );
    is( $applies->( $r, '2026-06-01', '2026-05-01' ), 1, '1st Mon June' );

    # Last Friday of May 2026 is May 29.
    my $r2 = 'FREQ=MONTHLY;BYDAY=-1FR';
    is( $applies->( $r2, '2026-05-29', '2026-05-01' ), 1, 'last Fri May' );
    is( $applies->( $r2, '2026-05-22', '2026-05-01' ), 0, 'second-to-last Fri May skipped' );
};

done_testing();
