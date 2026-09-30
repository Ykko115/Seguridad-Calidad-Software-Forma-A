import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { AuthContext } from '../context/authContextInstance';

const theme = createTheme();

const defaultAuthValue = {
  token: 'fake-jwt-token',
  user: { nombre_usuario: 'admin', empresaId: 1, usuarioId: 1 },
  role: 'administrador',
  setRole: jest.fn(),
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

export function renderWithRouter(ui, { route = '/', initialEntries = [route] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MemoryRouter>
  );
}

export function renderWithAuth(ui, { authValue = {}, route = '/', initialEntries } = {}) {
  const merged = { ...defaultAuthValue, ...authValue };
  return render(
    <AuthContext.Provider value={merged}>
      <MemoryRouter initialEntries={initialEntries || [route]}>
        <ThemeProvider theme={theme}>{ui}</ThemeProvider>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

export function renderFull(ui, { route = '/', authValue = {} } = {}) {
  const merged = { ...defaultAuthValue, ...authValue };
  return render(
    <AuthContext.Provider value={merged}>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider theme={theme}>{ui}</ThemeProvider>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
