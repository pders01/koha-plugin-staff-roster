package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::StaffController;

use Modern::Perl;

use Mojo::Base 'Mojolicious::Controller';

use C4::Context;
use Try::Tiny qw( catch try );

=head1 API

=head2 Methods

=head3 available

Query: { date: YYYY-MM-DD, slot_id?, branch?, q? }.
Returns staff members not yet assigned to overlapping slots that day.
Filtered to category_type='S' (staff) by default — adjust if needed.

=cut

sub available {
    my $c = shift->openapi->valid_input or return;

    return try {
        my $date    = $c->req->param('date');
        my $slot_id = $c->req->param('slot_id');
        my $branch  = $c->req->param('branch');
        my $q       = $c->req->param('q');

        if ( !$date ) {
            return $c->render( status => 400, openapi => { error => 'date is required' } );
        }

        my $dbh = C4::Context->dbh;

        my $sql = q{
            SELECT p.borrowernumber, p.firstname, p.surname, p.cardnumber, p.branchcode
            FROM borrowers p
            JOIN categories c ON p.categorycode = c.categorycode
            WHERE c.category_type = 'S'
        };
        my @params;

        if ($branch) {
            $sql .= q{ AND p.branchcode = ?};
            push @params, $branch;
        }

        if ($q) {
            $sql .= q{ AND (p.firstname LIKE ? OR p.surname LIKE ? OR p.cardnumber LIKE ?)};
            my $like = "%$q%";
            push @params, $like, $like, $like;
        }

        if ($slot_id) {
            $sql .= q{
                AND p.borrowernumber NOT IN (
                    SELECT a.borrowernumber
                    FROM staff_roster_assignments a
                    JOIN staff_roster_slots s1 ON a.slot_id = s1.id
                    JOIN staff_roster_slots s2 ON s2.id = ?
                    WHERE a.assignment_date = ?
                      AND s1.start_time < s2.end_time
                      AND s2.start_time < s1.end_time
                )
            };
            push @params, $slot_id, $date;
        }
        else {
            $sql .= q{
                AND p.borrowernumber NOT IN (
                    SELECT borrowernumber FROM staff_roster_assignments WHERE assignment_date = ?
                )
            };
            push @params, $date;
        }

        $sql .= q{ ORDER BY p.surname, p.firstname LIMIT 200};

        my $rows = $dbh->selectall_arrayref( $sql, { Slice => {} }, @params );

        return $c->render( status => 200, openapi => $rows );
    }
    catch {
        $c->unhandled_exception($_);
    };
}

1;
