import { describe, expect, it, vi } from 'vitest';

// Covers the jsdom stand-ins from test/setup.ts (spec 003, plan D-4 and R-1).
describe('HTMLDialogElement stand-ins', () => {
  it('showModal() opens the dialog', () => {
    const dialog = document.createElement('dialog');

    dialog.showModal();

    expect(dialog.open).toBe(true);
  });

  it('close() closes the dialog and fires the close event exactly once', () => {
    const dialog = document.createElement('dialog');
    const onClose = vi.fn();
    dialog.addEventListener('close', onClose);
    dialog.showModal();

    dialog.close();

    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close() on a closed dialog fires nothing', () => {
    const dialog = document.createElement('dialog');
    const onClose = vi.fn();
    dialog.addEventListener('close', onClose);

    dialog.close();

    expect(dialog.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
