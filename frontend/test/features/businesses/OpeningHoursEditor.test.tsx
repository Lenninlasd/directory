import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses, type Business, type OpeningHoursRange } from '../../../src/api/businesses.ts';
import {
  interpretOpeningHours,
  saveOpeningHours,
  UnauthorizedError,
  type Interpretation,
} from '../../../src/api/openingHours.ts';
import { getAdminKey, setAdminKey } from '../../../src/features/businesses/adminKey.ts';
import { Directory } from '../../../src/features/businesses/Directory.tsx';
import { createQueryClient } from '../../../src/queryClient.ts';

// Business-editing spec, "Admin mode" and "Opening hours edit flow", through the Directory in admin
// mode with a mocked API layer. The border's motion cannot be seen in jsdom; task 6.1 checks it by hand.
vi.mock('../../../src/api/businesses.ts', () => ({ fetchBusinesses: vi.fn() }));
vi.mock('../../../src/api/openingHours.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/api/openingHours.ts')>()),
  interpretOpeningHours: vi.fn(),
  saveOpeningHours: vi.fn(),
}));

const fetchBusinessesMock = vi.mocked(fetchBusinesses);
const interpretMock = vi.mocked(interpretOpeningHours);
const saveMock = vi.mocked(saveOpeningHours);

function on(days: number[], opens: string, closes: string): OpeningHoursRange[] {
  return days.map((dayOfWeek) => ({ dayOfWeek, opens, closes }));
}

const mondayToSaturday = on([1, 2, 3, 4, 5, 6], '08:00', '18:00');
const saturdayUntilTwo = [...on([1, 2, 3, 4, 5], '08:00', '18:00'), ...on([6], '08:00', '14:00')];
const SATURDAY_CHANGE = 'el sábado cerramos a las 2';

const shop: Business = {
  id: 'shop',
  name: 'Ferretería El Tornillo',
  category: 'Ferretería',
  locationSummary: 'Local 3',
  hasPhysicalStore: true,
  whatsappNumber: null,
  websiteUrl: null,
  openingHours: mondayToSaturday,
};

const bakery: Business = { ...shop, id: 'bakery', name: 'Panadería Doña Rosa', openingHours: [] };

/** A promise the test settles by hand, to look at the loading states. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function renderAdminDirectory(businesses: Business[] = [shop, bakery]) {
  window.history.replaceState(null, '', '/?admin');
  fetchBusinessesMock.mockResolvedValue(businesses);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Directory />
    </QueryClientProvider>,
  );
  await screen.findByRole('region', { name: 'Todos los negocios' });
}

function openDialogFor(business: Business): HTMLElement {
  const results = screen.getByRole('region', { name: 'Todos los negocios' });
  fireEvent.click(within(results).getByRole('button', { name: `Ver detalles de ${business.name}` }));
  return screen.getByRole('dialog', { name: business.name });
}

/** Renders the directory in admin mode, opens the business, and activates "Editar horario". */
async function openEditor(business: Business = shop): Promise<HTMLElement> {
  await renderAdminDirectory();
  const dialog = openDialogFor(business);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Editar horario' }));
  return dialog;
}

const textBox = () => screen.getByRole('textbox', { name: '¿Qué cambia en el horario?' });
const button = (name: string) => screen.getByRole('button', { name });
const queryButton = (name: string) => screen.queryByRole('button', { name });
const typeRequest = (text: string) => fireEvent.change(textBox(), { target: { value: text } });

/** The live region that holds `text`, so the test also checks that screen readers announce it. */
function statusWith(text: string): HTMLElement | null {
  return screen.getByText(text).closest('[role="status"]');
}

/** Types the change and activates "Revisar cambio", with a key already kept for the tab. */
async function interpretWith(answer: Interpretation, request = SATURDAY_CHANGE) {
  setAdminKey('the-key');
  interpretMock.mockResolvedValue(answer);
  typeRequest(request);
  fireEvent.click(button('Revisar cambio'));
  await screen.findByText(/Días con cambios|No hay cambios|No entendí/);
}

beforeEach(() => {
  fetchBusinessesMock.mockReset();
  interpretMock.mockReset();
  saveMock.mockReset();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  sessionStorage.clear();
});

