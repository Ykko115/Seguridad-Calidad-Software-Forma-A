// Pruebas de INTEGRACIÓN frontend — Tipo 3.2.4 Pruebas de integración.
// Jornadas entre módulos que ejercitan AuthContext + localStorage +
// peticiones API + manejo de respuestas, con todo REAL salvo la red (MSW).
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  setupMsw,
  renderApp,
  captureUploads,
} from './helpers';
import { db } from '../../test/integrationServer';

setupMsw();

async function selectClientOption() {
  const combo = screen.getByRole('combobox', { name: /cliente/i });
  fireEvent.mouseDown(combo);
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(listbox.querySelector('[data-value="1"]'));
  await new Promise((r) => setTimeout(r, 400));
}

describe('Integración frontend [3.2.4] Pruebas de integración', () => {
  test('I-01: jornada autenticación (registro → login → home con sesión persistida)', async () => {
    renderApp('/registro', { token: null, role: null });

    fireEvent.change(screen.getByTestId('input-registro-nombre-usuario'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('input-registro-correo'), {
      target: { value: 'admin@test.com' },
    });
    fireEvent.change(screen.getByTestId('input-registro-password'), {
      target: { value: 'admin' },
    });
    fireEvent.click(screen.getByTestId('button-registro-continuar'));
    expect(await screen.findByText('Información de la Empresa')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('input-registro-nombre-empresa'), {
      target: { value: 'ACME' },
    });
    fireEvent.change(screen.getByTestId('input-registro-calle'), {
      target: { value: 'Av Uno' },
    });
    fireEvent.change(screen.getByTestId('input-registro-comuna'), {
      target: { value: 'Santiago' },
    });
    fireEvent.change(screen.getByTestId('input-registro-region'), {
      target: { value: 'RM' },
    });
    fireEvent.change(screen.getByTestId('input-registro-telefono'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByTestId('input-registro-correo-empresa'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByTestId('button-registro-crear-cuenta'));
    expect(await screen.findByText('Iniciar Sesión')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('input-nombre-usuario'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'admin' },
    });
    fireEvent.click(screen.getByTestId('button-login'));

    expect(await screen.findByText('Usuarios de la Empresa')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('user')).nombre_usuario).toBe('admin');
    expect(localStorage.getItem('role')).toBe('administrador');
  });

  test('I-02: jornada negocio (crear cliente → crear contrato → eliminar con confirmación)', async () => {
    const uploads = captureUploads();
    try {
      // 1) Crear cliente
      const clientes = renderApp('/clientes');
      await waitFor(
        () => {
          expect(screen.getByText('ACME')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      await userEvent.click(screen.getByRole('tab', { name: 'Crear Cliente' }));
      fireEvent.change(clientes.container.querySelector('#nombre-cliente-create'), {
        target: { value: 'Beta Ltda' },
      });
      fireEvent.change(clientes.container.querySelector('#correo-cliente-create'), {
        target: { value: 'beta@ltda.cl' },
      });
      fireEvent.click(clientes.container.querySelector('#crear-cliente-create'));
      expect(await screen.findByText('Cliente creado')).toBeInTheDocument();
      await waitFor(
        () => {
          expect(screen.getByText('Beta Ltda')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      clientes.unmount();

      // 2) Crear contrato para el cliente inicial
      const contratos = renderApp('/contratos');
      await waitFor(
        () => {
          expect(screen.getByText('Contrato Anual')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      await userEvent.click(screen.getByRole('tab', { name: 'Crear Contrato' }));
      await selectClientOption();
      fireEvent.change(screen.getByLabelText('Título'), {
        target: { value: 'Contrato B' },
      });
      fireEvent.change(screen.getByLabelText('Fecha inicio'), {
        target: { value: '2024-01-01' },
      });
      fireEvent.change(screen.getByLabelText('Fecha fin'), {
        target: { value: '2024-12-31' },
      });
      await userEvent.upload(
        contratos.container.querySelector('input[type="file"]'),
        new File(['%PDF-1.4 test'], 'contrato.pdf', { type: 'application/pdf' })
      );
      await userEvent.click(screen.getByRole('button', { name: 'Crear Contrato' }));
      expect(await screen.findByText('Contrato creado')).toBeInTheDocument();
      await waitFor(
        () => {
          expect(screen.getByText('Contrato B')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      expect(uploads.get().files.file.filename).toBe('contrato.pdf');

      // 3) Eliminar el contrato con confirmación y verificar auditoría
      await userEvent.click(screen.getByTestId('button-contrato-eliminar-1'));
      expect(
        await screen.findByText(/¿Estás seguro de que deseas eliminar el contrato/)
      ).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('button-contrato-eliminar-confirmar'));
      await waitFor(
        () => {
          expect(screen.queryByText('Contrato Anual')).not.toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      expect(db.contratos.find((c) => c.id === 1)).toBeUndefined();
      expect(
        db.auditoria.some((a) => a.accion.includes('CONTRATOS_ELIMINAR'))
      ).toBe(true);
    } finally {
      uploads.restore();
    }
  });

  test('I-03: logout limpia la sesión y protege las rutas', async () => {
    renderApp('/home');

    await waitFor(
      () => {
        expect(screen.getByText('Usuarios de la Empresa')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(localStorage.getItem('token')).toBeTruthy();

    fireEvent.click(screen.getByTestId('button-layout-logout'));

    await waitFor(
      () => {
        expect(localStorage.getItem('token')).toBeNull();
      },
      { timeout: 5000 }
    );
    expect(await screen.findByText('Iniciar Sesión')).toBeInTheDocument();
  });
});
