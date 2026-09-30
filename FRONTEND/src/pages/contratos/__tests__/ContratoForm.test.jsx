import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ContratoForm from '../ContratoForm';

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

function renderContratoForm(route = '/contratos/crear') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/contratos/crear" element={<ContratoForm />} />
        <Route path="/contratos/:id/editar" element={<ContratoForm />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ContratoForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders create form title', () => {
    renderContratoForm();
    expect(screen.getByText('Crear nuevo contrato')).toBeInTheDocument();
    expect(screen.getByTestId('button-contrato-guardar')).toHaveTextContent('Crear Contrato');
  });

  test('renders client selector with loaded clients', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({
      data: [{ id: 1, nombre: 'Cliente A' }, { id: 2, nombre: 'Cliente B' }],
    });
    renderContratoForm();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/clientes');
    });

    fireEvent.mouseDown(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Cliente A')).toBeInTheDocument();
      expect(screen.getByText('Cliente B')).toBeInTheDocument();
    });
  });

  test('shows error toast when required fields missing', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: [] });
    renderContratoForm();

    await userEvent.click(screen.getByTestId('button-contrato-guardar'));

    expect(toast.error).toHaveBeenCalledWith('Por favor completa los campos requeridos');
  });

  test('creates a contract on submit', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: [{ id: 1, nombre: 'Cliente A' }] });
    api.post.mockResolvedValue({});

    renderContratoForm();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByText('Cliente A'));

    await userEvent.type(screen.getByTestId('input-contrato-titulo'), 'Contrato Test');
    await userEvent.type(screen.getByTestId('input-contrato-fecha-inicio'), '2025-01-01');
    await userEvent.type(screen.getByTestId('input-contrato-fecha-fin'), '2025-12-31');
    await userEvent.click(screen.getByTestId('button-contrato-guardar'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/contratos', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(toast.success).toHaveBeenCalledWith('Contrato creado');
      expect(mockNavigate).toHaveBeenCalledWith('/contratos');
    });
  });

  test('loads contract data when editing', async () => {
    const { api } = require('../../../lib/api');
    api.get
      .mockResolvedValueOnce({ data: [{ id: 1, nombre: 'Cliente A' }] })
      .mockResolvedValueOnce({
        data: { cliente_id: 1, titulo: 'Contrato Edit', fecha_inicio: '2025-01-01', fecha_fin: '2025-12-31' },
      });

    renderContratoForm('/contratos/5/editar');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/contratos/5');
    });

    await waitFor(() => {
      expect(screen.getByTestId('input-contrato-titulo')).toHaveValue('Contrato Edit');
    });
  });

  test('navigates back on cancel', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderContratoForm();
    await userEvent.click(screen.getByTestId('button-contrato-cancelar'));
    expect(mockNavigate).toHaveBeenCalledWith('/contratos');
  });
});