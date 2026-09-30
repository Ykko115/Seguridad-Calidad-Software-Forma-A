// Pruebas de INTEGRACIÓN frontend — Tipo 3.2.1 Pruebas funcionales.
// Formularios (Login, Registro, Cliente, Contrato), listados y navegación,
// con App/AuthProvider/axios/localStorage/Toaster REALES y red MSW.
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  setupMsw,
  renderApp,
  captureUploads,
  makeToken,
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

describe('Integración frontend [3.2.1] Pruebas funcionales', () => {
  test('F-01: login con credenciales válidas navega a /home y muestra métricas', async () => {
    renderApp('/login', { token: null, role: null });

    fireEvent.change(screen.getByTestId('input-nombre-usuario'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'admin' },
    });
    fireEvent.click(screen.getByTestId('button-login'));

    expect(await screen.findByText('Sesión iniciada')).toBeInTheDocument();
    expect(await screen.findByText('Usuarios de la Empresa')).toBeInTheDocument();
    expect(screen.getByText('Clientes Creados')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe(makeToken());
  });

  test('F-02: registro en 2 pasos crea la cuenta y navega a /login', async () => {
    renderApp('/registro', { token: null, role: null });

    fireEvent.change(screen.getByTestId('input-registro-nombre-usuario'), {
      target: { value: 'pepe' },
    });
    fireEvent.change(screen.getByTestId('input-registro-correo'), {
      target: { value: 'p@e.com' },
    });
    fireEvent.change(screen.getByTestId('input-registro-password'), {
      target: { value: 'clave' },
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

    expect(
      await screen.findByText('Cuenta creada exitosamente, ahora inicia sesión')
    ).toBeInTheDocument();
    expect(await screen.findByText('Iniciar Sesión')).toBeInTheDocument();
    expect(db.usuarios.some((u) => u.nombre_usuario === 'pepe')).toBe(true);
  });

  test('F-03: crear cliente desde la pestaña y verlo en el listado', async () => {
    const { container } = renderApp('/clientes');

    await waitFor(
      () => {
        expect(screen.getByText('ACME')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Crear Cliente' }));
    expect(screen.getByText('Crear nuevo cliente')).toBeInTheDocument();

    fireEvent.change(container.querySelector('#nombre-cliente-create'), {
      target: { value: 'Nuevo SA' },
    });
    fireEvent.change(container.querySelector('#correo-cliente-create'), {
      target: { value: 'nuevo@sa.cl' },
    });
    fireEvent.click(container.querySelector('#crear-cliente-create'));

    expect(await screen.findByText('Cliente creado')).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText('Nuevo SA')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(db.clientes).toHaveLength(2);
  });

  test('F-04: crear contrato con archivo y verlo en el listado', async () => {
    const uploads = captureUploads();
    try {
      const { container } = renderApp('/contratos');

      await waitFor(
        () => {
          expect(screen.getByText('Contrato Anual')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
      await userEvent.click(screen.getByRole('tab', { name: 'Crear Contrato' }));
      expect(screen.getByText('Crear nuevo contrato')).toBeInTheDocument();

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
      const file = new File(['%PDF-1.4 test'], 'contrato.pdf', {
        type: 'application/pdf',
      });
      await userEvent.upload(container.querySelector('input[type="file"]'), file);
      await userEvent.click(screen.getByRole('button', { name: 'Crear Contrato' }));

      expect(await screen.findByText('Contrato creado')).toBeInTheDocument();
      await waitFor(
        () => {
          expect(screen.getByText('Contrato B')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const sent = uploads.get();
      expect(sent.fields.titulo).toBe('Contrato B');
      expect(sent.fields.cliente_id).toBe('1');
      expect(sent.files.file.filename).toBe('contrato.pdf');
      expect(sent.files.file.size).toBeGreaterThan(0);
      const created = db.contratos.find((c) => c.titulo === 'Contrato B');
      expect(created.tieneArchivo).toBe(true);
    } finally {
      uploads.restore();
    }
  });

  test('F-05: navegación entre Inicio, Clientes y Contratos desde el menú', async () => {
    renderApp('/home');

    await waitFor(
      () => {
        expect(screen.getByText('Usuarios de la Empresa')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    await userEvent.click(screen.getByText('Clientes'));
    await waitFor(
      () => {
        expect(screen.getByText('ACME')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    await userEvent.click(screen.getByText('Contratos'));
    await waitFor(
      () => {
        expect(screen.getByText('Contrato Anual')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
