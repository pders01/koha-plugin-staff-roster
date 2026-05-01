import { RequestHandler } from "@jpahd/lit-stack/http";
import type { ApiEndpoints } from "@jpahd/lit-stack/http";

const NS = "staffroster";
const BASE = `/api/v1/contrib/${NS}`;

const ENDPOINTS: ApiEndpoints = {
  get: {
    rosterWeek: { url: `${BASE}/rosters`, cache: false },
    availableStaff: { url: `${BASE}/staff/available`, cache: false },
  },
  post: {
    assignments: { url: `${BASE}/assignments`, cache: false },
    bulk: { url: `${BASE}/assignments/bulk`, cache: false },
  },
  put: {
    assignments: { url: `${BASE}/assignments`, cache: false },
  },
  delete: {
    assignments: { url: `${BASE}/assignments`, cache: false },
  },
};

export const api = new RequestHandler(BASE, ENDPOINTS);

export type Slot = {
  id: number;
  recurrence_rule: string;
  days_of_week: string[]; // iCal BYDAY codes: SU MO TU WE TH FR SA
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
  body: Partial<{ slot_id: number; borrowernumber: number; assignment_date: string; status: string; notes: string }>,
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

export async function fetchAvailableStaff(params: {
  date: string;
  slot_id?: number;
  branch?: string;
  q?: string;
}): Promise<Staff[]> {
  const query: Record<string, string> = { date: params.date };
  if (params.slot_id) query.slot_id = String(params.slot_id);
  if (params.branch) query.branch = params.branch;
  if (params.q) query.q = params.q;
  const res = await api.get({ endpoint: "availableStaff", query });
  return asJson<Staff[]>(res);
}
