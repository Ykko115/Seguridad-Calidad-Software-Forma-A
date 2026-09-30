import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuditoriaList from '../AuditoriaList';

jest.mock('../../../lib/api', () => ({
  api: { get: jest.fn() },
  setAuthToken: jest.fn(),
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

const logs = [
  { id: 1, accion: 'LOGIN: usuario inició sesión', usuario_id: 'admin', fecha_hora: '2024-01-01T10:00:00.000Z' },
  { id: 2, accion: 'CLIENTES_CREAR: creó cliente ACME', usuario_id: 'editor', fecha_hora: '2024-01-02T10:00:00.000Z' },
];

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/auditoria']}>
      <AuditoriaList />
    </MemoryRouter>
  );
}

describe('AuditoriaList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders audit title and description', () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderList();

    expect(screen.getByText('Auditoría')).toBeInTheDocument();
    expect(screen.getByText(/Historial completo/)).toBeInTheDocument();
  });

  test('calls GET /auditoria on mount', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auditoria');
    });
  });

  test('loads and displays log rows', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: logs });
    renderList();

    await waitFor(() => {
      expect(screen.getByText('LOGIN: usuario inició sesión')).toBeInTheDocument();
    });
    expect(screen.getByText('CLIENTES_CREAR: creó cliente ACME')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  test('renders empty table when no logs', async () => {
    const { api } = require('../../../lib/api');
    api.get.mockResolvedValue({ data: [] });
    renderList();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auditoria');
    });
    expect(screen.getByTestId('mock-table')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-row-0')).not.toBeInTheDocument();
  });
});
