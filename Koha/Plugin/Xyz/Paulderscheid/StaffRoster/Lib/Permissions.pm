package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::Permissions -
Sub-permission registry + the gate helpers every handler runs through.

=head1 DESCRIPTION

The plugin ships nine sub-permissions under the C<plugins> flag (codes
in C<%SUBPERMISSIONS> below). Install/upgrade hooks call C<register()>
to upsert them into the C<permissions> table; uninstall calls
C<unregister()>. Every CGI mutation handler and REST controller calls
C<has_perm($code)> or C<gate($code, $messages)> before touching the DB;
superlibrarians bypass via the standard C<flags == 1> check.

=cut

use Modern::Perl;

use Exporter qw(import);

use C4::Auth;
use C4::Context;

our @EXPORT_OK = qw( has_perm gate is_superlib SUBPERMISSIONS register unregister );

=head2 SUBPERMISSIONS

Read-only hash of sub-permission code → human description. Single
source of truth — used by C<register()> at install time and by the
docs/wiki Permissions page through the same key set.

=cut

my %SUBPERMISSIONS = (
    staffroster_view           => 'Staff Roster: view rosters and own schedule',
    staffroster_assign         => 'Staff Roster: drag staff onto slots and edit assignments',
    staffroster_manage_rosters => 'Staff Roster: create or edit rosters, slots, exceptions',
    staffroster_manage_types   => 'Staff Roster: manage roster types catalogue',
    staffroster_swap_request   => 'Staff Roster: request a shift swap',
    staffroster_swap_respond   => 'Staff Roster: accept or reject a swap directed at you',
    staffroster_swap_approve   => 'Staff Roster: approve swaps as a manager',
    staffroster_self_assign    => 'Staff Roster: self-claim open shifts and drop own shifts',
    staffroster_configure      => 'Staff Roster: change plugin configuration',
);

sub SUBPERMISSIONS { return %SUBPERMISSIONS; }

=head2 register($dbh)

Upsert each sub-permission row in the C<permissions> table. Re-run on
every install + upgrade so descriptions can evolve without losing
existing C<user_permissions> grants (REPLACE would cascade-delete).

=cut

sub register {
    my ($dbh) = @_;
    for my $code ( sort keys %SUBPERMISSIONS ) {
        $dbh->do(
            q{INSERT INTO permissions (module_bit, code, description)
              VALUES (19, ?, ?)
              ON DUPLICATE KEY UPDATE description = VALUES(description)},
            undef, $code, $SUBPERMISSIONS{$code}
        );
    }
    return;
}

=head2 unregister($dbh)

Drop every sub-permission row plus any user grants. Called from the
plugin's uninstall hook.

=cut

sub unregister {
    my ($dbh) = @_;
    my @codes = keys %SUBPERMISSIONS;
    return if !@codes;
    my $perm_sth = $dbh->prepare(q{DELETE FROM permissions      WHERE module_bit = 19 AND code = ?});
    my $user_sth = $dbh->prepare(q{DELETE FROM user_permissions WHERE module_bit = 19 AND code = ?});
    for my $code (@codes) {
        $perm_sth->execute($code);
        $user_sth->execute($code);
    }
    return;
}

=head2 is_superlib()

Returns 1 when the current Koha session belongs to a superlibrarian.
Superlib bypasses every plugin sub-permission check.

=cut

sub is_superlib {
    my $env   = C4::Context->userenv or return 0;
    my $flags = $env->{flags} // 0;
    return ( $flags == 1 ) || ( $flags & 1 );
}

=head2 has_perm($code)

Returns 1/0 for whether the current session holds C<$code>. Super-
librarians always pass.

=cut

sub has_perm {
    my ($code) = @_;
    my $env = C4::Context->userenv;
    return 0 if !$env;
    my $flags = $env->{flags} // 0;
    return 1 if $flags == 1 || ( $flags & 1 );
    return C4::Auth::haspermission( $env->{id}, { plugins => $code } ) ? 1 : 0;
}

=head2 gate($code, $messages)

Convenience wrapper for CGI handlers that accumulate messages. Returns
1 when the user has C<$code>, otherwise pushes an C<access_denied>
message into the C<\@messages> arrayref and returns 0 so the caller
can C<< return if !gate(...) >>.

=cut

sub gate {
    my ( $code, $messages ) = @_;
    return 1 if has_perm($code);
    push @{$messages}, { type => 'danger', code => 'access_denied' };
    return 0;
}

1;
