import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only cleans up automatically when Vitest globals are enabled.
afterEach(() => {
  cleanup();
});

// jsdom has HTMLDialogElement but no showModal() or close() (spec 003 plan R-1).
// These stand-ins only track `open` and fire `close`. Native behavior (Escape, focus trap,
// backdrop) is not simulated and is covered by manual checks. Each one is defined only when
// jsdom does not provide it.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
}

if (typeof HTMLDialogElement.prototype.close !== 'function') {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) {
      return;
    }
    this.open = false;
    // Like the native event: it does not bubble and cannot be cancelled.
    this.dispatchEvent(new Event('close'));
  };
}
