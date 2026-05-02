#!/usr/bin/perl

# Coverage for _user_group_ids — the recursive walk that powers the
# library-group visibility scope on roster lists. We mock
# Koha::Library::Groups so the test stays self-contained and doesn't have
# to fight DBIC vs raw-DBI transaction isolation against an empty
# library_groups table.
#
#   cat t/visibility.t | docker exec -i dev-koha-1 perl -

use Modern::Perl;
use Test::More;
use FindBin qw( $RealBin );

for my $cand ( "$RealBin/..", '/var/lib/koha/kohadev/plugins' ) {
    unshift @INC, $cand if -f "$cand/Koha/Plugin/Xyz/Paulderscheid/StaffRoster.pm";
}
unshift @INC, '/kohadevbox/koha/';
unshift @INC, '/kohadevbox/koha/t/lib/';

eval { require Koha::Plugin::Xyz::Paulderscheid::StaffRoster; 1 }
    or plan skip_all => 'plugin module did not load';

my $ugi = \&Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_user_group_ids;

# Stub Koha::Library::Groups so search() returns leaves bound to a
# branchcode and find() climbs the parent chain by id.
{

    package Koha::Library::Groups;
    no warnings 'redefine';

    our %BY_ID     = ();    # id => { id, parent_id, branchcode }
    our %LEAVES_OF = ();    # branchcode => [ leaf_id, ... ]

    sub _reset { %BY_ID = (); %LEAVES_OF = (); }

    sub _add {
        my (%row) = @_;
        $BY_ID{ $row{id} } = \%row;
        push @{ $LEAVES_OF{ $row{branchcode} } }, $row{id} if defined $row{branchcode};
    }

    sub search {
        my ( $class, $where ) = @_;
        my @ids = @{ $LEAVES_OF{ $where->{branchcode} // q{} } || [] };
        return Koha::Library::Groups::ResultSet->new( [ map { Koha::Library::Groups::Row->new( $BY_ID{$_} ) } @ids ] );
    }

    sub find {
        my ( $class, $id ) = @_;
        return undef if !$BY_ID{$id};
        return Koha::Library::Groups::Row->new( $BY_ID{$id} );
    }
}

{

    package Koha::Library::Groups::ResultSet;
    sub new { my ( $c, $rows ) = @_; bless { rows => $rows, idx => 0 }, $c }
    sub next { my ($s) = @_; return $s->{rows}[ $s->{idx}++ ]; }
}

{

    package Koha::Library::Groups::Row;
    sub new       { my ( $c, $r ) = @_; bless { %{$r} }, $c }
    sub parent_id { $_[0]->{parent_id} }
}

sub graph {
    Koha::Library::Groups::_reset();
    Koha::Library::Groups::_add(%$_) for @_;
    # Same branchcode appears in successive subtests with different
    # graphs; clear the per-process memoization in StaffRoster.pm so
    # the second subtest doesn't read the first subtest's answer.
    Koha::Plugin::Xyz::Paulderscheid::StaffRoster::_clear_user_group_cache();
}

subtest 'walks up parent chain, returns every ancestor id' => sub {
    graph(
        { id => 10, parent_id => undef, branchcode => undef },    # grandparent
        { id => 20, parent_id => 10,    branchcode => undef },    # parent
        { id => 30, parent_id => 20,    branchcode => 'CPL' },    # leaf
    );
    my %got = map { $_ => 1 } $ugi->('CPL');
    is_deeply( \%got, { 10 => 1, 20 => 1 }, 'parent + grandparent ids returned, leaf excluded' );
};

subtest 'empty / undef branch short-circuits' => sub {
    graph();
    is_deeply( [ $ugi->(undef) ], [], 'undef branch -> empty' );
    is_deeply( [ $ugi->(q{}) ],   [], 'empty branch -> empty' );
};

subtest 'branch not in any group returns empty' => sub {
    graph( { id => 10, parent_id => undef, branchcode => undef }, { id => 30, parent_id => 10, branchcode => 'CPL' }, );
    is_deeply( [ $ugi->('UNKNOWN') ], [], 'walk yields nothing when no leaf row matches the branch' );
};

subtest 'sibling leaves do not pollute one branch\'s ancestors' => sub {
    graph(
        { id => 10, parent_id => undef, branchcode => undef },
        { id => 20, parent_id => 10,    branchcode => undef },
        { id => 30, parent_id => 20,    branchcode => 'CPL' },
        { id => 40, parent_id => 20,    branchcode => 'FFL' },    # sibling leaf
    );
    my %got = map { $_ => 1 } $ugi->('CPL');
    is_deeply( \%got, { 10 => 1, 20 => 1 }, 'walk anchored to leaf 30 ignores sibling leaf 40' );
};

subtest 'two leaves for the same branch (multi-group membership)' => sub {
    graph(
        { id => 10, parent_id => undef, branchcode => undef },    # group A root
        { id => 20, parent_id => 10,    branchcode => 'CPL' },    # leaf in A
        { id => 50, parent_id => undef, branchcode => undef },    # group B root
        { id => 60, parent_id => 50,    branchcode => 'CPL' },    # leaf in B
    );
    my %got = map { $_ => 1 } $ugi->('CPL');
    is_deeply( \%got, { 10 => 1, 50 => 1 }, 'both group roots returned when branch sits under multiple groups' );
};

done_testing();
