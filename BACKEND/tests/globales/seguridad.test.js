// ============================================================================
// Pruebas GLOBALES — Controles de seguridad de la API (PG-08..PG-12)
// Verifican los controles existentes y DOCUMENTAN los gaps hallados
// (no se corrige código: los gaps son hallazgos para el informe).
// Uso (desde BACKEND/): npm run test:globales
// ============================================================================
const jwt = require("jsonwebtoken");
const { pedir, obtenerToken } = require("./ayudas");

// Secreto real del backend en docker-compose (JWT_SECRET del compose)
const SECRETO_COMPOSE = "your-secret-key-change-in-production";

let tokenAdmin;
let tokenEditor;

beforeAll(async () => {
  tokenAdmin = await obtenerToken("admin", "admin");
  tokenEditor = await obtenerToken("editor", "editor");
});

// PG-08: Endpoints protegidos rechazan peticiones sin token
test("PG-08: sin token, los endpoints protegidos responden 401", async () => {
  const rutas = [
    ["GET", "/clientes"],
    ["GET", "/contratos"],
    ["GET", "/metricas"],
    ["POST", "/clientes"],
  ];

  for (const [method, ruta] of rutas) {
    const { status, datos } = await pedir(method, ruta, {
      body: method === "POST" ? {} : undefined,
    });
    expect({ ruta, status }).toEqual({ ruta, status: 401 });
    expect(datos.error).toBe("No autorizado");
  }
});

// PG-09: Tokens inválidos son rechazados
test("PG-09: token con secreto incorrecto o malformado responde 401", async () => {
  // Firmado con un secreto que no es el del backend
  const tokenFalso = jwt.sign(
    { usuarioId: "1", nombreUsuario: "admin", empresaId: "1" },
    "secreto-equivocado",
    { expiresIn: "2h" }
  );
  const conSecretoMalo = await pedir("GET", "/clientes", { token: tokenFalso });
  expect(conSecretoMalo.status).toBe(401);

  // Cadena que no es un JWT
  const basura = await pedir("GET", "/clientes", { token: "esto-no-es-un-jwt" });
  expect(basura.status).toBe(401);

  // JWT vencido (expirado hace 1 hora), firmado con el secreto correcto
  const vencido = jwt.sign(
    { usuarioId: "1", nombreUsuario: "admin", empresaId: "1" },
    SECRETO_COMPOSE,
    { expiresIn: "-1h" }
  );
  const tokenVencido = await pedir("GET", "/clientes", { token: vencido });
  expect(tokenVencido.status).toBe(401);
});

// PG-10: Credenciales incorrectas no otorgan token
test("PG-10: login con credenciales incorrectas responde 401", async () => {
  // Contraseña equiválida
  const passMala = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: "admin", password: "clave-mala" },
  });
  expect(passMala.status).toBe(401);
  expect(passMala.datos.error).toBe("Credenciales inválidas");

  // Usuario inexistente
  const usuarioMalo = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: "no-existe", password: "cualquiera" },
  });
  expect(usuarioMalo.status).toBe(401);
  expect(usuarioMalo.datos.error).toBe("Credenciales inválidas");

  // Ninguna respuesta entrega token
  expect(passMala.datos.token).toBeUndefined();
  expect(usuarioMalo.datos.token).toBeUndefined();
});

// PG-11: Token válido pero sin empresa asociada es rechazado
test("PG-11: token sin empresaId responde 401 en endpoints con aislamiento", async () => {
  const sinEmpresa = jwt.sign(
    { usuarioId: "1", nombreUsuario: "admin", empresaUsuarioId: "1" },
    SECRETO_COMPOSE,
    { expiresIn: "2h" }
  );

  const listado = await pedir("GET", "/clientes", { token: sinEmpresa });
  expect(listado.status).toBe(401);
  expect(listado.datos.glosa).toBe("Token inválido o sin empresa asociada");

  const creacion = await pedir("POST", "/clientes", {
    token: sinEmpresa,
    body: { nombre: "No Debe Crearse", correo: "nadie@atlasfake.com" },
  });
  expect(creacion.status).toBe(401);
});

// PG-12: GAPS DE SEGURIDAD DOCUMENTADOS (hallazgos para el informe)
// Estos tests fijan el comportamiento ACTUAL de la aplicación a propósito:
// si en el futuro se corrigen los hallazgos, estos tests fallarán y deberán
// actualizarse a 401/403. NO se corrige código en este encargo.
test("PG-12: gaps de autorización documentados (sin token y sin validación de rol)", async () => {
  // GAP 1: GET /contratos/:id no valida token (lee cualquier contrato)
  const contratoSinToken = await pedir("GET", "/contratos/1");
  expect(contratoSinToken.status).toBe(200);

  // GAP 2: GET /auditoria no valida token (expone el log de auditoría)
  const auditoriaSinToken = await pedir("GET", "/auditoria");
  expect(auditoriaSinToken.status).toBe(200);

  // GAP 3: el backend no valida roles: el usuario "editor" (rol editor)
  // puede crear clientes igual que el administrador
  const creacionEditor = await pedir("POST", "/clientes", {
    token: tokenEditor,
    body: { nombre: "PG-Cliente Rol Gap", correo: "pg.rolgap@atlasfake.com" },
  });
  expect(creacionEditor.status).toBe(201);

  // Limpieza del cliente creado por el gap
  const borrado = await pedir("DELETE", `/clientes/${creacionEditor.datos.id}`, {
    token: tokenEditor,
  });
  expect(borrado.status).toBe(200);
});
