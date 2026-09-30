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

describe("Contratos", () => {
  let request;
  const auth = (overrides) => `Bearer ${createToken(overrides)}`;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("POST /contratos", () => {
    test("201: crea contrato sin archivo y registra auditoría", async () => {
      mockQueryOnce({ rows: [{ id: 1, cliente_id: 2, titulo: "Contrato A" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/contratos")
        .field("cliente_id", "2")
        .field("titulo", "Contrato A")
        .field("fecha_inicio", "2024-01-01")
        .field("fecha_fin", "2024-12-31");

      expect(res.status).toBe(201);
      expect(res.body.titulo).toBe("Contrato A");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("201: crea contrato con archivo PDF", async () => {
      mockQueryOnce({ rows: [{ id: 1, cliente_id: 2, titulo: "Contrato B" }] });
      mockQueryOnce({ rows: [{ id: 10 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .post("/contratos")
        .field("cliente_id", "2")
        .field("titulo", "Contrato B")
        .field("fecha_inicio", "2024-01-01")
        .field("fecha_fin", "2024-12-31")
        .attach("file", Buffer.from("%PDF-1.4 test"), "documento.pdf");

      expect(res.status).toBe(201);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .post("/contratos")
        .field("cliente_id", "2")
        .field("titulo", "Contrato C")
        .field("fecha_inicio", "2024-01-01")
        .field("fecha_fin", "2024-12-31");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al crear contrato");
    });
  });

  describe("GET /contratos", () => {
    test("401: sin token", async () => {
      const res = await request.get("/contratos");
      expect(res.status).toBe(401);
    }, 10000);

    test("200: lista contratos con nombre del cliente", async () => {
      mockQueryOnce({ rows: [{ id: 1, titulo: "A", cliente_nombre: "ACME" }] });
      const res = await request.get("/contratos").set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(res.body[0].cliente_nombre).toBe("ACME");
    }, 10000);

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/contratos").set("Authorization", auth());
      expect(res.status).toBe(500);
    }, 10000);
  });

  describe("GET /contratos/estados", () => {
    test("401: sin token", async () => {
      const res = await request.get("/contratos/estados");
      expect(res.status).toBe(401);
    });

    test("200: retorna contratos con estado por_vencer y vencido", async () => {
      mockQueryOnce({ rows: [{ id: 1, fecha_fin: "2024-12-31" }] });
      mockQueryOnce({ rows: [{ id: 2, fecha_fin: "2020-01-01" }] });

      const res = await request.get("/contratos/estados").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.find((c) => c.id === 1).estado).toBe("por_vencer");
      expect(res.body.find((c) => c.id === 2).estado).toBe("vencido");
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/contratos/estados").set("Authorization", auth());
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Error al obtener contratos por estado");
    });
  });

  describe("GET /contratos/dashboard", () => {
    test("401: sin token", async () => {
      const res = await request.get("/contratos/dashboard");
      expect(res.status).toBe(401);
    });

    test("200: retorna estadísticas de la empresa", async () => {
      mockQueryOnce({ rows: [{ total: "3" }] });
      mockQueryOnce({ rows: [{ total: "5" }] });
      mockQueryOnce({ rows: [{ total: "1" }] });
      mockQueryOnce({ rows: [{ total: "2" }] });
      mockQueryOnce({ rows: [{ total: "4" }] });

      const res = await request.get("/contratos/dashboard").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.totalUsuarios).toBe(3);
      expect(res.body.totalClientes).toBe(5);
      expect(res.body.contratosVencen7Dias).toBe(1);
      expect(res.body.contratosVencen15Dias).toBe(2);
      expect(res.body.contratosVencen30Dias).toBe(4);
      expect(pool.query).toHaveBeenCalledTimes(5);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/contratos/dashboard").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });

  describe("GET /contratos/:id", () => {
    test("200: obtiene contrato", async () => {
      mockQueryOnce({ rows: [{ id: 1, titulo: "A" }] });
      const res = await request.get("/contratos/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    test("404: contrato no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/contratos/999");
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/contratos/1");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /contratos/:id/file", () => {
    test("200: retorna el PDF del contrato", async () => {
      mockQueryOnce({ rows: [{ document: Buffer.from("%PDF-1.4 hola") }] });
      const res = await request.get("/contratos/1/file");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      expect(res.headers["content-disposition"]).toContain("inline");
    });

    test("404: documento no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/contratos/999/file");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Documento no encontrado");
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.get("/contratos/1/file");
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /contratos/:id", () => {
    test("401: sin token", async () => {
      const res = await request.put("/contratos/1").send({ titulo: "Nuevo" });
      expect(res.status).toBe(401);
    });

    test("404: contrato no existe o no pertenece a la empresa", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/contratos/999")
        .set("Authorization", auth())
        .send({ titulo: "Nuevo" });
      expect(res.status).toBe(404);
    });

    test("200: actualiza campos y registra auditoría", async () => {
      mockQueryOnce({
        rows: [{ id: 1, cliente_id: 2, titulo: "Original", descripcion: "x" }],
      });
      mockQueryOnce({ rows: [{ id: 1, cliente_id: 2, titulo: "Nuevo", descripcion: "x" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .send({ titulo: "Nuevo" });

      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe("Nuevo");
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test("200: si no hay campos, retorna el contrato actual", async () => {
      mockQueryOnce({ rows: [{ id: 1, cliente_id: 2, titulo: "Original" }] });
      mockQueryOnce({ rows: [{ id: 1, cliente_id: 2, titulo: "Original" }] });

      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe("Original");
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .send({ titulo: "Nuevo" });
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /contratos/:id", () => {
    test("200: elimina contrato y documentos, registra auditoría", async () => {
      mockQueryOnce({ rows: [] });
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });

      const res = await request.delete("/contratos/1").set("Authorization", auth());

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test("404: contrato no encontrado", async () => {
      mockQueryOnce({ rows: [] });
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/contratos/999").set("Authorization", auth());
      expect(res.status).toBe(404);
    });

    test("500: error en la base de datos", async () => {
      mockQueryError(new Error("boom"));
      const res = await request.delete("/contratos/1").set("Authorization", auth());
      expect(res.status).toBe(500);
    });
  });
});
