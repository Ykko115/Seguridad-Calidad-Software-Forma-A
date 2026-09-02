jest.mock("../src/db", () => ({
  pool: { query: jest.fn() },
}));

const { makeRequest } = require("./helpers/app");
const {
  pool,
  mockQueryOnce,
  mockQuery,
  mockQueryError,
  resetMock,
} = require("./helpers/db");
const { createToken } = require("./helpers/token");

describe("Usuarios", () => {
  let request;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("POST /usuarios", () => {
    test("201: crea un usuario", async () => {
      mockQueryOnce({
        rows: [{ id: 1, nombre_usuario: "pepe", correo: "p@e.com", created_at: new Date().toISOString() }],
      });

      const res = await request.post("/usuarios").send({
        nombre_usuario: "pepe",
        contrasena_hash: "clave",
        correo: "p@e.com",
      });

      expect(res.status).toBe(201);
      expect(res.body.nombre_usuario).toBe("pepe");
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("constraint"));
      const res = await request.post("/usuarios").send({
        nombre_usuario: "pepe",
        contrasena_hash: "clave",
        correo: "p@e.com",
      });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear usuario");
    });
  });

  describe("GET /usuarios", () => {
    test("401: sin token", async () => {
      const res = await request.get("/usuarios");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("No autorizado");
    });

    test("401: token sin empresaId", async () => {
      const token = createToken({ empresaId: undefined });
      const res = await request.get("/usuarios").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    test("401: token inválido", async () => {
      const res = await request.get("/usuarios").set("Authorization", "Bearer token-invalido");
      expect(res.status).toBe(401);
    });

    test("200: lista usuarios de la empresa", async () => {
      mockQueryOnce({
        rows: [
          { id: 2, nombre_usuario: "ana", correo: "a@e.com", created_at: "2020-01-01" },
        ],
      });
      const token = createToken();
      const res = await request.get("/usuarios").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].nombre_usuario).toBe("ana");
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const token = createToken();
      const res = await request.get("/usuarios").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al listar usuarios");
    });
  });

  describe("GET /usuarios/:id", () => {
    test("200: obtiene usuario", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "pepe", correo: "p@e.com" }] });
      const res = await request.get("/usuarios/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test("404: usuario no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/usuarios/999");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No encontrado");
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/usuarios/1");
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /usuarios/:id", () => {
    test("200: actualiza usuario y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "nuevo", correo: "n@e.com" }] });
      mockQueryOnce({ rows: [] });
      const token = createToken();
      const res = await request.put("/usuarios/1").set("Authorization", `Bearer ${token}`).send({
        nombre_usuario: "nuevo",
        contrasena_hash: "clave",
        correo: "n@e.com",
      });
      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("404: usuario no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const token = createToken();
      const res = await request.put("/usuarios/999").set("Authorization", `Bearer ${token}`).send({
        nombre_usuario: "x",
        contrasena_hash: "c",
        correo: "x@e.com",
      });
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const token = createToken();
      const res = await request.put("/usuarios/1").set("Authorization", `Bearer ${token}`).send({
        nombre_usuario: "x",
        contrasena_hash: "c",
        correo: "x@e.com",
      });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /usuarios/:id", () => {
    test("200: elimina usuario y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const token = createToken();
      const res = await request.delete("/usuarios/1").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    test("404: usuario no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const token = createToken();
      const res = await request.delete("/usuarios/999").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const token = createToken();
      const res = await request.delete("/usuarios/1").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });
});
