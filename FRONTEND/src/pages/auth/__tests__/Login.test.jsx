import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    loading: false,
    token: null,
    user: null,
    role: null,
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    renderLogin();
    expect(screen.getByTestId('input-nombre-usuario')).toBeInTheDocument();
    expect(screen.getByTestId('input-password')).toBeInTheDocument();
    expect(screen.getByTestId('button-login')).toBeInTheDocument();
  });

  test('renders link to register', () => {
    renderLogin();
    expect(screen.getByTestId('link-registro')).toHaveAttribute('href', '/registro');
  });

  test('calls login on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByTestId('input-nombre-usuario'), 'admin');
    await userEvent.type(screen.getByTestId('input-password'), 'admin123');
    await userEvent.click(screen.getByTestId('button-login'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        nombre_usuario: 'admin',
        password: 'admin123',
      });
    });
  });

  test('navigates to /home on success', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByTestId('input-nombre-usuario'), 'admin');
    await userEvent.type(screen.getByTestId('input-password'), 'admin123');
    await userEvent.click(screen.getByTestId('button-login'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });

  test('shows error toast on login failure', async () => {
    const { toast } = require('sonner');
    mockLogin.mockRejectedValue(new Error('Invalid'));
    renderLogin();

    await userEvent.type(screen.getByTestId('input-nombre-usuario'), 'wrong');
    await userEvent.type(screen.getByTestId('input-password'), 'wrong');
    await userEvent.click(screen.getByTestId('button-login'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciales inválidas');
    });
  });
});
