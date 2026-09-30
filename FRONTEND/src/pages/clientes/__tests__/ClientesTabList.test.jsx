import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ClientesTabList from '../ClientesTabList';

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
  {
    id: 1,
    nombre: 'Empresa Uno',
    correo: 'uno@test.com',
    telefono: '123',
    direccion: 'Calle 1',
  },
  {
    id: 2,
    nombre: 'Empresa Dos',
    correo: 'dos@test.com',
    telefono: '456',
    direccion: 'Calle 2',
  },
];

function renderTab(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/clientes']}>
      <ClientesTabList
        items={items}
        onDelete={jest.fn()}
        onLoad={jest.fn()}
        loading={false}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('ClientesTabList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'administrador';
  });

  test('renders client names and emails', () => {
    renderTab();
    expect(screen.getByText('Clientes registrados')).toBeInTheDocument();
    expect(screen.getByText('Empresa Uno')).toBeInTheDocument();
    expect(screen.getByText('Empresa Dos')).toBeInTheDocument();
    expect(screen.getByText('uno@test.com')).toBeInTheDocument();
    expect(screen.getByText('dos@test.com')).toBeInTheDocument();
  });

  test('renders edit/delete buttons for admin', () => {
    renderTab();
    expect(screen.getByTestId('button-cliente-editar-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-cliente-eliminar-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-cliente-editar-2')).toBeInTheDocument();
  });

  test('shows "Solo lectura" for non-admin', () => {
    mockRole = 'editor';
    renderTab();
    expect(screen.getAllByText('Solo lectura').length).toBeGreaterThan(0);
  });

  test('navigates to edit page on edit click', async () => {
    renderTab();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('button-cliente-editar-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/clientes/1/editar');
  });

  test('opens delete dialog and confirms deletion', async () => {
    const onDelete = jest.fn();
    renderTab({ onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('button-cliente-eliminar-1'));
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();

    await user.click(screen.getByTestId('button-cliente-eliminar-confirmar'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  test('cancels delete dialog', async () => {
    const onDelete = jest.fn();
    renderTab({ onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('button-cliente-eliminar-2'));
    await user.click(screen.getByTestId('button-cliente-eliminar-cancelar'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  test('shows loading overlay when loading', () => {
    renderTab({ loading: true });
    expect(screen.getByText('Cargando clientes...')).toBeInTheDocument();
  });
});