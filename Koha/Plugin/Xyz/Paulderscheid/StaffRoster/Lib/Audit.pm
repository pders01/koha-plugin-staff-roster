package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Audit -
Audit log + transaction helpers shared by every mutation path.

=head1 DESCRIPTION

Every mutation in the plugin flows through `audit()` so admins can
reconstruct who changed what from `tools/viewlog.pl`. `txn()` wraps
related `$dbh->do` calls so a partial failure rolls back instead of
leaving the row half-mutated.

These were `_audit` / `_txn` private subs on the main plugin module.
Move them out so the REST controllers stop reaching for private subs
on the parent module by full name.

=cut

use Modern::Perl;

use Exporter qw(import);

our @EXPORT_OK = qw( audit txn );

=head2 audit($action, $object_id, $infos, $original)

Record a mutation in `action_logs` under module `STAFFROSTER`.

C<$action> is the verb (CREATE / MODIFY / DELETE).
C<$object_id> identifies the row (undef is allowed for bulk events).
C<$infos> is a hashref of context (entity, actor, payload).
C<$original> (optional) is the pre-mutation row, used by C4::Log to
build the structured JSON diff (Bug 25159).

Loaded lazily so the plugin still works on older Koha installs that
predate the diff-aware logaction signature.

=cut

sub audit {
    my ( $action, $object_id, $infos, $original ) = @_;
    return if !defined $action;
    eval {
        require C4::Log;
        $infos //= {};
        C4::Log::logaction( 'STAFFROSTER', $action, $object_id, $infos, undef, $original );
        1;
    };
    return;
}

=head2 txn($dbh, $code)

Run C<$code> inside a transaction. Plack's `$dbh` defaults to
AutoCommit=1, so any handler that does several related C<< $dbh->do >>
calls risks a torn write — one row committed, the next throws. Wrap
the related work in this and the helper rolls everything back on
error. Returns whatever C<$code> returns. Re-throws on failure.

=cut

sub txn {
    my ( $dbh, $code ) = @_;
    my $autocommit_was = $dbh->{AutoCommit};
    $dbh->begin_work if $autocommit_was;
    my @result;
    my $rv = eval {
        @result = wantarray ? $code->() : ( scalar $code->() );
        $dbh->commit if $autocommit_was;
        1;
    };
    if ( !$rv ) {
        my $err = $@ || 'unknown';
        eval { $dbh->rollback } if $autocommit_was;
        die $err;
    }
    return wantarray ? @result : $result[0];
}

1;
