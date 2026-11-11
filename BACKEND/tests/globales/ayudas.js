// ============================================================================
// Utilidades compartidas por las pruebas globales (Encargo 3, Fase 1).
// La API es la del docker-compose (contenedor atlas-backend).
// ============================================================================
const API = process.env.GLOBALES_API_URL || "http://localhost:4450";

// Realiza una petición JSON y devuelve { status, datos }.
// datos es null si la respuesta no tiene cuerpo JSON.
async function pedir(method, ruta, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(API + ruta, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let datos = null;
  try {
    datos = await res.json();
  } catch {
    datos = null;
  }
  return { status: res.status, datos };
}

// Login y devuelve el token. Lanza error si el login falla.
async function obtenerToken(usuario = "admin", password = "admin") {
  const { status, datos } = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: usuario, password },
  });
  if (status !== 200 || !datos || !datos.token) {
    throw new Error(
      `Login de "${usuario}" falló (HTTP ${status}): ${JSON.stringify(datos)}`
    );
  }
  return datos.token;
}

module.exports = { API, pedir, obtenerToken };
