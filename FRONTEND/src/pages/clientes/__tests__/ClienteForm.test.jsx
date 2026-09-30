import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClienteForm from '../ClienteForm';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

function renderClienteForm(route = '/clientes/crear') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/clientes/crear" element={<ClienteForm />} />
        <Route path="/clientes/:id/editar" element={<ClienteForm />} />
      </Routes>
    </MemoryRouter>
  );
}

async function selectOption(testId, optionText) {
  const input = screen.getByTestId(testId);
  const formControl = input.closest('.MuiFormControl-root') || input.parentElement.parentElement;
  const combobox = formControl.querySelector('[role="combobox"]');
  fireEvent.mouseDown(combobox);
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(listbox.querySelector(`[data-value="${optionText}"]`));
  await new Promise((r) => setTimeout(r, 400));
}

function fillField(testId, value) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

describe('ClienteForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders create form title', () => {
    renderClienteForm();
    expect(screen.getByText('Crear nuevo cliente')).toBeInTheDocument();
    expect(screen.getByTestId('button-cliente-guardar')).toHaveTextContent('Crear Cliente');
  });

  test('renders required fields', () => {
    renderClienteForm();
    expect(screen.getByTestId('input-cliente-nombre')).toBeInTheDocument();
    expect(screen.getByTestId('input-cliente-correo')).toBeInTheDocument();
    expect(screen.getByTestId('select-cliente-tipo')).toBeInTheDocument();
  });

  test('shows error toast when required fields missing', async () => {
    const { toast } = require('sonner');
    renderClienteForm();

    await userEvent.click(screen.getByTestId('button-cliente-guardar'));

    expect(toast.error).toHaveBeenCalledWith('Por favor completa los campos requeridos');
  });

  test('creates a client filling all sections on submit', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.post.mockResolvedValue({});

    renderClienteForm();

    await selectOption('select-cliente-tipo', 'empresa');

    fillField('input-cliente-rut', '12345678-9');
    fillField('input-cliente-nombre', 'Juan Pérez');
    fillField('input-cliente-nombre-fantasia', 'JP SA');
    fillField('input-cliente-giro', 'Servicios');
    fillField('input-cliente-nombre-representante', 'Ana');
    fillField('input-cliente-cargo-representante', 'Gerente');
    fillField('input-cliente-correo-representante', 'ana@test.com');
    fillField('input-cliente-telefono-representante', '123');
    fillField('input-cliente-relacion-representante', 'Socia');
    fillField('input-cliente-direccion-calle', 'Av. Uno');
    fillField('input-cliente-direccion-numero', '100');
    fillField('input-cliente-direccion-ciudad', 'Santiago');
    fillField('input-cliente-direccion-region', 'Metropolitana');
    fillField('input-cliente-sitio-web', 'https://test.cl');
    fillField('input-cliente-telefono-corporativo', '234');
    fillField('input-cliente-correo', 'juan@test.com');
    fillField('input-cliente-telefono', '345');

    await selectOption('select-cliente-metodo-pago', 'transferencia');
    fillField('input-cliente-dia-pago', '15');
    await selectOption('select-cliente-moneda', 'CLP');
    fillField('input-cliente-nombre-banco', 'BCI');
    fillField('input-cliente-numero-cuenta', '12345');
    fillField('input-cliente-titular-cuenta', 'Juan Pérez');

    fireEvent.click(screen.getByTestId('button-cliente-guardar'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/clientes', expect.objectContaining({
        nombre: 'Juan Pérez',
        correo: 'juan@test.com',
        rut: '12345678-9',
        es_empresa: true,
        nombre_representante: 'Ana',
        direccion_region: 'Metropolitana',
        metodo_pago: 'transferencia',
        moneda: 'CLP',
        nombre_banco: 'BCI',
      }));
      expect(toast.success).toHaveBeenCalledWith('Cliente creado');
      expect(mockNavigate).toHaveBeenCalledWith('/clientes');
    });
  });

  test('navigates back on cancel', async () => {
    renderClienteForm();
    await userEvent.click(screen.getByTestId('button-cliente-cancelar'));
    expect(mockNavigate).toHaveBeenCalledWith('/clientes');
  });

  test('shows edit title when editing', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: { nombre: 'Editado SA', correo: 'edit@test.com' } });
    renderClienteForm('/clientes/5/editar');

    await waitFor(() => {
      expect(screen.getByText('Editar cliente')).toBeInTheDocument();
    });
    expect(screen.getByTestId('button-cliente-guardar')).toHaveTextContent('Actualizar Cliente');
  });

  test('loads client data when editing', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({
      data: { nombre: 'Editado SA', correo: 'edit@test.com', nombre_representante: 'Ana' },
    });

    renderClienteForm('/clientes/5/editar');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/clientes/5');
    });

    await waitFor(() => {
      expect(screen.getByTestId('input-cliente-nombre')).toHaveValue('Editado SA');
      expect(screen.getByTestId('input-cliente-correo')).toHaveValue('edit@test.com');
      expect(screen.getByTestId('input-cliente-nombre-representante')).toHaveValue('Ana');
    });
  });

  test('shows error toast when loading client fails', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockRejectedValue(new Error('fail'));
    renderClienteForm('/clientes/5/editar');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al cargar cliente');
    });
  });

  test('updates client on edit submit', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({
      data: { nombre: 'Editado SA', correo: 'edit@test.com', nombre_representante: 'Ana' },
    });
    api.put.mockResolvedValue({});
    const user = userEvent.setup();

    renderClienteForm('/clientes/5/editar');

    await waitFor(() => {
      expect(screen.getByText('Editar cliente')).toBeInTheDocument();
    });

    await user.clear(screen.getByTestId('input-cliente-correo'));
    await user.type(screen.getByTestId('input-cliente-correo'), 'nuevo@test.com');
    await user.click(screen.getByTestId('button-cliente-guardar'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/clientes/5', expect.objectContaining({
        nombre: 'Editado SA',
        correo: 'nuevo@test.com',
      }));
      expect(toast.success).toHaveBeenCalledWith('Cliente actualizado');
      expect(mockNavigate).toHaveBeenCalledWith('/clientes');
    });
  });
});