import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ContratosTabList from '../ContratosTabList';

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
  MaterialReactTable: ({ columns, data, muiTableBodyRowProps }) => (
    <div data-testid="mock-table">
      {data.map((item, i) => {
        const row = { original: item };
        const rowProps = typeof muiTableBodyRowProps === 'function' ? muiTableBodyRowProps(row) || {} : {};
        return (
          <div key={i} data-testid={`mock-row-${i}`} onClick={rowProps.onClick}>
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
    titulo: 'Contrato Alpha',
    cliente_nombre: 'Cliente Uno',
    fecha_inicio: '2025-01-01',
    fecha_fin: '2026-06-30',
    estado: 'activo',
    archivo: 'file1.pdf',
  },
  {
    id: 2,
    titulo: 'Contrato Beta',
    cliente_nombre: 'Cliente Dos',
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-02-01',
    estado: 'por_vencer',
  },
];

function renderTab(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/contratos']}>
      <ContratosTabList
        items={items}
        onDelete={jest.fn()}
        onLoad={jest.fn()}
        loading={false}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('ContratosTabList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'administrador';
  });

  test('renders contract titles and client names', () => {
    renderTab();
    expect(screen.getByText('Contratos registrados')).toBeInTheDocument();
    expect(screen.getByText('Contrato Alpha')).toBeInTheDocument();
    expect(screen.getByText('Contrato Beta')).toBeInTheDocument();
    expect(screen.getByText('Cliente Uno')).toBeInTheDocument();
    expect(screen.getByText('Cliente Dos')).toBeInTheDocument();
  });

  test('renders delete/edit buttons for admin', () => {
    renderTab();
    expect(screen.getByTestId('button-contrato-editar-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-contrato-eliminar-1')).toBeInTheDocument();
    expect(screen.getByTestId('button-contrato-editar-2')).toBeInTheDocument();
  });

  test('shows "Solo lectura" for non-admin', () => {
    mockRole = 'editor';
    renderTab();
    expect(screen.getAllByText('Solo lectura').length).toBeGreaterThan(0);
  });

  test('navigates to edit page on edit click', async () => {
    renderTab();
    const editButton = screen.getByTestId('button-contrato-editar-1');
    const user = userEvent.setup();
    await user.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith('/contratos/1/editar');
  });

  test('opens delete dialog and confirms deletion', async () => {
    const onDelete = jest.fn();
    renderTab({ onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('button-contrato-eliminar-1'));
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
    const matches = screen.getAllByText('Contrato Alpha');
    expect(matches.length).toBeGreaterThan(0);

    await user.click(screen.getByTestId('button-contrato-eliminar-confirmar'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  test('cancels delete dialog', async () => {
    const onDelete = jest.fn();
    renderTab({ onDelete });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('button-contrato-eliminar-2'));
    await user.click(screen.getByTestId('button-contrato-eliminar-cancelar'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  test('navigates to detail on row click', async () => {
    renderTab();
    const user = userEvent.setup();
    await user.click(screen.getByTestId('mock-row-0'));
    expect(mockNavigate).toHaveBeenCalledWith('/contratos/1');
  });

  test('shows loading overlay when loading', () => {
    renderTab({ loading: true });
    expect(screen.getByText('Cargando contratos...')).toBeInTheDocument();
  });

  test('renders archivo link with api url', () => {
    renderTab();
    const links = screen.getAllByRole('link', { name: /Ver archivo/i });
    expect(links[0]).toHaveAttribute('href', 'http://localhost:4450/contratos/1/file');
  });
});