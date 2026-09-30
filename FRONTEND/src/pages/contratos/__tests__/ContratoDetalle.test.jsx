import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ContratoDetalle from '../ContratoDetalle';

const mockNavigate = jest.fn();
let mockRole = 'administrador';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const contrato = {
  id: 1,
  cliente_id: 2,
  titulo: 'Contrato Anual',
  fecha_inicio: '2024-01-01',
  fecha_fin: '2024-12-31',
  descripcion: 'Servicios anuales',
};

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={['/contratos/1']}>
      <Routes>
        <Route path="/contratos/:id" element={<ContratoDetalle />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ContratoDetalle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'administrador';
  });

  test('loads and renders contract detail', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: contrato });
    renderDetalle();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/contratos/1');
    });
    expect(await screen.findByText('Contrato Anual')).toBeInTheDocument();
    expect(screen.getByText('Cliente: 2')).toBeInTheDocument();
    expect(screen.getByText('Inicio: 2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('Fin: 2024-12-31')).toBeInTheDocument();
    expect(screen.getByText('Descripción: Servicios anuales')).toBeInTheDocument();
  });

  test('renders download link with api url', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: contrato });
    renderDetalle();

    const link = await screen.findByText('Ver archivo');
    expect(link).toHaveAttribute('href', 'http://localhost:4450/contratos/1/file');
  });

  test('hides descripcion when absent', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: { ...contrato, descripcion: null } });
    renderDetalle();

    await screen.findByText('Contrato Anual');
    expect(screen.queryByText(/Descripción:/)).not.toBeInTheDocument();
  });

  test('deletes contract as admin and navigates back', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: contrato });
    api.delete.mockResolvedValue({});
    renderDetalle();

    await userEvent.click(await screen.findByText('Eliminar'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/contratos/1');
      expect(toast.success).toHaveBeenCalledWith('Contrato eliminado');
      expect(mockNavigate).toHaveBeenCalledWith('/contratos');
    });
  });

  test('hides delete button for non-admin', async () => {
    mockRole = 'editor';
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: contrato });
    renderDetalle();

    await screen.findByText('Contrato Anual');
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  });

  test('does not call api for non-admin delete path', async () => {
    mockRole = 'editor';
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: contrato });
    renderDetalle();

    await screen.findByText('Contrato Anual');
    await new Promise((r) => setTimeout(r, 300));
    expect(api.delete).not.toHaveBeenCalled();
  });

  test('renders nothing while loading', () => {
    const { api } = require('../../../lib/api');
    api.get.mockImplementation(() => new Promise(() => {}));
    const { container } = renderDetalle();

    expect(container.querySelector('.MuiCard-root')).not.toBeInTheDocument();
  });
});
