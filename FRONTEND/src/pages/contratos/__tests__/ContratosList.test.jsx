import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContratosList from '../ContratosList';
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
        <div key={i} data-testid={`mock-row-${i}`}>{row.titulo || row.id}</div>
      ))}
    </div>
  ),
}));

jest.mock('material-react-table/locales/es', () => ({
  MRT_Localization_ES: {},
}));

jest.mock('../ContratosTabList', () => ({ items }) => (
  <div data-testid="mock-contratos-tab-list">
    {items.map((row, i) => (
      <div key={i} data-testid={`mock-row-${i}`}>{row.titulo}</div>
    ))}
  </div>
));

jest.mock('../ContratosTabCreate', () => (props) => (
  <div data-testid="mock-contratos-tab-create">{props.editingContrato ? 'Editing' : 'Create'}</div>
));

function renderContratosList(role = 'administrador') {
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
      <MemoryRouter initialEntries={['/contratos']}>
        <ContratosList />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ContratosList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    const { api } = require('../../../lib/api');
    api.get.mockReturnValue(new Promise(() => {}));
    renderContratosList();
    expect(screen.getByText('Cargando contratos...')).toBeInTheDocument();
  });

  test('loads and displays contracts', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({
      data: [
        { id: 1, titulo: 'Contrato A' },
        { id: 2, titulo: 'Contrato B' },
      ],
    });
    renderContratosList();

    await waitFor(() => {
      expect(screen.getByText('Contrato A')).toBeInTheDocument();
      expect(screen.getByText('Contrato B')).toBeInTheDocument();
    });
  });

  test('shows "Crear Contrato" tab for admin', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderContratosList('administrador');

    await waitFor(() => {
      expect(screen.getByText('Crear Contrato')).toBeInTheDocument();
    });
  });

  test('hides "Crear Contrato" tab for non-admin', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderContratosList('editor');

    await waitFor(() => {
      expect(screen.queryByText('Crear Contrato')).not.toBeInTheDocument();
    });
  });

  test('calls GET /contratos on mount', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderContratosList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/contratos');
    });
  });
});
