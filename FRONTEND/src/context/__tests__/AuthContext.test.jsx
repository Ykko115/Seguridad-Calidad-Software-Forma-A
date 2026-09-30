import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AuthProvider from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../lib/api', () => ({
  api: {
    post: jest.fn(),
  },
  setAuthToken: jest.fn(),
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(() => ({
    nombre_usuario: 'admin',
    role: 'administrador',
    empresaId: 1,
  })),
}));

function TestComponent() {
  const { token, user, role, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token || 'null'}</span>
      <span data-testid="user">{user ? user.nombre_usuario : 'null'}</span>
      <span data-testid="role">{role}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button data-testid="btn-login" onClick={() => login({ nombre_usuario: 'admin', password: 'admin123' })}>Login</button>
      <button data-testid="btn-logout" onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('initializes with no token from localStorage', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('initializes with existing localStorage data', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('user', JSON.stringify({ nombre_usuario: 'admin' }));
    localStorage.setItem('role', 'editor');
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId('token')).toHaveTextContent('existing-token');
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
  });

  test('login stores token and user in localStorage', async () => {
    const { api } = require('../../lib/api');
    api.post.mockResolvedValue({ data: { token: 'new-jwt-token' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    expect(localStorage.getItem('token')).toBe('new-jwt-token');
    expect(localStorage.getItem('user')).toBeTruthy();
  });

  test('logout clears token and user from localStorage', async () => {
    localStorage.setItem('token', 'token-to-clear');
    localStorage.setItem('user', JSON.stringify({ nombre_usuario: 'test' }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
