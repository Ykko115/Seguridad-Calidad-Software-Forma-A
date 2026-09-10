import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UsuarioForm from '../UsuarioForm';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn(), put: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderUsuarioForm(route = '/usuarios/1/editar') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/usuarios/:id/editar" element={<UsuarioForm />} />
      </Routes>
    </MemoryRouter>
  );
}

async function flushLoad() {
  await act(async () => {});
}

describe('UsuarioForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user info form', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: 'admin@test.com' } });
    renderUsuarioForm();

    await flushLoad();

    expect(screen.getByText('Editar Usuario')).toBeInTheDocument();
    expect(screen.getByTestId('input-usuario-nombre')).toBeInTheDocument();
    expect(screen.getByTestId('input-usuario-correo')).toBeInTheDocument();
    expect(screen.getByTestId('input-usuario-password')).toBeInTheDocument();
    expect(screen.getByTestId('input-usuario-confirmar-password')).toBeInTheDocument();
  });

  test('loads user data on mount', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: 'admin@test.com' } });
    renderUsuarioForm();

    await flushLoad();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/usuarios/1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('input-usuario-nombre')).toHaveValue('admin');
      expect(screen.getByTestId('input-usuario-correo')).toHaveValue('admin@test.com');
    });
  });

  test('shows error toast when correo empty', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: '' } });
    renderUsuarioForm();

    await flushLoad();

    await waitFor(() => {
      expect(screen.getByTestId('input-usuario-correo')).toHaveValue('');
    });

    await userEvent.click(screen.getByTestId('button-usuario-actualizar'));
    expect(toast.error).toHaveBeenCalledWith('Por favor completa el campo de correo');
  });

  test('updates user info', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: 'admin@test.com' } });
    api.put.mockResolvedValue({});
    renderUsuarioForm();

    await flushLoad();

    await waitFor(() => {
      expect(screen.getByTestId('input-usuario-correo')).toHaveValue('admin@test.com');
    });

    await userEvent.clear(screen.getByTestId('input-usuario-correo'));
    await userEvent.type(screen.getByTestId('input-usuario-correo'), 'nuevo@test.com');
    await userEvent.click(screen.getByTestId('button-usuario-actualizar'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/usuarios/1', { correo: 'nuevo@test.com' });
      expect(toast.success).toHaveBeenCalledWith('Información del usuario actualizada');
    });
  });

  test('shows error when passwords do not match', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: 'admin@test.com' } });
    renderUsuarioForm();

    await flushLoad();

    await waitFor(() => {
      expect(screen.getByTestId('input-usuario-password')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('input-usuario-password'), 'pass123');
    await userEvent.type(screen.getByTestId('input-usuario-confirmar-password'), 'pass456');
    await userEvent.click(screen.getByTestId('button-usuario-actualizar-password'));

    expect(toast.error).toHaveBeenCalledWith('Las contraseñas no coinciden');
  });

  test('updates password successfully', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: 'admin@test.com' } });
    api.put.mockResolvedValue({});
    renderUsuarioForm();

    await flushLoad();

    await waitFor(() => {
      expect(screen.getByTestId('input-usuario-password')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('input-usuario-password'), 'pass123');
    await userEvent.type(screen.getByTestId('input-usuario-confirmar-password'), 'pass123');
    await userEvent.click(screen.getByTestId('button-usuario-actualizar-password'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/usuarios/1', { contrasena_hash: 'pass123' });
      expect(toast.success).toHaveBeenCalledWith('Contraseña actualizada');
    });
  });

  test('navigates back to usuarios on volver', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: { nombre_usuario: 'admin', correo: 'admin@test.com' } });
    renderUsuarioForm();

    await flushLoad();

    await userEvent.click(screen.getByTestId('button-usuario-volver'));
    expect(mockNavigate).toHaveBeenCalledWith('/usuarios');
  });
});