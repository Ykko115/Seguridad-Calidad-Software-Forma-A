import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    token: 'fake-token',
    user: { nombre_usuario: 'admin', empresaId: 1, usuarioId: 1 },
    role: 'administrador',
  }),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('material-react-table', () => ({
  MaterialReactTable: ({ data }) => (
    <div data-testid="mock-table">
      {data.map((row, i) => (
        <div key={i} data-testid={`mock-row-${i}`}>{JSON.stringify(row)}</div>
      ))}
    </div>
  ),
}));

jest.mock('material-react-table/locales/es', () => ({
  MRT_Localization_ES: {},
}));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Home />
    </MemoryRouter>
  );
}

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    const { api } = require('../../lib/api');
    api.get.mockReturnValue(new Promise(() => {}));
    renderHome();
    expect(screen.getByText('Cargando métricas...')).toBeInTheDocument();
  });

  test('displays metrics after loading', async () => {
    const { api } = require('../../lib/api');
    api.get.mockResolvedValue({
      data: {
        metricas: { totalUsuarios: 5, totalClientes: 12, contratos7Dias: 2, contratos15Dias: 3, contratos30Dias: 7 },
        contratosProximosAVencer: [],
        contratosVencidos: [],
      },
    });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  test('shows welcome message with username', async () => {
    const { api } = require('../../lib/api');
    api.get.mockResolvedValue({
      data: { metricas: { totalUsuarios: 0, totalClientes: 0, contratos7Dias: 0, contratos15Dias: 0, contratos30Dias: 0 }, contratosProximosAVencer: [], contratosVencidos: [] },
    });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  test('calls GET /metricas on mount', async () => {
    const { api } = require('../../lib/api');
    api.get.mockResolvedValue({
      data: { metricas: {}, contratosProximosAVencer: [], contratosVencidos: [] },
    });
    renderHome();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/metricas');
    });
  });

  test('shows empty state for contracts tabs', async () => {
    const { api } = require('../../lib/api');
    api.get.mockResolvedValue({
      data: { metricas: { totalUsuarios: 0, totalClientes: 0, contratos7Dias: 0, contratos15Dias: 0, contratos30Dias: 0 }, contratosProximosAVencer: [], contratosVencidos: [] },
    });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('No hay contratos próximos a vencer')).toBeInTheDocument();
    });
  });
});
