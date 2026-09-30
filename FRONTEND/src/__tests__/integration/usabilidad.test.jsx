// Pruebas de INTEGRACIÓN frontend — Tipo 3.2.5 Pruebas de usabilidad.
// Validación de campos obligatorios, mensajes de error, navegación de
// cancelar/volver y diálogos de confirmación, con UI y red REALES (MSW).
import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupMsw, renderApp } from './helpers';
import { db } from '../../test/integrationServer';

setupMsw();

describe('Integración frontend [3.2.5] Pruebas de usabilidad', () => {
  test('U-01: ClienteForm vacío muestra error y no envía nada', async () => {
    renderApp('/clientes/nuevo');

    expect(await screen.findByTestId('button-cliente-guardar')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-cliente-guardar'));

    expect(
      await screen.findByText('Por favor completa los campos requeridos')
    ).toBeInTheDocument();
    expect(db.clientes).toHaveLength(1);
  });

  test('U-02: ContratoForm vacío muestra error y no envía nada', async () => {
    renderApp('/contratos/nuevo');

    expect(await screen.findByTestId('button-contrato-guardar')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-contrato-guardar'));

    expect(
      await screen.findByText('Por favor completa los campos requeridos')
    ).toBeInTheDocument();
    expect(db.contratos).toHaveLength(1);
  });

  test('U-03: Cancelar en ClienteForm vuelve al listado', async () => {
    renderApp('/clientes/nuevo');

    expect(await screen.findByTestId('button-cliente-cancelar')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-cliente-cancelar'));

    await waitFor(
      () => {
        expect(screen.getByText('ACME')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  test('U-04: cancelar el diálogo de eliminar no borra el contrato', async () => {
    renderApp('/contratos');

    await waitFor(
      () => {
        expect(screen.getByText('Contrato Anual')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
    await userEvent.click(screen.getByTestId('button-contrato-eliminar-1'));
    expect(
      await screen.findByText(/¿Estás seguro de que deseas eliminar el contrato/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('button-contrato-eliminar-cancelar'));

    await new Promise((r) => setTimeout(r, 800));
    expect(screen.getByText('Contrato Anual')).toBeInTheDocument();
    expect(db.contratos).toHaveLength(1);
    expect(screen.queryByText('Contrato eliminado')).not.toBeInTheDocument();
  });
});
