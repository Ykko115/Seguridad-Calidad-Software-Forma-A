import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Register from '../Register';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../lib/api', () => ({
  api: { post: jest.fn(), get: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/registro']}>
      <Register />
    </MemoryRouter>
  );
}

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders step 1 form (user info)', () => {
    renderRegister();
    expect(screen.getByTestId('input-registro-nombre-usuario')).toBeInTheDocument();
    expect(screen.getByTestId('input-registro-correo')).toBeInTheDocument();
    expect(screen.getByTestId('input-registro-password')).toBeInTheDocument();
    expect(screen.getByTestId('button-registro-continuar')).toBeInTheDocument();
  });

  test('advances to step 2 on user submit', async () => {
    renderRegister();

    await userEvent.type(screen.getByTestId('input-registro-nombre-usuario'), 'newuser');
    await userEvent.type(screen.getByTestId('input-registro-correo'), 'user@test.com');
    await userEvent.type(screen.getByTestId('input-registro-password'), 'pass123');
    await userEvent.click(screen.getByTestId('button-registro-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('input-registro-nombre-empresa')).toBeInTheDocument();
    });
  });

  test('goes back to step 1', async () => {
    renderRegister();

    await userEvent.type(screen.getByTestId('input-registro-nombre-usuario'), 'newuser');
    await userEvent.type(screen.getByTestId('input-registro-correo'), 'user@test.com');
    await userEvent.type(screen.getByTestId('input-registro-password'), 'pass123');
    await userEvent.click(screen.getByTestId('button-registro-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('input-registro-nombre-empresa')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('button-registro-volver'));

    await waitFor(() => {
      expect(screen.getByTestId('input-registro-nombre-usuario')).toBeInTheDocument();
    });
  });

  test('submits empresa form and navigates to login', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.post.mockResolvedValue({});

    renderRegister();

    await userEvent.type(screen.getByTestId('input-registro-nombre-usuario'), 'newuser');
    await userEvent.type(screen.getByTestId('input-registro-correo'), 'user@test.com');
    await userEvent.type(screen.getByTestId('input-registro-password'), 'pass123');
    await userEvent.click(screen.getByTestId('button-registro-continuar'));

    await waitFor(() => {
      expect(screen.getByTestId('input-registro-nombre-empresa')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('input-registro-nombre-empresa'), 'Test Corp');
    await userEvent.type(screen.getByTestId('input-registro-calle'), 'Av. Principal 123');
    await userEvent.type(screen.getByTestId('input-registro-comuna'), 'Santiago');
    await userEvent.type(screen.getByTestId('input-registro-region'), 'Metropolitana');
    await userEvent.type(screen.getByTestId('input-registro-telefono'), '+56912345678');
    await userEvent.type(screen.getByTestId('input-registro-correo-empresa'), 'corp@test.com');
    await userEvent.click(screen.getByTestId('button-registro-crear-cuenta'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/empresas', expect.objectContaining({
        usuario: expect.objectContaining({ nombre_usuario: 'newuser' }),
        empresa: expect.objectContaining({ nombre: 'Test Corp' }),
      }));
      expect(toast.success).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('renders link to login', () => {
    renderRegister();
    expect(screen.getByTestId('link-login')).toHaveAttribute('href', '/login');
  });
});
