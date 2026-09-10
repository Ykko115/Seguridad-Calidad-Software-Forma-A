import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

let mockAuthState = { token: null, role: null, user: null, loading: false };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('../components/Layout', () => () => {
  const { Outlet } = require('react-router-dom');
  return (
    <div data-testid="layout">
      <Outlet />
    </div>
  );
});

jest.mock('../pages/Home', () => () => <div>Home Page</div>);
jest.mock('../pages/auth/Login', () => () => <div>Login Page</div>);
jest.mock('../pages/auth/Register', () => () => <div>Register Page</div>);
jest.mock('../pages/clientes/ClientesList', () => () => <div>Clientes List</div>);
jest.mock('../pages/clientes/ClienteForm', () => () => <div>Cliente Form</div>);
jest.mock('../pages/contratos/ContratosList', () => () => <div>Contratos List</div>);
jest.mock('../pages/contratos/ContratoForm', () => () => <div>Contrato Form</div>);
jest.mock('../pages/contratos/ContratoDetalle', () => () => <div>Contrato Detalle</div>);
jest.mock('../pages/auditoria/AuditoriaList', () => () => <div>Auditoria List</div>);
jest.mock('../pages/empresas/EmpresaForm', () => () => <div>Empresa Form</div>);
jest.mock('../pages/usuarios/UsuariosList', () => () => <div>Usuarios List</div>);
jest.mock('../pages/usuarios/UsuarioForm', () => () => <div>Usuario Form</div>);

function renderApp(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  beforeEach(() => {
    mockAuthState = { token: null, role: null, user: null, loading: false };
  });

  test('redirects to /login when not authenticated', () => {
    renderApp('/home');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('redirects unknown routes to /login', () => {
    renderApp('/no-existe');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('renders /login page', () => {
    renderApp('/login');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  test('renders /registro page', () => {
    renderApp('/registro');
    expect(screen.getByText('Register Page')).toBeInTheDocument();
  });

  test('renders Home inside Layout when authenticated', () => {
    mockAuthState = { token: 't', role: 'administrador', user: { nombre_usuario: 'admin' }, loading: false };
    renderApp('/home');
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  test('renders ClientesList when authenticated', () => {
    mockAuthState = { token: 't', role: 'administrador', user: { nombre_usuario: 'admin' }, loading: false };
    renderApp('/clientes');
    expect(screen.getByText('Clientes List')).toBeInTheDocument();
  });

  test('renders UsuariosList for admin only', () => {
    mockAuthState = { token: 't', role: 'administrador', user: { nombre_usuario: 'admin' }, loading: false };
    renderApp('/usuarios');
    expect(screen.getByText('Usuarios List')).toBeInTheDocument();
  });

  test('shows "No autorizado" for non-admin on /usuarios', () => {
    mockAuthState = { token: 't', role: 'editor', user: { nombre_usuario: 'edit' }, loading: false };
    renderApp('/usuarios');
    expect(screen.getByText('No autorizado (solo administrador).')).toBeInTheDocument();
  });

  test('renders ClienteForm wrapped in RequireAdmin for admins', () => {
    mockAuthState = { token: 't', role: 'administrador', user: { nombre_usuario: 'admin' }, loading: false };
    renderApp('/clientes/nuevo');
    expect(screen.getByText('Cliente Form')).toBeInTheDocument();
  });

  test('blocks non-admin from /clientes/nuevo', () => {
    mockAuthState = { token: 't', role: 'editor', user: { nombre_usuario: 'edit' }, loading: false };
    renderApp('/clientes/nuevo');
    expect(screen.getByText('No autorizado (solo administrador).')).toBeInTheDocument();
  });
});