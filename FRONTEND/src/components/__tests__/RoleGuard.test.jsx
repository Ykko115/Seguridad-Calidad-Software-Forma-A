import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequireAuth, RequireAdmin } from '../RoleGuard';
import { AuthContext } from '../../context/authContextInstance';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, state }) => (
      <div data-testid="navigate" data-to={to}>
        {JSON.stringify(state)}
      </div>
    ),
  };
});

function renderWithAuth(ui, authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('RequireAuth', () => {
  test('redirects to /login when no token', () => {
    renderWithAuth(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>,
      { token: null }
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
  });

  test('renders children when token exists', () => {
    renderWithAuth(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>,
      { token: 'fake-token' }
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  test('shows unauthorized for non-admin role', () => {
    renderWithAuth(
      <RequireAdmin>
        <div>Admin Only</div>
      </RequireAdmin>,
      { role: 'editor' }
    );
    expect(screen.getByText(/No autorizado/)).toBeInTheDocument();
  });

  test('renders children for admin role', () => {
    renderWithAuth(
      <RequireAdmin>
        <div>Admin Only</div>
      </RequireAdmin>,
      { role: 'administrador' }
    );
    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });
});
