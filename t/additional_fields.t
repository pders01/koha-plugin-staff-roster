#!/usr/bin/perl

# User-story tests for the additional-fields plumbing.
# Hits a real Koha database (kohadev) inside the container and rolls back at
# the end so the box stays clean. Run with:
#
#   cat t/additional_fields.t | docker exec -i dev-koha-1 perl -

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';

eval { require C4::Context; 1 } or plan skip_all => "C4::Context not available";
eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster; 1 }
    or plan skip_all => "plugin module did not load";

my $dbh = C4::Context->dbh;
$dbh->{AutoCommit} = 0;
$dbh->{RaiseError} = 1;
END { eval { $dbh->rollback } if $dbh; }

my $NS         = 'Koha::Plugin::Xyz::Paulderscheid::StaffRoster::';
no strict 'refs';
my $load     = \&{ "${NS}_load_additional_fields" };
my $save_cgi = \&{ "${NS}_save_additional_fields" };
my $save_map = \&{ "${NS}_save_additional_fields_from_map" };
my $del      = \&{ "${NS}_delete_additional_fields" };
my $bulk     = \&{ "${NS}_bulk_additional_field_values" };
use strict 'refs';

# A minimal CGI stand-in with the only method the helper uses.
package StubCGI;
sub new { bless { p => $_[1] || {} }, $_[0] }
sub multi_param {
    my ( $self, $k ) = @_;
    my $v = $self->{p}{$k};
    return ref $v ? @{$v} : ( defined $v ? ($v) : () );
}

package main;

# Pick a roster + assignment to attach AF rows to, or skip if the box is empty.
my ($rid) = $dbh->selectrow_array(q{SELECT id FROM staff_roster LIMIT 1});
my ($aid) = $dbh->selectrow_array(q{SELECT id FROM staff_roster_assignments LIMIT 1});
plan skip_all => 'no staff_roster rows in database; create one first' if !$rid;

# Field IDs in a test-only range, well clear of real data.
my $ROSTER_F1     = 90001;
my $ROSTER_F2     = 90002;
my $ASSIGNMENT_F1 = 90011;

$dbh->do(
    q{INSERT INTO additional_fields (id, tablename, name, repeatable) VALUES (?, ?, ?, ?)},
    undef, $ROSTER_F1, 'staff_roster', 'Cost code', 0
);
$dbh->do(
    q{INSERT INTO additional_fields (id, tablename, name, repeatable) VALUES (?, ?, ?, ?)},
    undef, $ROSTER_F2, 'staff_roster', 'Project tags', 1
);
$dbh->do(
    q{INSERT INTO additional_fields (id, tablename, name, repeatable) VALUES (?, ?, ?, ?)},
    undef, $ASSIGNMENT_F1, 'staff_roster_assignments', 'Skill', 1
);

subtest 'Story: admin opens a brand-new roster form before any values exist' => sub {
    # Wipe any prior values so we start from zero.
    $dbh->do(q{DELETE FROM additional_field_values WHERE record_table = ? AND record_id = ?},
        undef, 'staff_roster', $rid);

    my $af = $load->( $dbh, 'staff_roster', $rid );
    ok( $af->{available} && @{ $af->{available} },
        'available list contains the seeded field defs' );
    is_deeply( $af->{values}, {}, 'values map is empty when no rows are stored' );
};

subtest 'Story: admin saves a roster with a single-value field via the form' => sub {
    my $cgi = StubCGI->new( { 'additional_field_' . $ROSTER_F1 => 'BUD-42' } );
    $save_cgi->( $dbh, 'staff_roster', $rid, $cgi );

    my $af = $load->( $dbh, 'staff_roster', $rid );
    is_deeply( $af->{values}{$ROSTER_F1}, ['BUD-42'], 'single value persisted' );
};

subtest 'Story: admin saves a repeatable field with multiple values' => sub {
    my $cgi = StubCGI->new(
        {   'additional_field_' . $ROSTER_F1 => 'BUD-42',
            'additional_field_' . $ROSTER_F2 => [ 'urgent', 'q1', 'q2' ],
        }
    );
    $save_cgi->( $dbh, 'staff_roster', $rid, $cgi );

    my $af = $load->( $dbh, 'staff_roster', $rid );
    is_deeply( [ sort @{ $af->{values}{$ROSTER_F2} } ], [ 'q1', 'q2', 'urgent' ],
        'all repeatable values stored' );
    is_deeply( $af->{values}{$ROSTER_F1}, ['BUD-42'],
        'sibling single-value field still intact after the same save' );
};

