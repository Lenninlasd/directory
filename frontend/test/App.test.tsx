import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinesses } from '../src/api/businesses.ts';
import { App } from '../src/App.tsx';
import { createQueryClient } from '../src/queryClient.ts';

vi.mock('../src/api/businesses.ts', () => ({ fetchBusinesses: vi.fn() }));

afterEach(() => {
  vi.mocked(fetchBusinesses).mockReset();
});

describe('App', () => {
  it('renders the business list inside the main landmark', async () => {
    vi.mocked(fetchBusinesses).mockResolvedValue([]);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <App />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(await screen.findByText('Aún no hay negocios disponibles')).toBeInTheDocument();
  });
});
