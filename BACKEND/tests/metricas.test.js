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

describe("Métricas", () => {
  let request;
  const auth = (overrides) => `Bearer ${createToken(overrides)}`;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("GET /metricas", () => {
    test("401: sin token", async () => {
      const res = await request.get("/metricas");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("No autorizado");
    }, 10000);

    test("200: retorna contratos y métricas de la empresa", async () => {
      mockQueryOnce({
        rows: [
          { id: 1, fecha_fin: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0], cliente: "ACME" },
        ],
      });
      mockQueryOnce({
        rows: [
          { id: 2, fecha_fin: new Date(Date.now() - 10 * 86400000).toISOString().split("T")[0], cliente: "Beta" },
        ],
      });
      mockQueryOnce({ rows: [{ total: "3" }] });
      mockQueryOnce({ rows: [{ total: "5" }] });
      mockQueryOnce({ rows: [{ total: "2" }] });
      mockQueryOnce({ rows: [{ total: "4" }] });

      const res = await request.get("/metricas").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.contratosProximosAVencer).toHaveLength(1);
      expect(res.body.contratosProximosAVencer[0].diasRestantes).toBe(5);
      expect(res.body.contratosVencidos[0].diasVencidos).toBe(10);
      expect(res.body.metricas.totalUsuarios).toBe(3);
      expect(res.body.metricas.totalClientes).toBe(5);
      expect(res.body.metricas.contratos15Dias).toBe(2);
      expect(res.body.metricas.contratos30Dias).toBe(4);
      expect(pool.query).toHaveBeenCalledTimes(6);
    }, 10000);

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/metricas").set("Authorization", auth());
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al obtener métricas");
    }, 10000);
  });
});
