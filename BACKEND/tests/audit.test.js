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

describe("Auditoría", () => {
  let request;
  const auth = () => `Bearer ${createToken()}`;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("POST /auditoria", () => {
    test("201: registra un log con acción y detalles", async () => {
      mockQueryOnce({
        rows: [{ id: 1, usuario_id: "admin", accion: "ACCION: detalle" }],
      });

      const res = await request
        .post("/auditoria")
        .set("Authorization", auth())
        .send({ accion: "ACCION", detalles: "detalle" });

      expect(res.status).toBe(201);
      expect(res.body.accion).toBe("ACCION: detalle");
    });

    test("201: registra un log solo con acción", async () => {
      mockQueryOnce({ rows: [{ id: 2, usuario_id: "admin", accion: "SOLO" }] });

      const res = await request
        .post("/auditoria")
        .set("Authorization", auth())
        .send({ accion: "SOLO" });

      expect(res.status).toBe(201);
      expect(res.body.accion).toBe("SOLO");
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/auditoria")
        .set("Authorization", auth())
        .send({ accion: "X" });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al registrar log");
    });
  });

  describe("GET /auditoria", () => {
    test("200: lista los logs", async () => {
      mockQueryOnce({ rows: [{ id: 1, accion: "A" }, { id: 2, accion: "B" }] });
      const res = await request.get("/auditoria");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/auditoria");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al listar logs");
    });
  });
});
