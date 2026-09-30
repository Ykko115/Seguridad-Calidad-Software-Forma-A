// ============================================================================
// Pruebas de INTEGRACIÓN API (plan de pruebas EP1, sección 3.2.4)
// Enfoque según 3.1.2/3.4.3: Supertest sobre la app Express completa con la
// capa de datos simulada (jest.mock), sin depender de la BD real.
// Jornada entre módulos: registro -> login -> cliente -> contrato -> estados
// -> dashboard -> auditoría, etiquetada con los CP-01..CP-10 del informe.
// ============================================================================
jest.mock("../src/db", () => ({
  pool: { query: jest.fn() },
}));

const jwt = require("jsonwebtoken");
const { makeRequest } = require("./helpers/app");
const {
  pool,
  mockQueryOnce,
  resetMock,
} = require("./helpers/db");
const { createToken, JWT_SECRET } = require("./helpers/token");

const auth = (overrides) => `Bearer ${createToken(overrides)}`;

describe("Integración API Atlas (CP-01..CP-10)", () => {
  let request;

  beforeEach(() => {
    resetMock();
    jest.clearAllMocks();
    request = makeRequest();
  });

  test("IT-01 (CP-01/CP-04): registro de empresa+usuario via POST /empresas y login posterior entrega JWT válido", async () => {
    // 1) Registro: INSERT usuario, INSERT empresa, INSERT vínculo admin
    mockQueryOnce({
      rows: [
        {
          id: 1,
          nombre_usuario: "pepe",
          correo: "p@e.com",
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    mockQueryOnce({ rows: [{ id: 5, nombre: "ACME" }] });
    mockQueryOnce({ rows: [{ id: 10, empresa_id: 5, usuario_id: 1, rol_id: 1 }] });

    const reg = await request.post("/empresas").send({
      usuario: {
        nombre_usuario: "pepe",
        contrasena_hash: "clave",
        correo: "p@e.com",
      },
      empresa: { nombre: "ACME", correo: "a@b.com" },
    });

    expect(reg.status).toBe(201);
    expect(reg.body.usuario.id).toBe(1);
    expect(reg.body.empresa.id).toBe(5);

    // 2) Login con las credenciales recién creadas
    mockQueryOnce({
      rows: [{ id: 1, nombre_usuario: "pepe", contrasena_hash: "clave" }],
    });
    mockQueryOnce({ rows: [{ id: 10, empresa_id: 5 }] });
    mockQueryOnce({ rows: [] }); // INSERT auditoría LOGIN

    const login = await request
      .post("/autenticacion/login")
      .send({ nombre_usuario: "pepe", password: "clave" });

    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
    const decoded = jwt.verify(login.body.token, JWT_SECRET);
    expect(decoded.usuarioId).toBe(1);
    expect(decoded.nombreUsuario).toBe("pepe");
    expect(decoded.empresaUsuarioId).toBe(10);
    expect(decoded.empresaId).toBe(5);
  }, 15000);

  test("IT-02 (CP-02): login con contraseña incorrecta responde 401 sin token", async () => {
    mockQueryOnce({
      rows: [{ id: 1, nombre_usuario: "admin", contrasena_hash: "admin123" }],
    });

    const res = await request
      .post("/autenticacion/login")
      .send({ nombre_usuario: "admin", password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
    expect(res.body.token).toBeUndefined();
  }, 15000);

  test("IT-03 (CP-03): endpoints protegidos sin token responden 401", async () => {
    const sinToken = await request.get("/usuarios");
    expect(sinToken.status).toBe(401);

    const estados = await request.get("/contratos/estados");
    expect(estados.status).toBe(401);
    expect(estados.body.error).toBe("No autorizado");

    const crearCliente = await request
      .post("/clientes")
      .send({ nombre: "ACME" });
    expect(crearCliente.status).toBe(401);
  });

  test("IT-04 (CP-06/CP-07/CP-08): jornada cliente -> contrato con PDF -> estados -> descarga del archivo", async () => {
    // 1) Crear cliente: INSERT cliente + INSERT auditoría
    mockQueryOnce({ rows: [{ id: 2, nombre: "ACME", empresa_id: 1 }] });
    mockQueryOnce({ rows: [] });

    const cliente = await request
      .post("/clientes")
      .set("Authorization", auth({ empresaId: 1 }))
      .send({ nombre: "ACME", correo: "a@b.com" });

    expect(cliente.status).toBe(201);
    expect(cliente.body.nombre).toBe("ACME");
    // CP-06: el empresa_id se asigna desde el token
    expect(pool.query.mock.calls[0][1]).toContain(1);
    const auditoriaCliente = pool.query.mock.calls[1][0];
    expect(auditoriaCliente).toContain("INSERT INTO auditoria");

    // 2) Crear contrato con PDF: INSERT contrato + INSERT documento + auditoría
    mockQueryOnce({
      rows: [{ id: 7, cliente_id: 2, titulo: "Contrato B" }],
    });
    mockQueryOnce({ rows: [{ id: 3 }] });
    mockQueryOnce({ rows: [] });

    const contrato = await request
      .post("/contratos")
      .set("Authorization", auth({ empresaId: 1 }))
      .field("cliente_id", "2")
      .field("titulo", "Contrato B")
      .field("fecha_inicio", "2024-01-01")
      .field("fecha_fin", "2024-12-31")
      .attach("file", Buffer.from("%PDF-1.4 test"), "documento.pdf");

    expect(contrato.status).toBe(201);
    expect(contrato.body.titulo).toBe("Contrato B");

    // 3) Estados de contratos (CP-08): por_vencer + vencido
    mockQueryOnce({
      rows: [
        {
          id: 7,
          cliente_id: 2,
          titulo: "Contrato B",
          fecha_fin: new Date(Date.now() + 10 * 86400000)
            .toISOString()
            .split("T")[0],
        },
      ],
    });
    mockQueryOnce({
      rows: [
        {
          id: 8,
          cliente_id: 2,
          titulo: "Contrato viejo",
          fecha_fin: new Date(Date.now() - 5 * 86400000)
            .toISOString()
            .split("T")[0],
        },
      ],
    });

    const estados = await request
      .get("/contratos/estados")
      .set("Authorization", auth({ empresaId: 1 }));

    expect(estados.status).toBe(200);
    expect(estados.body).toHaveLength(2);
    expect(estados.body[0].estado).toBe("por_vencer");
    expect(estados.body[1].estado).toBe("vencido");

    // 4) Descarga del PDF del contrato
    mockQueryOnce({ rows: [{ document: Buffer.from("%PDF-1.4 test") }] });

    const archivo = await request.get("/contratos/7/file");
    expect(archivo.status).toBe(200);
    expect(archivo.headers["content-type"]).toContain("application/pdf");
  });

  test("IT-05 (CP-09): GET /contratos/dashboard devuelve estadísticas numéricas de la empresa", async () => {
    mockQueryOnce({ rows: [{ total: "3" }] });
    mockQueryOnce({ rows: [{ total: "5" }] });
    mockQueryOnce({ rows: [{ total: "1" }] });
    mockQueryOnce({ rows: [{ total: "2" }] });
    mockQueryOnce({ rows: [{ total: "4" }] });

    const res = await request
      .get("/contratos/dashboard")
      .set("Authorization", auth({ empresaId: 1 }));

    expect(res.status).toBe(200);
    expect(res.body.totalUsuarios).toBe(3);
    expect(res.body.totalClientes).toBe(5);
    expect(res.body.contratosVencen7Dias).toBe(1);
    expect(res.body.contratosVencen15Dias).toBe(2);
    expect(res.body.contratosVencen30Dias).toBe(4);
  });

  test("IT-06 (CP-10): registrar y listar logs de auditoría", async () => {
    mockQueryOnce({
      rows: [{ id: 1, usuario_id: "admin", accion: "ACCION: detalle" }],
    });

    const crear = await request
      .post("/auditoria")
      .send({ accion: "ACCION", detalles: "detalle" });

    expect(crear.status).toBe(201);
    expect(crear.body.accion).toBe("ACCION: detalle");

    mockQueryOnce({
      rows: [{ id: 1, usuario_id: "admin", accion: "ACCION: detalle" }],
    });

    const lista = await request.get("/auditoria");
    expect(lista.status).toBe(200);
    expect(Array.isArray(lista.body)).toBe(true);
    expect(lista.body).toHaveLength(1);
  });
});
