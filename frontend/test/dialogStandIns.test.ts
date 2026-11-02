import { afterEach, describe, expect, it, vi } from 'vitest';

// Plan 003 R-1: jsdom has no showModal() or close(), so test/setup.ts provides stand-ins.
function createDialog(): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  document.body.append(dialog);
  return dialog;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dialog stand-ins', () => {
  it('opens the dialog with showModal()', () => {
    const dialog = createDialog();

    dialog.showModal();

    expect(dialog.open).toBe(true);
  });

  it('closes the dialog with close() and fires one close event', () => {
    const dialog = createDialog();
    const onClose = vi.fn();
    dialog.addEventListener('close', onClose);
    dialog.showModal();

    dialog.close();

    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires no close event when the dialog is already closed', () => {
    const dialog = createDialog();
    const onClose = vi.fn();
    dialog.addEventListener('close', onClose);

    dialog.close();

    expect(onClose).not.toHaveBeenCalled();
  });
});
