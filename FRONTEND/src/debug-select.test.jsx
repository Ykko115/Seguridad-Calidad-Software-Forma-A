import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ContratoForm from './pages/contratos/ContratoForm.jsx';

jest.mock('./lib/api', () => ({
  api: { get: jest.fn().mockResolvedValue({ data: [{ id: 1, nombre: 'Cliente A' }] }), post: jest.fn(), put: jest.fn() },
  setAuthToken: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

test('debug select', async () => {
  render(
    <MemoryRouter initialEntries={['/contratos/crear']}>
      <Routes><Route path="/contratos/crear" element={<ContratoForm />} /></Routes>
    </MemoryRouter>
  );
  await waitFor(() => expect(screen.getByTestId('select-contrato-cliente')).toBeInTheDocument());
  fireEvent.mouseDown(screen.getByTestId('select-contrato-cliente'));
  console.log('LISTBOX?', document.body.innerHTML.includes('listbox'));
  console.log('MENU-ITEM?', document.body.innerHTML.includes('MuiMenuItem'));
  console.log('CLIENTE-A?', document.body.innerHTML.includes('Cliente A'));
});
