// Helpers para las suites de INTEGRACIÓN del frontend (plan EP1, 3.2.x).
// Todo es REAL: App, AuthProvider, axios+interceptor, localStorage, Toaster.
// Solo la red HTTP es simulada por MSW con los contratos de la API real.
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import AuthProvider from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  server,
  resetDb,
  makeToken,
  setCapturedUpload,
} from '../../test/integrationServer';

export { makeToken };

export function setupMsw() {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    resetDb();
    localStorage.clear();
  });
  afterAll(() => server.close());
}

export function renderApp(
  route = '/home',
  { token = makeToken(), role = 'administrador', user = 'admin' } = {}
) {
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ nombre_usuario: user }));
  }
  if (role) localStorage.setItem('role', role);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

// Observa el FormData REAL que construyen los componentes (vía el
// transformRequest de axios) sin alterar la petición. El handler MSW lo
// usa para responder porque el puente XHR de jsdom no preserva los bytes
// multipart (limitación del entorno, documentada en el anexo).
export function captureUploads() {
  const original = api.defaults.transformRequest;
  const list = Array.isArray(original) ? [...original] : [original];
  let captured = null;
  const spy = (data) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      const fields = {};
      const files = {};
      for (const [k, v] of data.entries()) {
        if (typeof v === 'string') fields[k] = v;
        else files[k] = { filename: v.name, type: v.type, size: v.size };
      }
      captured = { fields, files };
      setCapturedUpload({ fields, files });
    }
    return data;
  };
  api.defaults.transformRequest = [...list, spy];
  return {
    get: () => captured,
    restore: () => {
      api.defaults.transformRequest = original;
    },
  };
}
