[%# Unified plugin sidebar shared by every entry point (tool / admin /
    configure / report).
    Args:
      aside_active - 'admin' | 'configure' | 'report' (drives which
                     Administration entry gets the active class).
                     Optional; defaults to none-active.
    The `aside` template var supplies the dynamic data:
      aside.rosters          arrayref of { id, name, location } visible
                             to the current user
      aside.active_roster_id current roster_id (per-roster sub-nav anchor)
      aside.current_op       current op string (highlights the matching nav)
%]
[% SET _op  = aside.current_op || op || '' %]
[% SET _rid = aside.active_roster_id %]
[% SET _per_roster_ops = {
    view_assignments   => 1,
    manage_slots       => 1,
    manage_exceptions  => 1,
    manage_swaps       => 1,
    edit_roster        => 1,
    delete_confirm     => 1,
} %]
<aside>
    <details class="staff-roster-menu sidebar_menu" open>
        <summary><h5>[% tr('Staff Roster') | html %]</h5></summary>

        <details class="staff-roster-menu-rosters" [% IF aside.rosters.size %]open[% END %]>
            <summary>
                <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool"
                   [% IF _op == 'list' %]class="current"[% END %]>
                    [% tr('Rosters') | html %]
                    [% IF aside.rosters.size %]<span class="badge">[% aside.rosters.size | html %]</span>[% END %]
                </a>
            </summary>
            [% IF aside.rosters.size %]
                <ul class="staff-roster-menu-roster-list">
                    [% FOREACH r IN aside.rosters %]
                        <li[% IF r.id == _rid %] class="active"[% END %]>
                            <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=view_assignments&roster_id=[% r.id | uri %]">
                                <strong>[% r.name | html %]</strong>
                                [% IF r.location %]<small class="text-muted d-block">[% r.location | html %]</small>[% END %]
                            </a>
                        </li>
                    [% END %]
                </ul>
            [% ELSE %]
                <p class="staff-roster-menu-empty text-muted">
                    [% tr('No rosters yet.') | html %]
                </p>
            [% END %]
        </details>

        <ul>
            <li[% IF _op == 'add_roster' %] class="active"[% END %]>
                <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=add_roster">
                    <i class="fa fa-plus" aria-hidden="true"></i> [% tr('New roster') | html %]
                </a>
            </li>
            <li[% IF _op == 'my_shifts' %] class="active"[% END %]>
                <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=my_shifts">
                    <i class="fa fa-user-clock" aria-hidden="true"></i> [% tr('My shifts') | html %]
                </a>
            </li>
            <li[% IF _op == 'open_shifts' %] class="active"[% END %]>
                <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=open_shifts">
                    <i class="fa fa-clock" aria-hidden="true"></i> [% tr('Open shifts') | html %]
                </a>
            </li>
        </ul>

        [% IF _rid && _per_roster_ops.${_op} %]
            <h5>[% tr('This roster') | html %]</h5>
            <ul>
                <li[% IF _op == 'view_assignments' %] class="active"[% END %]>
                    <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=view_assignments&roster_id=[% _rid | uri %]">[% tr('Schedule') | html %]</a>
                </li>
                <li[% IF _op == 'manage_slots' %] class="active"[% END %]>
                    <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=manage_slots&roster_id=[% _rid | uri %]">[% tr('Slots') | html %]</a>
                </li>
                <li[% IF _op == 'manage_exceptions' %] class="active"[% END %]>
                    <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=manage_exceptions&roster_id=[% _rid | uri %]">[% tr('Exceptions') | html %]</a>
                </li>
                <li[% IF _op == 'manage_swaps' %] class="active"[% END %]>
                    <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=manage_swaps&roster_id=[% _rid | uri %]">[% tr('Swap requests') | html %]</a>
                </li>
                <li[% IF _op == 'edit_roster' %] class="active"[% END %]>
                    <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=tool&op=edit_roster&roster_id=[% _rid | uri %]">[% tr('Settings') | html %]</a>
                </li>
            </ul>
        [% END %]

        <h5>[% tr('Administration') | html %]</h5>
        <ul>
            <li[% IF aside_active == 'admin' || _op == 'admin' %] class="active"[% END %]>
                <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=admin">[% tr('Roster types') | html %]</a>
            </li>
            <li[% IF aside_active == 'configure' || _op == 'configure' %] class="active"[% END %]>
                <a href="/cgi-bin/koha/plugins/run.pl?class=[% CLASS | uri %]&method=configure">[% tr('Configuration') | html %]</a>
            </li>
        </ul>
    </details>
</aside>
