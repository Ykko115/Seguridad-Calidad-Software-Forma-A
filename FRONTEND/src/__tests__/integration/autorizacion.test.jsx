// Pruebas de INTEGRACIÓN frontend — Tipo 3.2.3 Pruebas de autorización.
// El menú oculta opciones según rol y las rutas de administración quedan
// restringidas al rol administrador, con contexto y red REALES (MSW).
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthProvider from '../../context/AuthContext';
import ClientesTabCreate from '../../pages/clientes/ClientesTabCreate';
import { setupMsw, renderApp } from './helpers';
import { db } from '../../test/integrationServer';

setupMsw();

function renderTabCreate() {
  localStorage.setItem('role', 'editor');
  return (
    <MemoryRouter>
      <AuthProvider>
        <ClientesTabCreate onSuccess={() => {}} onLoad={() => {}} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Integración frontend [3.2.3] Pruebas de autorización', () => {
  test('A-01: el menú muestra Usuarios solo para administrador', async () => {
    const { unmount } = renderApp('/home', { role: 'administrador' });
    await waitFor(
      () => {
        expect(screen.getByText('Usuarios de la Empresa')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    unmount();

    renderApp('/home', { role: 'editor' });
    await waitFor(
      () => {
        expect(screen.getByText('Usuarios de la Empresa')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  test('A-02: la pestaña Crear Cliente solo existe para administrador', async () => {
    const { unmount } = renderApp('/clientes', { role: 'administrador' });
    await waitFor(
      () => {
        expect(screen.getByText('ACME')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(screen.getByRole('tab', { name: 'Crear Cliente' })).toBeInTheDocument();
    unmount();

    renderApp('/clientes', { role: 'editor' });
    await waitFor(
      () => {
        expect(screen.getByText('ACME')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    expect(screen.queryByRole('tab', { name: 'Crear Cliente' })).not.toBeInTheDocument();
  });

  test('A-03: editor no puede crear cliente (sin POST a la API)', async () => {
    const { container } = render(renderTabCreate());

    expect(await screen.findByText('Crear nuevo cliente')).toBeInTheDocument();
    fireEvent.change(container.querySelector('#nombre-cliente-create'), {
      target: { value: 'Intruso SA' },
    });
    fireEvent.change(container.querySelector('#correo-cliente-create'), {
      target: { value: 'x@x.cl' },
    });
    fireEvent.click(container.querySelector('#crear-cliente-create'));

    await new Promise((r) => setTimeout(r, 1000));
    expect(db.clientes).toHaveLength(1);
    expect(screen.queryByText('Cliente creado')).not.toBeInTheDocument();
  });

  test('A-04: rutas de administración bloqueadas para editor', async () => {
    const { unmount } = renderApp('/contratos/nuevo', { role: 'editor' });
    expect(
      await screen.findByText('No autorizado (solo administrador).')
    ).toBeInTheDocument();
    unmount();

    renderApp('/usuarios', { role: 'editor' });
    expect(
      await screen.findByText('No autorizado (solo administrador).')
    ).toBeInTheDocument();
  });
});
