const jwt = require("jsonwebtoken");
const { pedir, obtenerToken } = require("./ayudas");

const SECRETO_COMPOSE = "your-secret-key-change-in-production";

let tokenAdmin;
let tokenEditor;

beforeAll(async () => {
  tokenAdmin = await obtenerToken("admin", "admin");
  tokenEditor = await obtenerToken("editor", "editor");
});

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

test("PG-09: token con secreto incorrecto o malformado responde 401", async () => {
  const tokenFalso = jwt.sign(
    { usuarioId: "1", nombreUsuario: "admin", empresaId: "1" },
    "secreto-equivocado",
    { expiresIn: "2h" }
  );
  const conSecretoMalo = await pedir("GET", "/clientes", { token: tokenFalso });
  expect(conSecretoMalo.status).toBe(401);

  const basura = await pedir("GET", "/clientes", { token: "esto-no-es-un-jwt" });
  expect(basura.status).toBe(401);

  const vencido = jwt.sign(
    { usuarioId: "1", nombreUsuario: "admin", empresaId: "1" },
    SECRETO_COMPOSE,
    { expiresIn: "-1h" }
  );
  const tokenVencido = await pedir("GET", "/clientes", { token: vencido });
  expect(tokenVencido.status).toBe(401);
});

test("PG-10: login con credenciales incorrectas responde 401", async () => {
  const passMala = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: "admin", password: "clave-mala" },
  });
  expect(passMala.status).toBe(401);
  expect(passMala.datos.error).toBe("Credenciales inválidas");

  const usuarioMalo = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: "no-existe", password: "cualquiera" },
  });
  expect(usuarioMalo.status).toBe(401);
  expect(usuarioMalo.datos.error).toBe("Credenciales inválidas");

  expect(passMala.datos.token).toBeUndefined();
  expect(usuarioMalo.datos.token).toBeUndefined();
});

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

test("PG-12: gaps de autorización documentados (sin token y sin validación de rol)", async () => {
  const contratoSinToken = await pedir("GET", "/contratos/1");
  expect(contratoSinToken.status).toBe(200);

  const auditoriaSinToken = await pedir("GET", "/auditoria");
  expect(auditoriaSinToken.status).toBe(200);

  const creacionEditor = await pedir("POST", "/clientes", {
    token: tokenEditor,
    body: { nombre: "PG-Cliente Rol Gap", correo: "pg.rolgap@atlasfake.com" },
  });
  expect(creacionEditor.status).toBe(201);

  const borrado = await pedir("DELETE", `/clientes/${creacionEditor.datos.id}`, {
    token: tokenEditor,
  });
  expect(borrado.status).toBe(200);
});
