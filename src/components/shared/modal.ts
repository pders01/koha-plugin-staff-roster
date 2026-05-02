import { html, type TemplateResult } from "lit";
import { __ } from "../../i18n/index.js";

export type ModalShellOpts = {
  title: string;
  body: TemplateResult;
  footer: TemplateResult;
  onCancel: () => void;
  /** Extra dialog classes (e.g. "modal-lg srg-edit-dialog") */
  dialogClass?: string;
};

/**
 * Bootstrap modal skeleton matching the rest of the plugin (light DOM,
 * Koha intranet styles). Click on the backdrop or the close button calls
 * onCancel. ESC handling is the caller's responsibility (the schedule
 * grid wires it through its global keydown listener; the simpler list
 * components rely on backdrop click).
 */
export function renderModalShell(opts: ModalShellOpts): TemplateResult {
  const { title, body, footer, onCancel, dialogClass } = opts;
  return html`
    <div
      class="modal show staff-roster-modal-open"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      style="display: block;"
      @click=${(e: MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains("modal")) onCancel();
      }}
    >
      <div class="modal-dialog ${dialogClass ?? ""}" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title">${title}</h1>
            <button
              type="button"
              class="btn-close"
              aria-label="${__("Close")}"
              @click=${onCancel}
            ></button>
          </div>
          <div class="modal-body">${body}</div>
          <div class="modal-footer">${footer}</div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show staff-roster-modal-backdrop"></div>
  `;
}
