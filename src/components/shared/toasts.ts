import { html, nothing, type TemplateResult } from "lit";

export type ToastOpts = {
  successMsg?: string;
  error?: string;
  onDismissError?: () => void;
};

export function renderToasts(opts: ToastOpts): TemplateResult | typeof nothing {
  const { successMsg, error, onDismissError } = opts;
  if (!successMsg && !error) return nothing;
  return html`
    ${successMsg
      ? html`
          <div class="srg-toast alert alert-success" role="status" aria-live="polite">
            <i class="fa fa-check" aria-hidden="true"></i>
            <span>${successMsg}</span>
          </div>
        `
      : nothing}
    ${error
      ? html`
          <div class="srg-toast alert alert-danger" role="alert" aria-live="assertive">
            <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
            <span>${error}</span>
            ${onDismissError
              ? html`<button
                  type="button"
                  class="btn-close"
                  aria-label="Dismiss"
                  @click=${onDismissError}
                ></button>`
              : nothing}
          </div>
        `
      : nothing}
  `;
}
