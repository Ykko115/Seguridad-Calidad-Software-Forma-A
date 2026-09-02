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

describe("Clientes", () => {
  let request;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  const auth = (overrides) => `Bearer ${createToken(overrides)}`;

  describe("POST /clientes", () => {
    test("401: sin token", async () => {
      const res = await request.post("/clientes").send({ nombre: "ACME" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("No autorizado");
    });

    test("401: token sin empresaId", async () => {
      const res = await request
        .post("/clientes")
        .set("Authorization", auth({ empresaId: undefined }))
        .send({ nombre: "ACME" });
      expect(res.status).toBe(401);
    });

    test("201: crea cliente con empresa del token y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME", empresa_id: 5 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/clientes")
        .set("Authorization", auth())
        .send({ nombre: "ACME", correo: "a@b.com" });

      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe("ACME");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/clientes")
        .set("Authorization", auth())
        .send({ nombre: "ACME" });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear cliente");
    });
  });

  describe("GET /clientes", () => {
    test("401: sin token", async () => {
      const res = await request.get("/clientes");
      expect(res.status).toBe(401);
    }, 10000);

    test("200: lista clientes de la empresa", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME" }] });
      const res = await request.get("/clientes").set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    }, 10000);

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/clientes").set("Authorization", auth());
      expect(res.status).toBe(500);
    }, 10000);
  });

  describe("GET /clientes/search", () => {
    test("401: sin token", async () => {
      const res = await request.get("/clientes/search?name=ACME");
      expect(res.status).toBe(401);
    });

    test("200: busca clientes por nombre", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME" }] });
      const res = await request
        .get("/clientes/search?name=ACM")
        .set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .get("/clientes/search?name=x")
        .set("Authorization", auth());
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error en búsqueda");
    });
  });

  describe("GET /clientes/:id", () => {
    test("401: sin token", async () => {
      const res = await request.get("/clientes/1");
      expect(res.status).toBe(401);
    });

    test("200: obtiene cliente de la empresa", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME", empresa_id: 1 }] });
      const res = await request.get("/clientes/1").set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test("404: cliente no existe o no pertenece a la empresa", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/clientes/999").set("Authorization", auth());
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/clientes/1").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /clientes/:id", () => {
    test("401: sin token", async () => {
      const res = await request.put("/clientes/1").send({ nombre: "Nuevo" });
      expect(res.status).toBe(401);
    });

    test("200: actualiza cliente y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "Nuevo", empresa_id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/clientes/1")
        .set("Authorization", auth())
        .send({ nombre: "Nuevo", correo: "n@e.com" });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe("Nuevo");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("404: cliente no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/clientes/999")
        .set("Authorization", auth())
        .send({ nombre: "Nuevo" });
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .put("/clientes/1")
        .set("Authorization", auth())
        .send({ nombre: "Nuevo" });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /clientes/:id", () => {
    test("401: sin token", async () => {
      const res = await request.delete("/clientes/1");
      expect(res.status).toBe(401);
    });

    test("200: elimina cliente y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/clientes/1").set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    test("404: cliente no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/clientes/999").set("Authorization", auth());
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.delete("/clientes/1").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });
});
