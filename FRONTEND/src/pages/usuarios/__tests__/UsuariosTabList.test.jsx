import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UsuariosTabList from '../UsuariosTabList';

const mockNavigate = jest.fn();
let mockRole = 'administrador';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

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

const items = [
  { id: 1, nombre_usuario: 'admin', correo: 'admin@test.com', rol: 'administrador', created_at: '2024-01-01' },
  { id: 2, nombre_usuario: 'ana', correo: 'editor@test.com', rol_nombre: 'editor', created_at: null },
];

function renderTab(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/usuarios']}>
      <UsuariosTabList items={items} onDelete={jest.fn()} onLoad={jest.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('UsuariosTabList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'administrador';
  });

  test('renders user names, emails and roles', () => {
    renderTab();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('ana')).toBeInTheDocument();
    expect(screen.getByText('editor@test.com')).toBeInTheDocument();
    expect(screen.getByText('administrador')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
  });

  test('renders N/A for missing creation date', () => {
    renderTab();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  test('renders edit/delete buttons for admin', () => {
    renderTab();
    expect(screen.getByTestId('button-usuario-editar-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-usuario-eliminar-2')).toBeInTheDocument();
  });

  test('shows "Solo lectura" for non-admin', () => {
    mockRole = 'editor';
    renderTab();
    expect(screen.getAllByText('Solo lectura').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('button-usuario-eliminar-1')).not.toBeInTheDocument();
  });

  test('navigates to edit page on edit click', async () => {
    renderTab();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('button-usuario-editar-2'));
    expect(mockNavigate).toHaveBeenCalledWith('/usuarios/2/editar');
  });

  test('opens delete dialog and confirms deletion', async () => {
    const onDelete = jest.fn();
    renderTab({ onDelete });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('button-usuario-eliminar-1'));

    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-usuario-eliminar-confirmar'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  test('cancels delete dialog', async () => {
    const onDelete = jest.fn();
    renderTab({ onDelete });
    const user = userEvent.setup();
    await user.click(screen.getByTestId('button-usuario-eliminar-2'));

    fireEvent.click(screen.getByTestId('button-usuario-eliminar-cancelar'));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
