import type { Assignment } from "./api.js";
import { __ } from "./i18n/index.js";

export type AssignmentStatus = Assignment["status"];

// Function (not const) so __() resolves at call time after the
// active-language dictionary has loaded, mirroring the DAYS / FULL_DAYS
// convention in staff-roster-grid.ts.
export const STATUS_LABELS = (): Record<AssignmentStatus, string> => ({
  scheduled: __("Scheduled"),
  confirmed: __("Confirmed"),
  completed: __("Completed"),
  cancelled: __("Cancelled"),
  no_show: __("No-show"),
});