subtest 'Story: clearing a value removes the row, save is a full replace' => sub {
    my $cgi = StubCGI->new( { 'additional_field_' . $ROSTER_F1 => q{} } );
    $save_cgi->( $dbh, 'staff_roster', $rid, $cgi );

    my $af = $load->( $dbh, 'staff_roster', $rid );
    is( scalar @{ $af->{values}{$ROSTER_F1} || [] }, 0,
        'empty submission wipes the field' );
    is( scalar @{ $af->{values}{$ROSTER_F2} || [] }, 0,
        'fields not in the submission are also wiped (full replace, not merge)' );
};

subtest 'Story: list view bulk-loads field values across multiple rosters' => sub {
    # Prime two rosters with values (use the same roster id twice if there is
    # only one) so the bulk lookup has data to return.
    $dbh->do(q{DELETE FROM additional_field_values WHERE record_table = ?}, undef, 'staff_roster');
    $save_cgi->( $dbh, 'staff_roster', $rid, StubCGI->new( {
        'additional_field_' . $ROSTER_F1 => 'BUD-42',
        'additional_field_' . $ROSTER_F2 => [ 'a', 'b' ],
    } ) );

    my $by_record = $bulk->( $dbh, 'staff_roster', [$rid] );
    is( $by_record->{$rid}{$ROSTER_F1}[0], 'BUD-42',  'bulk: single value present' );
    is_deeply( [ sort @{ $by_record->{$rid}{$ROSTER_F2} } ], [ 'a', 'b' ],
        'bulk: repeatable values present' );
};

subtest 'Story: assignment edit modal posts JSON, helper persists from map' => sub {
SKIP: {
        skip 'no staff_roster_assignments rows in database', 3 if !$aid;

        $dbh->do(
            q{DELETE FROM additional_field_values WHERE record_table = ? AND record_id = ?},
            undef, 'staff_roster_assignments', $aid
        );

        $save_map->(
            $dbh,
            'staff_roster_assignments',
            $aid,
            { $ASSIGNMENT_F1 => [ 'CIRC', 'REF' ] }
        );

        my $af = $load->( $dbh, 'staff_roster_assignments', $aid );
        is_deeply( [ sort @{ $af->{values}{$ASSIGNMENT_F1} } ], [ 'CIRC', 'REF' ],
            'JSON map persisted both values' );

        # Map with empty array clears.
        $save_map->( $dbh, 'staff_roster_assignments', $aid, { $ASSIGNMENT_F1 => [] } );
        $af = $load->( $dbh, 'staff_roster_assignments', $aid );
        is( scalar @{ $af->{values}{$ASSIGNMENT_F1} || [] }, 0,
            'empty array clears the field' );

        # Map referencing an unregistered field id is silently ignored.
        $save_map->( $dbh, 'staff_roster_assignments', $aid, { 999999 => ['boom'] } );
        my ($rogue) = $dbh->selectrow_array(
            q{SELECT COUNT(*) FROM additional_field_values
              WHERE record_table = ? AND record_id = ? AND field_id = 999999},
            undef, 'staff_roster_assignments', $aid
        );
        is( $rogue, 0, 'unregistered field ids are dropped' );
    }
};

subtest 'Story: deleting a record clears its additional field values' => sub {
    $save_cgi->( $dbh, 'staff_roster', $rid,
        StubCGI->new( { 'additional_field_' . $ROSTER_F1 => 'BUD-99' } ) );
    $del->( $dbh, 'staff_roster', $rid );

    my ($remaining) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM additional_field_values
          WHERE record_table = ? AND record_id = ?},
        undef, 'staff_roster', $rid
    );
    is( $remaining, 0, 'all rows cleared on record delete' );
};

subtest 'Story: tables with no field defs are a no-op' => sub {
    my $unused_table = 'staff_roster_swap_requests';
    my $af = $load->( $dbh, $unused_table, 1 );
    is_deeply( $af->{available}, [], 'no available fields when none defined' );

    # Save against the empty table should not insert anything.
    $save_cgi->( $dbh, $unused_table, 1,
        StubCGI->new( { 'additional_field_' . $ROSTER_F1 => 'should-not-stick' } ) );
    my ($leak) = $dbh->selectrow_array(
        q{SELECT COUNT(*) FROM additional_field_values WHERE record_table = ?},
        undef, $unused_table
    );
    is( $leak, 0, 'helper is a no-op when the table has no field defs' );
};

done_testing();
