import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only cleans up automatically when Vitest globals are enabled.
afterEach(() => {
  cleanup();
});

// jsdom has HTMLDialogElement but no showModal() or close() (plan 003 R-1). These stand-ins only
// toggle `open` and fire `close`; Escape, the focus trap, and the backdrop are manual checks.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
}

if (typeof HTMLDialogElement.prototype.close !== 'function') {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
