[%# Plugin sidebar shared by admin / configure / report. tool.tt has its
    own variant with per-roster sub-nav and self-service entries — keep
    that one inline.
    Args:
      aside_active - 'admin' | 'configure' (drives which Administration
                     entry gets the active class). Optional; defaults to
                     none-active so report.tt renders both unselected.
%]
<aside>
    <div class="staff-roster-menu sidebar_menu">
        <h5>[% tr('Staff Roster') | html %]</h5>
        <ul>
            <li><a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool">[% tr('Rosters') | html %]</a></li>
            <li><a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=add_roster">[% tr('New roster') | html %]</a></li>
        </ul>
        <h5>[% tr('Administration') | html %]</h5>
        <ul>
            <li[% IF aside_active == 'admin' %] class="active"[% END %]><a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=admin">[% tr('Roster types') | html %]</a></li>
            <li[% IF aside_active == 'configure' %] class="active"[% END %]><a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=configure">[% tr('Configuration') | html %]</a></li>
        </ul>
    </div>
</aside>
