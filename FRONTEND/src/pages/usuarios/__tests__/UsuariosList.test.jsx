import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UsuariosList from '../UsuariosList';

let mockRole = 'administrador';

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const usuarios = [
  { id: 1, nombre_usuario: 'admin', correo: 'admin@test.com', rol: 'administrador', created_at: '2024-01-01' },
  { id: 2, nombre_usuario: 'editor', correo: 'editor@test.com', rol: 'editor', created_at: '2024-02-01' },
];

jest.mock('material-react-table', () => ({
  MaterialReactTable: ({ columns, data }) => (
    <div data-testid="mock-table">
      {data.map((item, i) => {
        const row = { original: item };
        return (
          <div key={i} data-testid={`mock-row-${i}`}>
            {columns.map((col, j) => (
              <div key={j} data-testid={`mock-cell-${i}-${col.accessorKey || col.id || j}`}>
                {col.Cell ? col.Cell({ row }) : String(item[col.accessorKey])}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  ),
}));

jest.mock('material-react-table/locales/es', () => ({
  MRT_Localization_ES: {},
}));

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/usuarios']}>
      <UsuariosList />
    </MemoryRouter>
  );
}

describe('UsuariosList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'administrador';
  });

  test('renders management title and tabs', () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderList();

    expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Listar Usuarios' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Crear Usuario' })).toBeInTheDocument();
  });

  test('calls GET /empresa-usuarios on mount', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/empresa-usuarios');
    });
  });

  test('loads and displays users', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: usuarios });
    renderList();

    await waitFor(() => {
      expect(screen.getByText('editor@test.com')).toBeInTheDocument();
    });
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  test('hides create tab for non-admin', async () => {
    mockRole = 'editor';
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: usuarios });
    renderList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/empresa-usuarios');
    });
    expect(screen.getByRole('tab', { name: 'Listar Usuarios' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Crear Usuario' })).not.toBeInTheDocument();
  });

  test('shows create form when clicking create tab', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: usuarios });
    renderList();

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('tab', { name: 'Crear Usuario' }));
    expect(screen.getByText('Crear nuevo usuario')).toBeInTheDocument();
  });

  test('deletes user with confirmation and reloads', async () => {
    const { api } = require('../../../lib/api');
    const { toast } = require('sonner');
    api.get.mockResolvedValue({ data: usuarios });
    api.delete.mockResolvedValue({});
    renderList();

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTestId('button-usuario-eliminar-1'));
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-usuario-eliminar-confirmar'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/usuarios/1');
      expect(toast.success).toHaveBeenCalledWith('Usuario eliminado');
    });
    expect(api.get).toHaveBeenCalledWith('/empresa-usuarios');
  });
});
