[%# Post-Redirect-Get guard. Replace the cud-* URL with the GET landing
    URL on success so a browser refresh doesn't re-POST the form.
    Args:
      prg_method     - 'tool' | 'admin' | 'configure' (required)
      prg_op         - landing op for tool/admin (omit for configure)
      prg_roster_id  - optional, included only when set (tool roster scope)
%]
[% IF post_redirect_op || prg_op %]
<script>
    if (window.history && window.history.replaceState) {
        var url = '/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=[% prg_method | uri %]';
        [% IF prg_method != 'configure' %]
        url += '&op=[% (prg_op || post_redirect_op) | uri %]';
        [% END %]
        [% IF prg_roster_id || post_redirect_roster_id %]
        url += '&roster_id=[% (prg_roster_id || post_redirect_roster_id) | uri %]';
        [% END %]
        window.history.replaceState({}, '', url);
    }
</script>
[% END %]
