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

describe("Empresa-Usuarios", () => {
  let request;
  const auth = (overrides) => `Bearer ${createToken(overrides)}`;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("POST /empresa-usuarios", () => {
    test("401: sin token", async () => {
      const res = await request.post("/empresa-usuarios").send({ rol_id: 2 });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("No autorizado");
    });

    test("400: sin usuario_id ni datos de usuario", async () => {
      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", auth())
        .send({ rol_id: 2 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Datos inválidos");
    });

    test("400: sin rol_id", async () => {
      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", auth())
        .send({ usuario_id: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Datos inválidos");
    });

    test("201: vincula usuario existente y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 5, empresa_id: 1, usuario_id: 1, rol_id: 2 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", auth())
        .send({ usuario_id: 1, rol_id: 2 });

      expect(res.status).toBe(201);
      expect(res.body.usuario_id).toBe(1);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("201: crea usuario nuevo y lo vincula", async () => {
      mockQueryOnce({ rows: [{ id: 9, nombre_usuario: "nuevo" }] });
      mockQueryOnce({ rows: [{ id: 5, empresa_id: 1, usuario_id: 9, rol_id: 2 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", auth())
        .send({ rol_id: 2, nombre_usuario: "nuevo", contrasena_hash: "c", correo: "n@e.com" });

      expect(res.status).toBe(201);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", auth())
        .send({ usuario_id: 1, rol_id: 2 });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear vínculo");
    });
  });

  describe("GET /empresa-usuarios", () => {
    test("401: sin token", async () => {
      const res = await request.get("/empresa-usuarios");
      expect(res.status).toBe(401);
    });

    test("200: lista usuarios de la empresa con rol", async () => {
      mockQueryOnce({
        rows: [{ id: 1, nombre_usuario: "u", rol_id: 2, rol_nombre: "editor" }],
      });
      const res = await request.get("/empresa-usuarios").set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(res.body[0].rol_nombre).toBe("editor");
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/empresa-usuarios").set("Authorization", auth());
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al listar usuarios");
    });
  });

  describe("GET /empresa-usuarios/:id", () => {
    test("200: obtiene un vínculo", async () => {
      mockQueryOnce({ rows: [{ id: 1, empresa_id: 1, usuario_id: 1, rol_id: 2 }] });
      const res = await request.get("/empresa-usuarios/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test("404: vínculo no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/empresa-usuarios/999");
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/empresa-usuarios/1");
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /empresa-usuarios/:id", () => {
    test("200: actualiza vínculo y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, empresa_id: 1, usuario_id: 1, rol_id: 3 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/empresa-usuarios/1")
        .set("Authorization", auth())
        .send({ empresa_id: 1, usuario_id: 1, rol_id: 3 });

      expect(res.status).toBe(200);
      expect(res.body.rol_id).toBe(3);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("404: vínculo no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/empresa-usuarios/999")
        .set("Authorization", auth())
        .send({ empresa_id: 1, usuario_id: 1, rol_id: 3 });
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .put("/empresa-usuarios/1")
        .set("Authorization", auth())
        .send({ empresa_id: 1, usuario_id: 1, rol_id: 3 });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /empresa-usuarios/:id", () => {
    test("200: elimina vínculo y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });

      const res = await request.delete("/empresa-usuarios/1").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    test("404: vínculo no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/empresa-usuarios/999").set("Authorization", auth());
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.delete("/empresa-usuarios/1").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });
});