describe('OpeningHoursEditor: writing the change', () => {
  it('shows the labeled text box, "Revisar cambio", and "Cancelar", with the text box focused', async () => {
    await openEditor();

    expect(textBox()).toHaveAttribute(
      'placeholder',
      'Ej.: de lunes a viernes de 8 a. m. a 6 p. m., o el sábado cerramos a las 2 p. m.',
    );
    expect(textBox()).toHaveFocus();
    expect(button('Revisar cambio')).toBeInTheDocument();
    expect(button('Cancelar')).toBeInTheDocument();
    expect(queryButton('Editar horario')).not.toBeInTheDocument();
  });

  it('accepts at most 300 characters', async () => {
    await openEditor();

    expect(textBox()).toHaveAttribute('maxLength', '300');
  });

  it('disables "Revisar cambio" while the text is empty or only spaces', async () => {
    await openEditor();
    expect(button('Revisar cambio')).toBeDisabled();

    typeRequest('   ');
    expect(button('Revisar cambio')).toBeDisabled();

    typeRequest(SATURDAY_CHANGE);
    expect(button('Revisar cambio')).toBeEnabled();
  });

  it('wraps the text box in the AI border with a sparkle icon that screen readers ignore', async () => {
    await openEditor();

    const border = textBox().parentElement;
    expect(border).toHaveClass('bg-ai-border');
    expect(border).not.toHaveAttribute('data-interpreting');
    const sparkle = border?.querySelector('svg');
    expect(sparkle).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('OpeningHoursEditor: admin key', () => {
  it('asks for the key first, then sends the request with it and keeps it for the tab', async () => {
    await openEditor();
    interpretMock.mockResolvedValue({ understood: true, openingHours: saturdayUntilTwo });
    typeRequest(SATURDAY_CHANGE);

    fireEvent.click(button('Revisar cambio'));

    expect(interpretMock).not.toHaveBeenCalled();
    const keyField = screen.getByLabelText('Clave de administrador');
    expect(keyField).toHaveAttribute('type', 'password');
    expect(keyField).toHaveFocus();
    expect(button('Continuar')).toBeDisabled();

    fireEvent.change(keyField, { target: { value: 'the-key' } });
    fireEvent.click(button('Continuar'));

    await waitFor(() =>
      expect(interpretMock).toHaveBeenCalledWith(
        { businessId: 'shop', request: SATURDAY_CHANGE, adminKey: 'the-key' },
        expect.anything(),
      ),
    );
    expect(getAdminKey()).toBe('the-key');
    await screen.findByText('Días con cambios: sábado');
    expect(screen.queryByLabelText('Clave de administrador')).not.toBeInTheDocument();
  });

  it('does not ask again for a key kept in the tab, also for another business', async () => {
    setAdminKey('the-key');
    interpretMock.mockResolvedValue({ understood: false });
    const dialog = await openEditor();
    typeRequest(SATURDAY_CHANGE);
    fireEvent.click(button('Revisar cambio'));
    await screen.findByText('No entendí el cambio. Intenta escribirlo de otra forma.');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    const otherDialog = openDialogFor(bakery);
    fireEvent.click(within(otherDialog).getByRole('button', { name: 'Editar horario' }));
    typeRequest('abrimos los lunes de 8 a 12');
    fireEvent.click(button('Revisar cambio'));

    expect(screen.queryByLabelText('Clave de administrador')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(interpretMock).toHaveBeenLastCalledWith(
        { businessId: 'bakery', request: 'abrimos los lunes de 8 a 12', adminKey: 'the-key' },
        expect.anything(),
      ),
    );
  });

  it('forgets a rejected key, shows "Clave incorrecta" with the key field, and keeps the text', async () => {
    setAdminKey('old-key');
    await openEditor();
    interpretMock.mockRejectedValueOnce(new UnauthorizedError());
    typeRequest(SATURDAY_CHANGE);

    fireEvent.click(button('Revisar cambio'));

    expect(await screen.findByText('Clave incorrecta')).toBeInTheDocument();
    expect(statusWith('Clave incorrecta')).not.toBeNull();
    expect(getAdminKey()).toBeNull();
    expect(textBox()).toHaveValue(SATURDAY_CHANGE);
    expect(screen.queryByText('No pudimos procesar el cambio. Inténtalo de nuevo.')).not.toBeInTheDocument();

    interpretMock.mockResolvedValueOnce({ understood: true, openingHours: saturdayUntilTwo });
    fireEvent.change(screen.getByLabelText('Clave de administrador'), { target: { value: 'new-key' } });
    fireEvent.click(button('Continuar'));

    await waitFor(() =>
      expect(interpretMock).toHaveBeenLastCalledWith(
        { businessId: 'shop', request: SATURDAY_CHANGE, adminKey: 'new-key' },
        expect.anything(),
      ),
    );
    await screen.findByText('Días con cambios: sábado');
    expect(screen.queryByText('Clave incorrecta')).not.toBeInTheDocument();
  });

  it('keeps the proposal shown when the save answers 401, and saves after a new key', async () => {
    await openEditor();
    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });
    saveMock.mockRejectedValueOnce(new UnauthorizedError());

    fireEvent.click(button('Guardar'));

    expect(await screen.findByText('Clave incorrecta')).toBeInTheDocument();
    expect(screen.getByText('Nuevo horario')).toBeInTheDocument();
    expect(screen.getByText('Sábado · 8:00 a. m. – 2:00 p. m.')).toBeInTheDocument();
    expect(textBox()).toHaveValue(SATURDAY_CHANGE);

    saveMock.mockResolvedValueOnce(saturdayUntilTwo);
    fireEvent.change(screen.getByLabelText('Clave de administrador'), { target: { value: 'new-key' } });
    fireEvent.click(button('Continuar'));

    await waitFor(() =>
      expect(saveMock).toHaveBeenLastCalledWith(
        { businessId: 'shop', openingHours: saturdayUntilTwo, adminKey: 'new-key' },
        expect.anything(),
      ),
    );
    expect(await screen.findByText('Horario actualizado')).toBeInTheDocument();
  });
});

describe('OpeningHoursEditor: interpreting', () => {
  it('shows "Interpretando…", disables the text box and buttons, and turns the border until the answer', async () => {
    setAdminKey('the-key');
    await openEditor();
    const answer = deferred<Interpretation>();
    interpretMock.mockReturnValue(answer.promise);
    typeRequest(SATURDAY_CHANGE);

    fireEvent.click(button('Revisar cambio'));

    expect(await screen.findByText('Interpretando…')).toBeInTheDocument();
    expect(statusWith('Interpretando…')).not.toBeNull();
    expect(textBox()).toBeDisabled();
    expect(button('Revisar cambio')).toBeDisabled();
    expect(button('Cancelar')).toBeDisabled();
    expect(textBox().parentElement).toHaveAttribute('data-interpreting');

    await act(async () => answer.resolve({ understood: false }));

    await waitFor(() => expect(screen.queryByText('Interpretando…')).not.toBeInTheDocument());
    expect(textBox()).toBeEnabled();
    expect(textBox().parentElement).not.toHaveAttribute('data-interpreting');
  });

  it('shows the proposed week, the changed days, and "Guardar"', async () => {
    await openEditor();

    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });

    expect(screen.getByText('Nuevo horario')).toBeInTheDocument();
    expect(screen.getByText('Lunes a viernes · 8:00 a. m. – 6:00 p. m.', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByText('Sábado · 8:00 a. m. – 2:00 p. m.')).toBeInTheDocument();
    expect(screen.getByText('Domingo · Cerrado', { selector: 'li' })).toBeInTheDocument();
    expect(statusWith('Días con cambios: sábado')).not.toBeNull();
    expect(button('Guardar')).toBeEnabled();
    expect(button('Cancelar')).toBeEnabled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('lists several changed days', async () => {
    await openEditor();

    await interpretWith({
      understood: true,
      openingHours: [...on([1, 2, 4, 5], '08:00', '18:00'), ...on([3, 6], '09:00', '13:00')],
    });

    expect(screen.getByText('Días con cambios: miércoles y sábado')).toBeInTheDocument();
  });

  it('shows "No hay cambios en el horario." and disables "Guardar" for the same week', async () => {
    await openEditor();

    await interpretWith({ understood: true, openingHours: mondayToSaturday });

    expect(statusWith('No hay cambios en el horario.')).not.toBeNull();
    expect(screen.queryByText(/Días con cambios/)).not.toBeInTheDocument();
    expect(button('Guardar')).toBeDisabled();
  });

  it('shows "Sin horario registrado" as the proposal when every range is removed', async () => {
    await openEditor();

    await interpretWith({ understood: true, openingHours: [] });

    const proposal = screen.getByText('Nuevo horario').parentElement;
    expect(proposal).toHaveTextContent('Sin horario registrado');
    expect(screen.getByText('Días con cambios: lunes, martes, miércoles, jueves, viernes y sábado')).toBeInTheDocument();
  });

  it('shows the not-understood message and keeps the text to change it', async () => {
    await openEditor();

    await interpretWith({ understood: false }, 'hazme un poema');

    expect(statusWith('No entendí el cambio. Intenta escribirlo de otra forma.')).not.toBeNull();
    expect(textBox()).toHaveValue('hazme un poema');
    expect(button('Revisar cambio')).toBeEnabled();
    expect(queryButton('Guardar')).not.toBeInTheDocument();
  });

  it('shows the interpretation failure, keeping the panel and its text', async () => {
    setAdminKey('the-key');
    await openEditor();
    interpretMock.mockRejectedValue(new Error('503'));
    typeRequest(SATURDAY_CHANGE);

    fireEvent.click(button('Revisar cambio'));

    expect(await screen.findByText('No pudimos procesar el cambio. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(statusWith('No pudimos procesar el cambio. Inténtalo de nuevo.')).not.toBeNull();
    expect(textBox()).toHaveValue(SATURDAY_CHANGE);
    expect(button('Revisar cambio')).toBeEnabled();
    expect(getAdminKey()).toBe('the-key');
  });

  it('clears the proposal when the text changes, so the proposal always matches the text', async () => {
    await openEditor();
    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });

    typeRequest('el sábado cerramos a las 3');

    expect(screen.queryByText('Nuevo horario')).not.toBeInTheDocument();
    expect(queryButton('Guardar')).not.toBeInTheDocument();
    expect(button('Revisar cambio')).toBeEnabled();
  });
});

describe('OpeningHoursEditor: saving', () => {
  it('shows "Guardando…", then closes the panel, shows "Horario actualizado", and reloads the list', async () => {
    const dialog = await openEditor();
    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });
    const saved = deferred<OpeningHoursRange[]>();
    saveMock.mockReturnValue(saved.promise);
    fetchBusinessesMock.mockResolvedValue([{ ...shop, openingHours: saturdayUntilTwo }, bakery]);

    fireEvent.click(button('Guardar'));

    expect(await screen.findByText('Guardando…')).toBeInTheDocument();
    expect(statusWith('Guardando…')).not.toBeNull();
    expect(button('Guardar')).toBeDisabled();
    expect(button('Cancelar')).toBeDisabled();
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        { businessId: 'shop', openingHours: saturdayUntilTwo, adminKey: 'the-key' },
        expect.anything(),
      ),
    );

    await act(async () => saved.resolve(saturdayUntilTwo));

    expect(await screen.findByText('Horario actualizado')).toBeInTheDocument();
    expect(statusWith('Horario actualizado')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: '¿Qué cambia en el horario?' })).not.toBeInTheDocument();
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(2);
    expect(within(dialog).getByText('Sábado · 8:00 a. m. – 2:00 p. m.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Editar horario' })).toHaveFocus();
  });

  it('shows the save failure, keeping the panel, the text, and the proposal', async () => {
    await openEditor();
    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });
    saveMock.mockRejectedValue(new Error('500'));

    fireEvent.click(button('Guardar'));

    expect(await screen.findByText('No pudimos guardar el horario. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(statusWith('No pudimos guardar el horario. Inténtalo de nuevo.')).not.toBeNull();
    expect(screen.getByText('Nuevo horario')).toBeInTheDocument();
    expect(textBox()).toHaveValue(SATURDAY_CHANGE);
    expect(button('Guardar')).toBeEnabled();
    expect(fetchBusinessesMock).toHaveBeenCalledTimes(1);
  });
});

