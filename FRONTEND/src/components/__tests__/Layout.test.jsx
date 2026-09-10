import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';
import { AuthContext } from '../../context/authContextInstance';

const mockNavigate = jest.fn();
const mockLogout = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

jest.mock('../../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('../../assets/logo.svg', () => 'logo-stub');

function renderLayout(role = 'administrador') {
  const authValue = {
    token: 'fake-token',
    user: { nombre_usuario: 'admin', empresaId: 1, usuarioId: 1 },
    role,
    setRole: jest.fn(),
    loading: false,
    login: jest.fn(),
    logout: mockLogout,
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/home']}>
        <Layout />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders sidebar navigation items', () => {
    renderLayout();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
  });

  test('shows Usuarios link for admin', () => {
    renderLayout('administrador');
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  test('hides Usuarios link for non-admin', () => {
    renderLayout('editor');
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  test('displays user name', () => {
    renderLayout();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  test('displays role', () => {
    renderLayout();
    expect(screen.getByText('administrador')).toBeInTheDocument();
  });

  test('calls logout on logout button click', async () => {
    renderLayout();
    await userEvent.click(screen.getByTestId('button-layout-logout'));
    expect(mockLogout).toHaveBeenCalled();
  });

  test('renders outlet', () => {
    renderLayout();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('navigates to edit account on button click', async () => {
    renderLayout();
    await userEvent.click(screen.getByTestId('button-layout-editar-cuenta'));
    expect(mockNavigate).toHaveBeenCalledWith('/usuarios/1/editar');
  });
});
