import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PageHeader from '../PageHeader';

describe('PageHeader', () => {
  test('renders the title', () => {
    render(<PageHeader title="Mi Título" />);
    expect(screen.getByText('Mi Título')).toBeInTheDocument();
  });

  test('renders actions when provided', () => {
    render(
      <PageHeader
        title="Título"
        actions={<button data-testid="action-btn">Acción</button>}
      />
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  test('renders without actions', () => {
    render(<PageHeader title="Sin acciones" />);
    expect(screen.getByText('Sin acciones')).toBeInTheDocument();
  });
});
