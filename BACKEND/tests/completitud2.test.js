// ============================================================================
// Completitud backend, parte 2: token sin nombreUsuario (auditoría null),
// rechazos no-Error por endpoint, token malformado en módulos restantes y
// búsqueda sin parámetro. Plan EP1 3.1.2: Supertest + mocks.
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
const sinNombre = () => `Bearer ${createToken({ nombreUsuario: undefined })}`;
const MALFORMADO = "Bearer xxx-token-malformado";

describe("Completitud backend 2", () => {
  let request;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  describe("Auditoría con token sin nombreUsuario (3.2.3 autorización)", () => {
    test("PUT /usuarios/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre_usuario: "pepe" }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/usuarios/1")
        .set("Authorization", sinNombre())
        .send({ nombre_usuario: "pepe" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("DELETE /usuarios/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .delete("/usuarios/1")
        .set("Authorization", sinNombre());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("PUT /contratos/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [{ id: 1, titulo: "X" }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/contratos/1")
        .set("Authorization", sinNombre())
        .send({ titulo: "X" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[2][1][0]).toBeNull();
    });

    test("DELETE /contratos/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [] });
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .delete("/contratos/1")
        .set("Authorization", sinNombre());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[2][1][0]).toBeNull();
    });

    test("PUT /clientes/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME" }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/clientes/1")
        .set("Authorization", sinNombre())
        .send({ nombre: "ACME" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("DELETE /clientes/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .delete("/clientes/1")
        .set("Authorization", sinNombre());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("PUT /roles/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "visor" }] });
      mockQueryOnce({ rows: [] });
      const res = await request.put("/roles/1").set("Authorization", sinNombre()).send({ nombre: "visor" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("DELETE /roles/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/roles/1").set("Authorization", sinNombre());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("PUT /empresas/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME" }] });
      mockQueryOnce({ rows: [] });
      const res = await request.put("/empresas/1").set("Authorization", sinNombre()).send({ nombre: "ACME" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("DELETE /empresas/1 registra usuario null", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request.delete("/empresas/1").set("Authorization", sinNombre());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });
  });

  describe("Rechazos no-Error por endpoint (3.2.6 no funcionales)", () => {
    async function expectGlosa(promise) {
      const res = await promise;
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    }

    test("GET /contratos", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/contratos").set("Authorization", auth()));
    }, 15000);

    test("GET /contratos/estados", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/contratos/estados").set("Authorization", auth()));
    });

    test("GET /contratos/dashboard", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/contratos/dashboard").set("Authorization", auth()));
    });

    test("GET /contratos/999", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/contratos/999"));
    });

    test("GET /contratos/1/file", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/contratos/1/file"));
    });

    test("PUT /contratos/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(
        request.put("/contratos/1").set("Authorization", auth()).send({ titulo: "X" })
      );
    });

    test("DELETE /contratos/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.delete("/contratos/1"));
    });

    test("GET /clientes", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/clientes").set("Authorization", auth()));
    }, 15000);

    test("GET /clientes/search", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(
        request.get("/clientes/search?name=AC").set("Authorization", auth())
      );
    });

    test("GET /clientes/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/clientes/1").set("Authorization", auth()));
    });

    test("PUT /clientes/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(
        request.put("/clientes/1").set("Authorization", auth()).send({ nombre: "X" })
      );
    });

    test("DELETE /clientes/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.delete("/clientes/1").set("Authorization", auth()));
    });

    test("GET /usuarios", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/usuarios").set("Authorization", auth()));
    });

    test("GET /usuarios/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/usuarios/1"));
    });

    test("PUT /usuarios/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.put("/usuarios/1").send({ nombre_usuario: "x" }));
    });

    test("DELETE /usuarios/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.delete("/usuarios/1"));
    });

    test("GET /empresa-usuarios", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/empresa-usuarios").set("Authorization", auth()));
    });

    test("GET /empresa-usuarios/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/empresa-usuarios/1").set("Authorization", auth()));
    });

    test("PUT /empresa-usuarios/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(
        request.put("/empresa-usuarios/1").set("Authorization", auth()).send({ rol_id: 2 })
      );
    });

    test("DELETE /empresa-usuarios/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.delete("/empresa-usuarios/1").set("Authorization", auth()));
    });

    test("GET /empresas", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/empresas"));
    });

    test("GET /empresas/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/empresas/1"));
    });

    test("PUT /empresas/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.put("/empresas/1").send({ nombre: "X" }));
    });

    test("DELETE /empresas/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.delete("/empresas/1"));
    });

    test("GET /roles", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/roles"));
    });

    test("GET /roles/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/roles/1"));
    });

    test("PUT /roles/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.put("/roles/1").send({ nombre: "X" }));
    });

    test("DELETE /roles/1", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.delete("/roles/1"));
    });

    test("GET /auditoria", async () => {
      mockQueryErrorOnce("fallo-plano");
      await expectGlosa(request.get("/auditoria"));
    });
  });

  describe("Token malformado en módulos restantes (3.2.2 seguridad)", () => {
    test("401: GET /empresa-usuarios con token malformado", async () => {
      const res = await request.get("/empresa-usuarios").set("Authorization", MALFORMADO);
      expect(res.status).toBe(401);
    });

    test("200: PUT /empresas/1 con token malformado audita null (sin 401)", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "ACME" }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/empresas/1")
        .set("Authorization", MALFORMADO)
        .send({ nombre: "ACME" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("200: PUT /roles/1 con token malformado audita null (sin 401)", async () => {
      mockQueryOnce({ rows: [{ id: 1, nombre: "visor" }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/roles/1")
        .set("Authorization", MALFORMADO)
        .send({ nombre: "visor" });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("401: GET /metricas con token malformado", async () => {
      const res = await request.get("/metricas").set("Authorization", MALFORMADO);
      expect(res.status).toBe(401);
    }, 15000);
  });

  describe("Búsqueda de clientes (3.2.1 funcionales)", () => {
    test("GET /clientes/search sin parámetro busca con comodín total", async () => {
      mockQueryOnce({ rows: [] });
      const res = await request.get("/clientes/search").set("Authorization", auth());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[0][1]).toEqual(["%%", 1]);
    });
  });

  describe("Últimas ramas (3.2.3/3.2.6)", () => {
    test("POST /clientes con token sin nombreUsuario audita null", async () => {
      mockQueryOnce({ rows: [{ id: 2, nombre: "ACME" }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .post("/clientes")
        .set("Authorization", sinNombre())
        .send({ nombre: "ACME" });
      expect(res.status).toBe(201);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("POST /empresa-usuarios con token sin nombreUsuario audita null", async () => {
      mockQueryOnce({ rows: [{ id: 5, empresa_id: 1, usuario_id: 1, rol_id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .post("/empresa-usuarios")
        .set("Authorization", sinNombre())
        .send({ usuario_id: 1, rol_id: 1 });
      expect(res.status).toBe(201);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("PUT /empresa-usuarios/1 con token sin nombreUsuario audita null", async () => {
      mockQueryOnce({ rows: [{ id: 1, rol_id: 2 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .put("/empresa-usuarios/1")
        .set("Authorization", sinNombre())
        .send({ rol_id: 2 });
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("DELETE /empresa-usuarios/1 con token sin nombreUsuario audita null", async () => {
      mockQueryOnce({ rows: [{ id: 1 }] });
      mockQueryOnce({ rows: [] });
      const res = await request
        .delete("/empresa-usuarios/1")
        .set("Authorization", sinNombre());
      expect(res.status).toBe(200);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("POST /empresas con usuario y rechazo plano", async () => {
      mockQueryErrorOnce("fallo-plano");
      const res = await request.post("/empresas").send({
        usuario: { nombre_usuario: "pepe", contrasena_hash: "c", correo: "p@e.com" },
        empresa: { nombre: "ACME" },
      });
      expect(res.status).toBe(500);
      expect(res.body.glosa).toBe("fallo-plano");
    });

    test("POST /empresas simple sin token audita null", async () => {
      mockQueryOnce({ rows: [{ id: 5, nombre: "ACME" }] });
      mockQueryOnce({ rows: [] });
      const res = await request.post("/empresas").send({ nombre: "ACME" });
      expect(res.status).toBe(201);
      expect(pool.query.mock.calls[1][1][0]).toBeNull();
    });

    test("POST /auditoria con token malformado registra igual (sin 401)", async () => {
      mockQueryOnce({ rows: [{ id: 1, accion: "X" }] });
      const res = await request
        .post("/auditoria")
        .set("Authorization", MALFORMADO)
        .send({ accion: "X" });
      expect(res.status).toBe(201);
    });

    test("GET / responde estado ok", async () => {
      const res = await request.get("/");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    test("GET /openapi.json devuelve el contrato OpenAPI", async () => {
      const res = await request.get("/openapi.json");
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });
});
