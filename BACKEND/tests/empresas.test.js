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

describe("Empresas", () => {
  let request;
  const auth = () => `Bearer ${createToken()}`;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("POST /empresas", () => {
    test("201: crea empresa, usuario y relación con rol administrador", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "u", correo: "u@e.com" }] });
      mockQueryOnce({ rows: [{ id: 2, nombre: "Empresa SA" }] });
      mockQueryOnce({ rows: [{ id: 3 }] });

      const res = await request
        .post("/empresas")
        .set("Authorization", auth())
        .send({
          usuario: { nombre_usuario: "u", contrasena_hash: "c", correo: "u@e.com" },
          empresa: { nombre: "Empresa SA", correo: "emp@e.com" },
        });

      expect(res.status).toBe(201);
      expect(res.body.empresa.nombre).toBe("Empresa SA");
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test("201: crea solo empresa (formato simple) y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 2, nombre: "Empresa SA" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/empresas")
        .set("Authorization", auth())
        .send({ nombre: "Empresa SA", correo: "emp@e.com" });

      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe("Empresa SA");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("500: error al crear empresa con usuario", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/empresas")
        .set("Authorization", auth())
        .send({
          usuario: { nombre_usuario: "u", contrasena_hash: "c", correo: "u@e.com" },
          empresa: { nombre: "E", correo: "e@e.com" },
        });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear empresa con usuario");
    });

    test("500: error al crear empresa simple", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/empresas")
        .set("Authorization", auth())
        .send({ nombre: "E", correo: "e@e.com" });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear empresa");
    });
  });

  describe("GET /empresas", () => {
    test("200: lista las empresas", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "A" }] });
      const res = await request.get("/empresas");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/empresas");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al listar empresas");
    });
  });

  describe("GET /empresas/:id", () => {
    test("200: obtiene una empresa", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "A" }] });
      const res = await request.get("/empresas/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test("404: empresa no encontrada", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/empresas/999");
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/empresas/1");
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /empresas/:id", () => {
    test("200: actualiza empresa y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "Nueva" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/empresas/1")
        .set("Authorization", auth())
        .send({ nombre: "Nueva", correo: "n@e.com" });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe("Nueva");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("404: empresa no encontrada", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/empresas/999")
        .set("Authorization", auth())
        .send({ nombre: "Nueva", correo: "n@e.com" });
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .put("/empresas/1")
        .set("Authorization", auth())
        .send({ nombre: "Nueva", correo: "n@e.com" });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /empresas/:id", () => {
    test("200: elimina empresa y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });

      const res = await request.delete("/empresas/1").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    test("404: empresa no encontrada", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/empresas/999").set("Authorization", auth());
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.delete("/empresas/1").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });
});
