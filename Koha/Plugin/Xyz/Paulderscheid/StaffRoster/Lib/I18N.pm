package Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::I18N;

=head1 NAME

Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::I18N - shared translation
helper for the StaffRoster plugin.

=head1 SYNOPSIS

  use Koha::Plugin::Xyz::Paulderscheid::StaffRoster::Lib::I18N qw( tr translator );

  my $tr = translator();          # returns a code ref bound to current locale
  $template->param( tr => $tr );

  # Templates: [% tr('Save configuration') | html %]
  # Perl:      tr('Save configuration')

=head1 DESCRIPTION

Loads a flat JSON dictionary per locale from
C<<plugin>/locales/<lang>.json>. Missing keys fall back to the English
source string so an incomplete translation degrades to English instead
of breaking the page. The active locale is read from Koha's interface
language preference at first call and cached for the request.

=cut

use Modern::Perl;

use Exporter qw( import );
our @EXPORT_OK = qw( tr translator load );

use File::Spec;
use Mojo::JSON qw( decode_json );

# Cache: { lang => hashref-of-key-to-translation } so we hit the disk once
# per language per worker. The dictionary is small (a few KB) so keeping
# every loaded locale in memory is fine.
my %CACHE;

sub _locales_dir {
    my $here = __FILE__;
    $here =~ s{Lib/I18N\.pm$}{locales};
    return $here;
}

sub load {
    my ($lang) = @_;
    return $CACHE{$lang} if exists $CACHE{$lang};

    my $path = File::Spec->catfile( _locales_dir(), "$lang.json" );
    my $dict = {};
    if ( -r $path ) {
        my $bytes = do {
            open my $fh, '<:raw', $path or return $CACHE{$lang} = $dict;
            local $/;
            <$fh>;
        };
        $dict = eval { decode_json($bytes) } || {};
    }
    return $CACHE{$lang} = $dict;
}

sub _current_lang {
    require C4::Languages;
    my $lang = C4::Languages::getlanguage() // 'en';

    # Koha returns codes like 'de-DE'; we key by the two-letter prefix so
    # 'de-DE' and 'de-AT' share the same de.json.
    $lang =~ s/[-_].*$//;
    return $lang || 'en';
}

sub translator {
    my ($lang) = @_;
    $lang //= _current_lang();
    return sub { $_[0] }
        if $lang eq 'en';
    my $dict = load($lang);
    return sub {
        my ($key) = @_;
        return $key if !defined $key;
        return $dict->{$key} // $key;
    };
}

sub tr {
    my ($key) = @_;
    # Resolve the translator on every call so the active language is
    # picked up per request. A cached `state $current = translator()`
    # would bind the locale to whichever request first warmed the
    # Plack worker — every subsequent request on that worker would
    # render the wrong language even after the user changed it.
    return translator()->($key);
}

1;
