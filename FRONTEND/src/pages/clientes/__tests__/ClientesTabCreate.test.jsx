import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientesTabCreate from '../ClientesTabCreate';

let mockRole = 'administrador';

jest.mock('../../../lib/api', () => ({
  api: { post: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderTab(props = {}) {
  return render(
    <ClientesTabCreate onSuccess={jest.fn()} onLoad={jest.fn()} {...props} />
  );
}

describe('ClientesTabCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'administrador';
  });

  test('renders create client form', () => {
    renderTab();
    expect(screen.getByText('Crear nuevo cliente')).toBeInTheDocument();
    expect(screen.getByText('1. Información del cliente')).toBeInTheDocument();
    expect(screen.getByText('2. Información del representante del cliente')).toBeInTheDocument();
    expect(screen.getByText('3. Información de contacto')).toBeInTheDocument();
    expect(screen.getByText('4. Información financiera')).toBeInTheDocument();
    expect(screen.getByText('Crear Cliente')).toBeInTheDocument();
  });

  test('does not call api for non-admin', async () => {
    const { api } = require('../../../lib/api');
    mockRole = 'editor';
    const { container } = renderTab();

    await userEvent.type(container.querySelector('#nombre-cliente-create'), 'Juan');
    await userEvent.click(screen.getByText('Crear Cliente'));

    expect(api.post).not.toHaveBeenCalled();
  });

  test('creates client and calls callbacks on submit', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    const onSuccess = jest.fn();
    const onLoad = jest.fn();
    api.post.mockResolvedValue({ data: { id: 1 } });

    const { container } = renderTab({ onSuccess, onLoad });
    const byId = (id) => container.querySelector(`#${id}`);
    const user = userEvent.setup();

    await user.type(byId('rut-cliente-create'), '12345678-9');
    await user.type(byId('nombre-cliente-create'), 'Juan Pérez');
    await user.type(byId('nombre-fantasia-cliente-create'), 'JP SA');
    await user.type(byId('giro-cliente-create'), 'Servicios');
    await user.type(byId('nombre-representante-cliente-create'), 'Ana');
    await user.type(byId('cargo-representante-cliente-create'), 'Gerente');
    await user.type(byId('correo-representante-cliente-create'), 'ana@test.com');
    await user.type(byId('telefono-representante-cliente-create'), '123');
    await user.type(byId('relacion-representante-cliente-create'), 'Socia');
    await user.type(byId('direccion-calle-cliente-create'), 'Av. Uno');
    await user.type(byId('direccion-numero-cliente-create'), '100');
    await user.type(byId('direccion-ciudad-cliente-create'), 'Santiago');
    await user.type(byId('direccion-region-cliente-create'), 'Metropolitana');
    await user.type(byId('sitio-web-cliente-create'), 'https://test.cl');
    await user.type(byId('telefono-corporativo-cliente-create'), '234');
    await user.type(byId('correo-cliente-create'), 'juan@test.com');
    await user.type(byId('telefono-cliente-create'), '345');
    await user.type(byId('dia-pago-cliente-create'), '15');
    await user.type(byId('nombre-banco-cliente-create'), 'BCI');
    await user.type(byId('numero-cuenta-cliente-create'), '12345');
    await user.type(byId('titular-cuenta-cliente-create'), 'Juan Pérez');

    await user.click(screen.getByText('Crear Cliente'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/clientes', expect.objectContaining({
        nombre: 'Juan Pérez',
        correo: 'juan@test.com',
        rut: '12345678-9',
        nombre_representante: 'Ana',
        nombre_banco: 'BCI',
      }));
      expect(toast.success).toHaveBeenCalledWith('Cliente creado');
      expect(onLoad).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});