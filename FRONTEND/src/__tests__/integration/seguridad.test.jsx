// Pruebas de INTEGRACIÓN frontend — Tipo 3.2.2 Pruebas de seguridad.
// Accesos no autorizados, redirección a /login y bloqueo de RoleGuard,
// con App/AuthProvider/axios/localStorage/Toaster REALES y red MSW.
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { setupMsw, renderApp } from './helpers';

setupMsw();

describe('Integración frontend [3.2.2] Pruebas de seguridad', () => {
  test('S-01: sin token, /home redirige a /login', async () => {
    renderApp('/home', { token: null, role: null });

    expect(await screen.findByText('Iniciar Sesión')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('S-02: login con credenciales inválidas no inicia sesión', async () => {
    renderApp('/login', { token: null, role: null });

    fireEvent.change(screen.getByTestId('input-nombre-usuario'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'incorrecta' },
    });
    fireEvent.click(screen.getByTestId('button-login'));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('S-03: RoleGuard bloquea /clientes/nuevo para rol editor', async () => {
    renderApp('/clientes/nuevo', { role: 'editor' });

    expect(
      await screen.findByText('No autorizado (solo administrador).')
    ).toBeInTheDocument();
  });

  test('S-04: API protegida con token inválido no entrega datos', async () => {
    renderApp('/clientes', { token: 'Bearer invalido' });

    await waitFor(
      () => {
        expect(screen.queryByText('ACME')).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
