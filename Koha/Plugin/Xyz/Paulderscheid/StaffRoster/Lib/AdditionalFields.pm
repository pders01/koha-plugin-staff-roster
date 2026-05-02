package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::AdditionalFields -
Read / write helpers for Koha's C<additional_fields> +
C<additional_field_values> tables.

=head1 DESCRIPTION

The plugin uses raw DBI rather than C<Koha::Object>, so the
C<Koha::Object::Mixin::AdditionalFields> mixin is not in play; this
module does the equivalent reads and writes by hand.

Admins manage field definitions via the standard
C<admin/additional-fields.pl> page (deep-linked with C<tablename=...>).

=cut

use Modern::Perl;

use Exporter qw(import);

our @EXPORT_OK = qw(
    load save save_from_map remove
    bulk_values
);

=head2 load($dbh, $tablename, $record_id)

Returns C<< { available => [field_hash, ...], values => { field_id => [val, ...] } } >>.
The C<available> hashes carry the same keys
(C<id>, C<name>, C<authorised_value_category>, C<repeatable>,
C<marcfield>, C<marcfield_mode>, plus C<effective_authorised_value_category>)
that Koha's C<additional-fields-entry.inc> include reads.

=cut

sub load {
    my ( $dbh, $tablename, $record_id ) = @_;
    my $available = $dbh->selectall_arrayref(
        q{SELECT id, name, authorised_value_category, marcfield, marcfield_mode, searchable, repeatable
          FROM additional_fields WHERE tablename = ? ORDER BY id},
        { Slice => {} }, $tablename
    ) || [];

    for my $f ( @{$available} ) {
        my $cat = $f->{authorised_value_category};
        $f->{effective_authorised_value_category} = $cat;
    }

    my %values;
    if ($record_id) {
        my $rows = $dbh->selectall_arrayref(
            q{SELECT field_id, value FROM additional_field_values
              WHERE record_table = ? AND record_id = ?},
            { Slice => {} }, $tablename, $record_id
        ) || [];
        for my $r ( @{$rows} ) {
            push @{ $values{ $r->{field_id} } }, $r->{value};
        }
    }
    return { available => $available, values => \%values };
}

=head2 save($dbh, $tablename, $record_id, $cgi)

Replaces every C<additional_field_value> row for
C<($tablename, $record_id)> with the values posted as
C<additional_field_E<lt>idE<gt>>. Mirrors
C<set_additional_fields> in C<Koha::Object::Mixin::AdditionalFields>.
No-op when there are no fields defined for C<$tablename>.

=cut

sub save {
    my ( $dbh, $tablename, $record_id, $cgi ) = @_;
    return if !$record_id;
    my $fields = _defs( $dbh, $tablename );
    return if !@{$fields};
    my %values_by_id = map { $_->{id} => [ $cgi->multi_param( 'additional_field_' . $_->{id} ) ] } @{$fields};
    return _store( $dbh, $tablename, $record_id, \%values_by_id );
}

=head2 save_from_map($dbh, $tablename, $record_id, $map)

Same as C<save> but accepts a pre-built map
C<< { field_id => [values, ...] } >>. Used by JSON API endpoints.
Filters out field ids the schema doesn't know about.

=cut

sub save_from_map {
    my ( $dbh, $tablename, $record_id, $map ) = @_;
    return if !$record_id || !$map;
    my $fields = _defs( $dbh, $tablename );
    return if !@{$fields};
    my %allowed = map { $_->{id} => 1 } @{$fields};
    my %values_by_id;
    for my $fid ( keys %{$map} ) {
        next if !$allowed{$fid};
        my $v = $map->{$fid};
        $values_by_id{$fid} = ref $v eq 'ARRAY' ? $v : [$v];
    }
    return _store( $dbh, $tablename, $record_id, \%values_by_id );
}

=head2 remove($dbh, $tablename, $record_id)

Drop every C<additional_field_value> row attached to
C<($tablename, $record_id)>. Called from the cascade-delete paths.

=cut

sub remove {
    my ( $dbh, $tablename, $record_id ) = @_;
    return if !$record_id;
    $dbh->do( q{DELETE FROM additional_field_values WHERE record_table = ? AND record_id = ?},
        undef, $tablename, $record_id );
    return;
}

=head2 bulk_values($dbh, $tablename, $record_ids)

Returns C<< { record_id => { field_id => [values, ...] } } >> for a
list view that wants to render every record's additional-field
summary at once. Static SQL fanned out per record id (no IN-list
interpolation).

=cut

sub bulk_values {
    my ( $dbh, $tablename, $record_ids ) = @_;
    return {} if !$record_ids || !@{$record_ids};
    my $sth = $dbh->prepare(
        q{SELECT field_id, value FROM additional_field_values
          WHERE record_table = ? AND record_id = ?}
    );
    my %out;
    for my $rid ( @{$record_ids} ) {
        $sth->execute( $tablename, $rid );
        while ( my $row = $sth->fetchrow_hashref ) {
            push @{ $out{$rid}{ $row->{field_id} } }, $row->{value};
        }
    }
    return \%out;
}

# ---------------------------------------------------------------------------

sub _defs {
    my ( $dbh, $tablename ) = @_;
    return $dbh->selectall_arrayref( q{SELECT id, repeatable FROM additional_fields WHERE tablename = ?},
        { Slice => {} }, $tablename )
        || [];
}

# Wrap delete + reinsert in a single transaction so a failed insert leaves
# the prior values untouched. The default Plack handler runs with
# AutoCommit=1, so the bare delete-then-loop would otherwise commit a
# partial state if any insert blew up.
sub _store {
    my ( $dbh, $tablename, $record_id, $values_by_id ) = @_;

    my $autocommit_was = $dbh->{AutoCommit};
    $dbh->begin_work if $autocommit_was;
    eval {
        $dbh->do( q{DELETE FROM additional_field_values WHERE record_table = ? AND record_id = ?},
            undef, $tablename, $record_id );
        for my $fid ( keys %{$values_by_id} ) {
            for my $v ( @{ $values_by_id->{$fid} } ) {
                next if !defined $v || $v eq q{};
                $dbh->do(
                    q{INSERT INTO additional_field_values (field_id, record_table, record_id, value)
                      VALUES (?, ?, ?, ?)},
                    undef, $fid, $tablename, $record_id, $v
                );
            }
        }
        $dbh->commit if $autocommit_was;
        1;
    } or do {
        my $err = $@ || 'unknown error';
        $dbh->rollback if $autocommit_was;
        die $err;
    };
    return;
}

1;
