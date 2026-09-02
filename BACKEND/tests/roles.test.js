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

describe("Roles", () => {
  let request;
  const auth = () => `Bearer ${createToken()}`;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("POST /roles", () => {
    test("201: crea un rol y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 3, nombre: "supervisor" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/roles")
        .set("Authorization", auth())
        .send({ nombre: "supervisor" });

      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe("supervisor");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/roles")
        .set("Authorization", auth())
        .send({ nombre: "supervisor" });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear rol");
    });
  });

  describe("GET /roles", () => {
    test("200: lista los roles", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "admin" }] });
      const res = await request.get("/roles");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/roles");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al listar roles");
    });
  });

  describe("GET /roles/:id", () => {
    test("200: obtiene un rol", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "admin" }] });
      const res = await request.get("/roles/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test("404: rol no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/roles/999");
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/roles/1");
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /roles/:id", () => {
    test("200: actualiza rol y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "nuevo" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/roles/1")
        .set("Authorization", auth())
        .send({ nombre: "nuevo" });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe("nuevo");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("404: rol no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/roles/999")
        .set("Authorization", auth())
        .send({ nombre: "nuevo" });
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .put("/roles/1")
        .set("Authorization", auth())
        .send({ nombre: "nuevo" });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /roles/:id", () => {
    test("200: elimina rol y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });

      const res = await request.delete("/roles/1").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    test("404: rol no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/roles/999").set("Authorization", auth());
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.delete("/roles/1").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });
});
