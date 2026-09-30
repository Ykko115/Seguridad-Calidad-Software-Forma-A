import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EmpresaForm from '../EmpresaForm';

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

function renderEmpresaForm(route = '/empresas/5/editar') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/empresas/:id/editar" element={<EmpresaForm />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EmpresaForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders edit form title and fields', () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: {} });
    renderEmpresaForm();

    expect(screen.getByText('Editar Empresa')).toBeInTheDocument();
    expect(screen.getByTestId('input-empresa-nombre')).toBeInTheDocument();
    expect(screen.getByTestId('input-empresa-direccion')).toBeInTheDocument();
    expect(screen.getByTestId('input-empresa-telefono')).toBeInTheDocument();
    expect(screen.getByTestId('input-empresa-correo')).toBeInTheDocument();
  });

  test('loads empresa data on mount', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({
      data: { nombre: 'ACME', direccion: 'Av 1', telefono: '123', correo: 'a@b.com' },
    });
    renderEmpresaForm();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/empresas/5');
    });
    await waitFor(() => {
      expect(screen.getByTestId('input-empresa-nombre')).toHaveValue('ACME');
      expect(screen.getByTestId('input-empresa-correo')).toHaveValue('a@b.com');
    });
  });

  test('shows error toast when fields missing', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: { nombre: '', direccion: '', telefono: '', correo: '' } });
    renderEmpresaForm();

    await waitFor(() => {
      expect(screen.getByTestId('button-empresa-guardar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('button-empresa-guardar'));
    expect(toast.error).toHaveBeenCalledWith('Por favor completa todos los campos');
    expect(api.put).not.toHaveBeenCalled();
  });

  test('updates empresa on submit', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({
      data: { nombre: 'ACME', direccion: 'Av 1', telefono: '123', correo: 'a@b.com' },
    });
    api.put.mockResolvedValue({});
    renderEmpresaForm();

    await waitFor(() => {
      expect(screen.getByTestId('input-empresa-nombre')).toHaveValue('ACME');
    });

    await userEvent.clear(screen.getByTestId('input-empresa-nombre'));
    await userEvent.type(screen.getByTestId('input-empresa-nombre'), 'ACME 2');
    await userEvent.clear(screen.getByTestId('input-empresa-direccion'));
    await userEvent.type(screen.getByTestId('input-empresa-direccion'), 'Av 2');
    await userEvent.clear(screen.getByTestId('input-empresa-telefono'));
    await userEvent.type(screen.getByTestId('input-empresa-telefono'), '999');
    await userEvent.clear(screen.getByTestId('input-empresa-correo'));
    await userEvent.type(screen.getByTestId('input-empresa-correo'), 'nuevo@b.com');
    await userEvent.click(screen.getByTestId('button-empresa-guardar'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/empresas/5', {
        nombre: 'ACME 2',
        direccion: 'Av 2',
        telefono: '999',
        correo: 'nuevo@b.com',
      });
      expect(toast.success).toHaveBeenCalledWith('Información de la empresa actualizada');
    });
  });

  test('shows error toast when loading empresa fails', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockRejectedValue(new Error('fail'));
    renderEmpresaForm();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al cargar empresa');
    });
  });

  test('navigates back on volver and cancelar', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: {} });
    renderEmpresaForm();

    await userEvent.click(screen.getByTestId('button-empresa-volver'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    await userEvent.click(screen.getByTestId('button-empresa-cancelar'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