describe('OpeningHoursEditor: canceling', () => {
  it('closes the panel with "Cancelar", stores nothing, and returns focus to "Editar horario"', async () => {
    const dialog = await openEditor();
    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });

    fireEvent.click(button('Cancelar'));

    expect(screen.queryByRole('textbox', { name: '¿Qué cambia en el horario?' })).not.toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Editar horario' })).toHaveFocus();
    expect(within(dialog).getByText('Sábado · 8:00 a. m. – 6:00 p. m.', { exact: false })).toBeInTheDocument();
  });

  it('closes the panel when the dialog closes, and shows "Editar horario" when it opens again', async () => {
    const dialog = await openEditor();
    typeRequest(SATURDAY_CHANGE);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    const reopened = openDialogFor(shop);

    expect(within(reopened).getByRole('button', { name: 'Editar horario' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '¿Qué cambia en el horario?' })).not.toBeInTheDocument();
    expect(interpretMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('forgets "Horario actualizado" when the dialog opens again', async () => {
    const dialog = await openEditor();
    await interpretWith({ understood: true, openingHours: saturdayUntilTwo });
    saveMock.mockResolvedValue(saturdayUntilTwo);
    fireEvent.click(button('Guardar'));
    await screen.findByText('Horario actualizado');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    openDialogFor(shop);

    await waitFor(() => expect(screen.queryByText('Horario actualizado')).not.toBeInTheDocument());
  });
});
