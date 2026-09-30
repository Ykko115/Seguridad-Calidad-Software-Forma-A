jest.mock("../src/db", () => ({
  pool: { query: jest.fn() },
}));

const jwt = require("jsonwebtoken");
const { makeRequest } = require("./helpers/app");
const {
  pool,
  mockQueryOnce,
  mockQuery,
  mockQueryError,
  resetMock,
} = require("./helpers/db");
const { JWT_SECRET } = require("./helpers/token");

describe("POST /autenticacion/login", () => {
  let request;

  beforeEach(() => {
    resetMock();
    request = makeRequest();
  });

  test("200: retorna token cuando las credenciales son correctas", async () => {
    mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "admin", contrasena_hash: "admin123" }] });
    mockQueryOnce({ rows: [{ id: 10, empresa_id: 5 }] });
    mockQueryOnce({ rows: [] });

    const res = await request.post("/autenticacion/login").send({ nombre_usuario: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.usuarioId).toBe(1);
    expect(decoded.nombreUsuario).toBe("admin");
    expect(decoded.empresaUsuarioId).toBe(10);
    expect(decoded.empresaId).toBe(5);
    expect(pool.query).toHaveBeenCalledTimes(3);
  }, 10000);

  test("200: empresaUsuario y empresaId son null si el usuario no tiene empresa", async () => {
    mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "admin", contrasena_hash: "pass" }] });
    mockQueryOnce({ rows: [] });
    mockQueryOnce({ rows: [] });

    const res = await request.post("/autenticacion/login").send({ nombre_usuario: "admin", password: "pass" });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.empresaUsuarioId).toBeNull();
    expect(decoded.empresaId).toBeNull();
  }, 10000);

  test("401: usuario no existe", async () => {
    mockQueryOnce({ rows: [] });

    const res = await request.post("/autenticacion/login").send({ nombre_usuario: "nadie", password: "x" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
    expect(pool.query).toHaveBeenCalledTimes(1);
  }, 10000);

  test("401: contraseña no coincide", async () => {
    mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "admin", contrasena_hash: "correcta" }] });

    const res = await request.post("/autenticacion/login").send({ nombre_usuario: "admin", password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
  }, 10000);

  test("500: error en la base de datos", async () => {
    mockQueryError(new Error("db caída"));

    const res = await request.post("/autenticacion/login").send({ nombre_usuario: "admin", password: "x" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Error en login");
  }, 10000);
});
