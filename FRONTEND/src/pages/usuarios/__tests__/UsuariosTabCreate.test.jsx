import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsuariosTabCreate from '../UsuariosTabCreate';

jest.mock('../../../lib/api', () => ({
  api: { post: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderTab(props = {}) {
  return render(
    <UsuariosTabCreate onSuccess={jest.fn()} onLoad={jest.fn()} {...props} />
  );
}

async function selectRole(value) {
  const combo = screen.getByRole('combobox', { name: /rol/i });
  fireEvent.mouseDown(combo);
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(listbox.querySelector(`[data-value="${value}"]`));
  await new Promise((r) => setTimeout(r, 400));
}

describe('UsuariosTabCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders create user form', () => {
    renderTab();
    expect(screen.getByText('Crear nuevo usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear Usuario' })).toBeInTheDocument();
  });

  test('creates user and calls callbacks on submit', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    const onSuccess = jest.fn();
    const onLoad = jest.fn();
    api.post.mockResolvedValue({ data: { id: 3 } });

    renderTab({ onSuccess, onLoad });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo');
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave123');
    await selectRole(2);
    await user.click(screen.getByRole('button', { name: 'Crear Usuario' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/empresa-usuarios', {
        nombre_usuario: 'nuevo',
        correo: 'nuevo@test.com',
        contrasena_hash: 'clave123',
        rol_id: 2,
      });
      expect(toast.success).toHaveBeenCalledWith('Usuario creado');
      expect(onLoad).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test('defaults role to administrador', () => {
    renderTab();
    expect(screen.getByRole('combobox', { name: /rol/i })).toHaveTextContent(
      'Administrador'
    );
  });
});
