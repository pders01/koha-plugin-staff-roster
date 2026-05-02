#!/usr/bin/perl

# This file is part of Koha.
#
# Koha is free software; you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# Koha is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with Koha; if not, see <http://www.gnu.org/licenses>.

use Modern::Perl;

use Test::More;
use File::Spec;
use File::Find;

=head1 DESCRIPTION

=cut

my $lib = '/var/lib/koha/kohadev/plugins';

unshift( @INC, $lib );
unshift( @INC, '/kohadevbox/koha/' );
unshift( @INC, '/kohadevbox/koha/misc/translator/' );
unshift( @INC, '/kohadevbox/koha/t/lib/' );

# Only walk the plugin's Koha/ tree. Anything else under $lib (e.g.
# t/lib/StaffRosterFixture.pm sitting next to the source after the
# `docker cp t` sync) is test-only scaffolding and shouldn't go
# through use_ok against the plugin's namespace.
find(
    {   bydepth  => 1,
        no_chdir => 1,
        wanted   => sub {
            my $m = $_;
            return unless $m =~ s/[.]pm$//;
            $m               =~ s{^.*/Koha/}{Koha/};
            $m               =~ s{/}{::}g;
            use_ok($m) || BAIL_OUT("***** PROBLEMS LOADING FILE '$m'");
        },
    },
    "$lib/Koha"
);

done_testing();

