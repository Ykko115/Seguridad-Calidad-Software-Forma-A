// Pruebas de INTEGRACIÓN frontend — Tipo 3.2.6 Pruebas no funcionales.
// Manejo de errores de la API (500), estados de carga y notificaciones
// de éxito/error, con UI y red REALES (MSW).
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupMsw, renderApp } from './helpers';
import { server } from '../../test/integrationServer';

setupMsw();

describe('Integración frontend [3.2.6] Pruebas no funcionales', () => {
  test('N-01: error 500 en login muestra notificación y no navega', async () => {
    server.use(
      http.post('*/autenticacion/login', () =>
        HttpResponse.json(
          { error: 'Error en login', glosa: 'DB caída' },
          { status: 500 }
        )
      )
    );
    renderApp('/login', { token: null, role: null });

    fireEvent.change(screen.getByTestId('input-nombre-usuario'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'admin' },
    });
    fireEvent.click(screen.getByTestId('button-login'));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('N-02: error 500 en GET /clientes no rompe la interfaz', async () => {
    // El 500 es intencional: se silencia el console.error que el
    // componente emite en su catch para no ensuciar la salida.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      server.use(
        http.get('*/clientes', () =>
          HttpResponse.json(
            { error: 'Error al listar clientes', glosa: 'DB caída' },
            { status: 500 }
          )
        )
      );
      renderApp('/clientes');

      await waitFor(
        () => {
          expect(screen.queryByText('ACME')).not.toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      expect(screen.getByRole('tab', { name: 'Listar Clientes' })).toBeInTheDocument();
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('N-03: Home muestra estado de carga antes de las métricas', async () => {
    renderApp('/home');

    expect(screen.getByText('Cargando métricas...')).toBeInTheDocument();
    expect(await screen.findByText('Usuarios de la Empresa')).toBeInTheDocument();
  });

  test('N-04: eliminar contrato muestra notificación de éxito', async () => {
    renderApp('/contratos');

    await waitFor(
      () => {
        expect(screen.getByText('Contrato Anual')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    await userEvent.click(screen.getByTestId('button-contrato-eliminar-1'));
    fireEvent.click(screen.getByTestId('button-contrato-eliminar-confirmar'));

    expect(await screen.findByText('Contrato eliminado')).toBeInTheDocument();
  });
});
