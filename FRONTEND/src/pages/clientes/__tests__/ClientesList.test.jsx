import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientesList from '../ClientesList';
import { AuthContext } from '../../../context/authContextInstance';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    token: 'fake-token',
    user: { nombre_usuario: 'admin' },
    role: 'administrador',
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('material-react-table', () => ({
  MaterialReactTable: ({ data }) => (
    <div data-testid="mock-table">
      {data.map((row, i) => (
        <div key={i} data-testid={`mock-row-${i}`}>{row.nombre || row.id}</div>
      ))}
    </div>
  ),
}));

jest.mock('material-react-table/locales/es', () => ({
  MRT_Localization_ES: {},
}));

function renderClientesList(role = 'administrador') {
  const authValue = {
    token: 'fake-token',
    user: { nombre_usuario: 'admin' },
    role,
    setRole: jest.fn(),
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/clientes']}>
        <ClientesList />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ClientesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    const { api } = require('../../../lib/api');
    api.get.mockReturnValue(new Promise(() => {}));
    renderClientesList();
    expect(screen.getByText('Cargando clientes...')).toBeInTheDocument();
  });

  test('loads and displays clients', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({
      data: [
        { id: 1, nombre: 'Cliente A', correo: 'a@test.com' },
        { id: 2, nombre: 'Cliente B', correo: 'b@test.com' },
      ],
    });
    renderClientesList();

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
      expect(screen.getByText('Cliente B')).toBeInTheDocument();
    });
  });

  test('shows "Crear Cliente" tab for admin', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderClientesList('administrador');

    await waitFor(() => {
      expect(screen.getByText('Crear Cliente')).toBeInTheDocument();
    });
  });

  test('hides "Crear Cliente" tab for non-admin', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderClientesList('editor');

    await waitFor(() => {
      expect(screen.queryByText('Crear Cliente')).not.toBeInTheDocument();
    });
  });

  test('calls GET /clientes on mount', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderClientesList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/clientes');
    });
  });
});
