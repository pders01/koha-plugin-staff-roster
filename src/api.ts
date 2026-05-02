import { RequestHandler } from "@jpahd/lit-stack/http";
import type { ApiEndpoints } from "@jpahd/lit-stack/http";

const NS = "staffroster";
const BASE = `/api/v1/contrib/${NS}`;

const ENDPOINTS: ApiEndpoints = {
  get: {
    rosterWeek: { url: `${BASE}/rosters`, cache: false },
    availableStaff: { url: `${BASE}/staff/available`, cache: false },
    myWeek: { url: `${BASE}/me/week`, cache: false },
    myOpenSlots: { url: `${BASE}/me/open_slots`, cache: false },
  },
  post: {
    assignments: { url: `${BASE}/assignments`, cache: false },
    bulk: { url: `${BASE}/assignments/bulk`, cache: false },
    selfClaim: { url: `${BASE}/me/claim`, cache: false },
  },
  put: {
    assignments: { url: `${BASE}/assignments`, cache: false },
  },
  delete: {
    assignments: { url: `${BASE}/assignments`, cache: false },
    selfClaim: { url: `${BASE}/me/claim`, cache: false },
  },
};

export const api = new RequestHandler(BASE, ENDPOINTS);

export type Slot = {
  id: number;
  recurrence_rule: string;
  days_of_week: string[]; // iCal BYDAY codes (weekday only, ordinals stripped)
  applies_on_dates?: string[]; // YYYY-MM-DD list for the visible week; honors INTERVAL/UNTIL/MONTHLY
  start_time: string;
  end_time: string;
  min_staff: number;
  max_staff: number;
  location: string | null;
  notes: string | null;
};

export type Assignment = {
  id: number;
  slot_id: number;
  borrowernumber: number;
  assignment_date: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  assigned_by: number | null;
  updated_at: string;
  firstname: string;
  surname: string;
  cardnumber: string;
  additional_fields?: Record<string, string[]>;
};

export type AssignmentField = {
  id: number;
  name: string;
  authorised_value_category: string | null;
  repeatable: 0 | 1;
  av_options?: { value: string; lib: string }[];
};

export type Staff = {
  borrowernumber: number;
  firstname: string;
  surname: string;
  cardnumber: string;
  branchcode: string;
};

export type RosterWeek = {
  roster: {
    id: number;
    name: string;
    description: string | null;
    branch_id: string | null;
    type_name: string;
    type_code: string;
    type_color: string;
    branch_name: string | null;
  };
  slots: Slot[];
  assignments: Assignment[];
  assignment_fields?: AssignmentField[];
  exceptions: { id: number; exception_date: string; exception_type: string; reason: string | null }[];
  week_start: string;
};

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const err = new Error(body.error ?? `HTTP ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function fetchWeek(rosterId: number, weekStart: string): Promise<RosterWeek> {
  const res = await api.get({
    endpoint: "rosterWeek",
    path: [String(rosterId), "week"],
    query: { start: weekStart },
  });
  return asJson<RosterWeek>(res);
}

export async function createAssignment(body: {
  slot_id: number;
  borrowernumber: number;
  assignment_date: string;
  status?: string;
  notes?: string;
}): Promise<Assignment> {
  const res = await api.post({
    endpoint: "assignments",
    requestInit: { method: "post", body: JSON.stringify(body) },
  });
  return asJson<Assignment>(res);
}

export async function updateAssignment(
  id: number,
  body: Partial<{
    slot_id: number;
    borrowernumber: number;
    assignment_date: string;
    status: string;
    notes: string | null;
    additional_fields: Record<string, string[]>;
  }>,
): Promise<Assignment> {
  const res = await api.put({
    endpoint: "assignments",
    path: [String(id)],
    requestInit: { method: "put", body: JSON.stringify(body) },
  });
  return asJson<Assignment>(res);
}

export async function deleteAssignment(id: number): Promise<void> {
  const res = await api.delete({ endpoint: "assignments", path: [String(id)] });
  await asJson<void>(res);
}

export type MyShift = {
  assignment_id: number;
  roster_id: number;
  slot_id: number;
  assignment_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: Assignment["status"];
  notes: string | null;
  updated_at: string;
};

export type MyWeekRoster = {
  id: number;
  name: string;
  type_name: string;
  type_code: string;
  type_color: string;
  branch_name: string | null;
  group_name: string | null;
};

export type MyWeek = {
  week_start: string;
  rosters: MyWeekRoster[];
  shifts: MyShift[];
};

export async function fetchMyWeek(weekStart: string): Promise<MyWeek> {
  const res = await api.get({
    endpoint: "myWeek",
    query: { start: weekStart },
  });
  return asJson<MyWeek>(res);
}

export type Opening = {
  roster_id: number;
  roster_name: string;
  type_name: string;
  type_color: string;
  branch_name: string | null;
  slot_id: number;
  assignment_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  capacity_remaining: number;
};

export type OpenSlots = {
  week_start: string;
  openings: Opening[];
};

export async function fetchMyOpenSlots(weekStart: string): Promise<OpenSlots> {
  const res = await api.get({
    endpoint: "myOpenSlots",
    query: { start: weekStart },
  });
  return asJson<OpenSlots>(res);
}

export async function selfClaim(body: {
  slot_id: number;
  assignment_date: string;
}): Promise<Assignment> {
  const res = await api.post({
    endpoint: "selfClaim",
    requestInit: { method: "post", body: JSON.stringify(body) },
  });
  return asJson<Assignment>(res);
}

export async function selfUnclaim(assignmentId: number): Promise<void> {
  const res = await api.delete({
    endpoint: "selfClaim",
    path: [String(assignmentId)],
  });
  await asJson<void>(res);
}

export type AvailableFilter = {
  mode: "codes" | "category_type_s";
  codes: string[];
  branch_scope: {
    mode: "all" | "branch" | "group";
    label: string | null;
    branches: string[];
  };
  slot: {
    slot_id: number;
    date: string;
    start_time: string;
    end_time: string;
  } | null;
  date: string;
};

export type AvailableStaffResponse = {
  staff: Staff[];
  count: number;
  pool: number;
  limit: number;
  filter: AvailableFilter;
};

export async function fetchAvailableStaff(params: {
  date: string;
  slot_id?: number;
  branch?: string;
  q?: string;
}): Promise<AvailableStaffResponse> {
  const query: Record<string, string> = { date: params.date };
  if (params.slot_id) query.slot_id = String(params.slot_id);
  if (params.branch) query.branch = params.branch;
  if (params.q) query.q = params.q;
  const res = await api.get({ endpoint: "availableStaff", query });
  return asJson<AvailableStaffResponse>(res);
}
