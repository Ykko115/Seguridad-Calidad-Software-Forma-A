// ============================================================================
// Pruebas de COMPLETITUD del backend: cubren ramas no alcanzadas por las
// suites por módulo (token malformado, PUT por campo, auditoría sin sesión
// y rechazos no-Error). Enfoque según plan EP1 3.1.2: Supertest + mocks.
// ============================================================================
jest.mock("../src/db", () => ({
  pool: { query: jest.fn() },
}));

const { makeRequest } = require("./helpers/app");
const {
  pool,
  mockQueryOnce,
  mockQueryErrorOnce,
  resetMock,
} = require("./helpers/db");
const { createToken } = require("./helpers/token");

const auth = (overrides) => `Bearer ${createToken(overrides)}`;
const MALFORMADO = "Bearer xxx-token-malformado";

describe("Completitud backend", () => {
  let request;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("Token malformado (3.2.2 seguridad)", () => {
    test("401: GET /contratos/estados con token malformado", async () => {
      const res = await request
        .get("/contratos/estados")
        .set("Authorization", MALFORMADO);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("No autorizado");
    });

    test("401: POST /clientes con token malformado", async () => {
      const res = await request
        .post("/clientes")
        .set("Authorization", MALFORMADO)
        .send({ nombre: "ACME" });
      expect(res.status).toBe(401);
    });

    test("401: GET /usuarios con token malformado", async () => {
      const res = await request
        .get("/usuarios")
        .set("Authorization", MALFORMADO);
      expect(res.status).toBe(401);
    });

    test("401: DELETE /clientes/1 con token malformado", async () => {
      const res = await request
        .delete("/clientes/1")
        .set("Authorization", MALFORMADO);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /contratos/:id por campo (3.2.1 funcionales)", () => {
    const ownership = {
      rows: [{ id: 1, cliente_id: 2, titulo: "Original" }],
    };

    test("200: actualiza solo cliente_id", async () => {
      mockQueryOnce(ownership);
      mockQueryOnce({ rows: [{ id: 1, cliente_id: 3 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .send({ cliente_id: "3" });

      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][0]).toContain("cliente_id = $1");
      expect(pool.query.mock.calls[1][1]).toContain(3);
    });

    test("200: actualiza solo descripcion", async () => {
      mockQueryOnce(ownership);
      mockQueryOnce({ rows: [{ id: 1, descripcion: "Nueva" }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .send({ descripcion: "Nueva" });

      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][0]).toContain("descripcion = $1");
    });

    test("200: actualiza fechas de inicio y fin", async () => {
      mockQueryOnce(ownership);
      mockQueryOnce({
        rows: [{ id: 1, fecha_inicio: "2024-02-01", fecha_fin: "2024-11-30" }],
      });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .send({ fecha_inicio: "2024-02-01", fecha_fin: "2024-11-30" });

      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][0]).toContain("fecha_inicio = $1");
      expect(pool.query.mock.calls[1][0]).toContain("fecha_fin = $2");
    });

    test("200: actualiza con archivo nuevo y guarda el documento", async () => {
      mockQueryOnce(ownership);
      mockQueryOnce({ rows: [{ id: 1, titulo: "Con archivo" }] });
      mockQueryOnce({ rows: [{ id: 9 }] });
      mockQueryOnce({ rows: [] });

      const res = await request
        .put("/contratos/1")
        .set("Authorization", auth())
        .field("titulo", "Con archivo")
        .attach("file", Buffer.from("%PDF-1.4 nuevo"), "nuevo.pdf");

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(pool.query.mock.calls[2][0]).toContain(
        "INSERT INTO documentos_contrato"
      );
    });
  });

  describe("Operaciones auditadas sin sesión (3.2.3 autorización)", () => {
    test("201: POST /roles sin token registra auditoría con usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 3, nombre: "visor" }] });
      mockQueryOnce({ rows: [] });

      const res = await request.post("/roles").send({ nombre: "visor" });

      expect(res.status).toBe(201);
      expect(pool.query.mock.calls[1][0]).toContain("INSERT INTO auditoria");
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("200: PUT /usuarios/1 sin token registra auditoría con usuario null", async () => {
      mockQueryOnce({
        rows: [{ id: 1, nombre_usuario: "pepe", correo: "nuevo@x.cl" }],
      });
      mockQueryOnce({ rows: [] });

      const res = await request.put("/usuarios/1").send({
        nombre_usuario: "pepe",
        contrasena_hash: "clave",
        correo: "nuevo@x.cl",
      });

      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("200: PUT /empresas/1 sin token registra auditoría con usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME 2" }] });
      mockQueryOnce({ rows: [] });

      const res = await request.put("/empresas/1").send({ nombre: "ACME 2" });

      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });
  });

  describe("Rechazos no-Error de la BD (3.2.6 no funcionales)", () => {
    test("500: login con rechazo plano usa glosa del mensaje", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request
        .post("/autenticacion/login")
        .send({ nombre_usuario: "admin", password: "x" });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    }, 15000);

    test("500: POST /usuarios con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request.post("/usuarios").send({
        nombre_usuario: "pepe",
        contrasena_hash: "clave",
        correo: "p@e.com",
      });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: POST /clientes con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request
        .post("/clientes")
        .set("Authorization", auth())
        .send({ nombre: "ACME" });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: POST /contratos con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request
        .post("/contratos")
        .field("cliente_id", "2")
        .field("titulo", "X")
        .field("fecha_inicio", "2024-01-01")
        .field("fecha_fin", "2024-12-31");
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: POST /auditoria con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request.post("/auditoria").send({ accion: "X" });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: POST /empresas con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request.post("/empresas").send({ nombre: "ACME" });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: POST /roles con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request.post("/roles").send({ nombre: "visor" });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: POST /empresa-usuarios con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", auth())
        .send({ usuario_id: 1, rol_id: 1 });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("500: GET /metricas con rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request.get("/metricas").set("Authorization", auth());
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    }, 15000);
  });
});
