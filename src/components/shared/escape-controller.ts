import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Doc-level Escape handler that cancels whichever modal/state is currently
 * "active" on the host. Add one controller per cancellable state so each
 * registers its own predicate + onCancel; the order of registration is the
 * priority order (first match wins). preventDefault + stopPropagation fire
 * so the keystroke doesn't leak past the cancel.
 *
 * Usage:
 *   constructor() {
 *     super();
 *     new EscapeController(this, () => this.pendingDrop !== null,
 *       () => this.cancelDrop());
 *   }
 */
export class EscapeController implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    private isActive: () => boolean,
    private onEscape: () => void,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    document.addEventListener("keydown", this.onKey);
  }

  hostDisconnected(): void {
    document.removeEventListener("keydown", this.onKey);
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.key !== "Escape") return;
    if (!this.isActive()) return;
    e.preventDefault();
    e.stopPropagation();
    this.onEscape();
  };
}
