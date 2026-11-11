// ============================================================================
// Pruebas GLOBALES — Jornadas de negocio sobre API real + BD estática (PG-01..PG-07)
// El stack debe estar arriba: docker compose up -d --build
// Uso (desde BACKEND/): npm run test:globales
// ============================================================================
const { pool } = require("../../src/db");
const { pedir, obtenerToken } = require("./ayudas");

let token; // token de admin, compartido por las jornadas

beforeAll(async () => {
  token = await obtenerToken("admin", "admin");
});

// PG-01: Login real genera un JWT utilizable contra la API
test("PG-01: login de admin devuelve un JWT que autentica el listado de clientes", async () => {
  const { status, datos } = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: "admin", password: "admin" },
  });

  expect(status).toBe(200);
  expect(typeof datos.token).toBe("string");

  // El payload debe identificar al usuario y a su empresa (empresa 1 del dump)
  const payload = JSON.parse(
    Buffer.from(datos.token.split(".")[1], "base64url").toString("utf8")
  );
  expect(payload.nombreUsuario).toBe("admin");
  expect(payload.empresaId).toBe("1");
  expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

  // El token autentica un endpoint protegido con delay de 4 s
  const listado = await pedir("GET", "/clientes", { token: datos.token });
  expect(listado.status).toBe(200);
  expect(Array.isArray(listado.datos)).toBe(true);
  expect(listado.datos).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ nombre: "María González" }),
      expect.objectContaining({ nombre: "Pedro Morales" }),
    ])
  );
  // Aislamiento por empresa: todos los clientes pertenecen a la empresa 1
  expect(listado.datos.every((c) => c.empresa_id === "1")).toBe(true);
});

// PG-02: Ciclo completo de cliente (CRUD) contra la BD real
test("PG-02: ciclo crear > leer > editar > buscar > eliminar de un cliente", async () => {
  // Crear
  const creacion = await pedir("POST", "/clientes", {
    token,
    body: {
      nombre: "PG-Cliente Ciclo",
      correo: "pg.ciclo@atlasfake.com",
      telefono: "911111111",
      direccion: "Calle de Prueba 123",
    },
  });
  expect(creacion.status).toBe(201);
  expect(creacion.datos.id).toBeDefined();
  const id = creacion.datos.id;

  // Leer por id
  const lectura = await pedir("GET", `/clientes/${id}`, { token });
  expect(lectura.status).toBe(200);
  expect(lectura.datos.nombre).toBe("PG-Cliente Ciclo");

  // Editar (PUT reemplaza los campos, se envían todos los obligatorios)
  const edicion = await pedir("PUT", `/clientes/${id}`, {
    token,
    body: {
      nombre: "PG-Cliente Editado",
      correo: "pg.ciclo@atlasfake.com",
      telefono: "922222222",
      direccion: "Calle Editada 456",
    },
  });
  expect(edicion.status).toBe(200);
  expect(edicion.datos.nombre).toBe("PG-Cliente Editado");

  // Buscar por nombre (endpoint /search)
  const busqueda = await pedir("GET", "/clientes/search?name=PG-Cliente", {
    token,
  });
  expect(busqueda.status).toBe(200);
  expect(busqueda.datos).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id, nombre: "PG-Cliente Editado" }),
    ])
  );

  // Eliminar
  const borrado = await pedir("DELETE", `/clientes/${id}`, { token });
  expect(borrado.status).toBe(200);
  expect(borrado.datos).toEqual({ deleted: true });

  // Verificar que ya no existe
  const trasBorrado = await pedir("GET", `/clientes/${id}`, { token });
  expect(trasBorrado.status).toBe(404);
});

// PG-03: Contrato con archivo PDF (multipart) — ciclo completo
test("PG-03: contrato con PDF crear > listar > descargar > eliminar", async () => {
  // Cliente propio para no tocar los datos del dump
  const cliente = await pedir("POST", "/clientes", {
    token,
    body: { nombre: "PG-Cliente Contrato", correo: "pg.contrato@atlasfake.com" },
  });
  expect(cliente.status).toBe(201);
  const clienteId = cliente.datos.id;

  try {
    // Crear contrato con archivo PDF adjunto (multipart/form-data)
    const form = new FormData();
    form.append("cliente_id", String(clienteId));
    form.append("titulo", "PG-Contrato con PDF");
    form.append("descripcion", "Contrato de prueba de la fase global");
    form.append("fecha_inicio", "2026-11-01");
    form.append("fecha_fin", "2027-10-31");
    form.append(
      "file",
      new Blob(["%PDF-1.4\n% documento de prueba\ntrailer<</Root 1 0 R>>\n%%EOF"], {
        type: "application/pdf",
      }),
      "contrato.pdf"
    );
    const creacion = await fetch("http://localhost:4450/contratos", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    expect(creacion.status).toBe(201);
    const contrato = await creacion.json();
    expect(contrato.id).toBeDefined();

    // Aparece en el listado general (delay 4 s)
    const listado = await pedir("GET", "/contratos", { token });
    expect(listado.status).toBe(200);
    expect(listado.datos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contrato.id,
          titulo: "PG-Contrato con PDF",
          cliente_nombre: "PG-Cliente Contrato",
        }),
      ])
    );

    // Detalle por id
    const detalle = await pedir("GET", `/contratos/${contrato.id}`, { token });
    expect(detalle.status).toBe(200);
    expect(detalle.datos.descripcion).toBe("Contrato de prueba de la fase global");

    // Descargar el PDF
    const descarga = await fetch(
      `http://localhost:4450/contratos/${contrato.id}/file`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(descarga.status).toBe(200);
    expect(descarga.headers.get("content-type")).toContain("application/pdf");
    const bytes = Buffer.from(await descarga.arrayBuffer());
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    // Eliminar contrato (borra también el documento)
    const borrado = await pedir("DELETE", `/contratos/${contrato.id}`, { token });
    expect(borrado.status).toBe(200);
    expect(borrado.datos).toEqual({ deleted: true });

    const trasBorrado = await pedir("GET", `/contratos/${contrato.id}`, { token });
    expect(trasBorrado.status).toBe(404);
  } finally {
    // Limpieza: el cliente se borra al final (los contratos ya no existen)
    await pedir("DELETE", `/clientes/${clienteId}`, { token });
  }
});

// PG-04: Servicio de estados clasifica contratos por vencer y vencidos
test("PG-04: /contratos/estados clasifica vencido y por_vencer con fechas reales", async () => {
  const ayer = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const en10Dias = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];

  const vencido = await pedir("POST", "/contratos", {
    token,
    body: {
      cliente_id: 1,
      titulo: "PG-Contrato Vencido",
      fecha_inicio: "2026-01-01",
      fecha_fin: ayer,
    },
  });
  const porVencer = await pedir("POST", "/contratos", {
    token,
    body: {
      cliente_id: 1,
      titulo: "PG-Contrato Por Vencer",
      fecha_inicio: "2026-01-01",
      fecha_fin: en10Dias,
    },
  });
  expect(vencido.status).toBe(201);
  expect(porVencer.status).toBe(201);

  try {
    const estados = await pedir("GET", "/contratos/estados", { token });
    expect(estados.status).toBe(200);
    expect(Array.isArray(estados.datos)).toBe(true);

    const encontradoVencido = estados.datos.find(
      (c) => c.id === vencido.datos.id
    );
    const encontradoPorVencer = estados.datos.find(
      (c) => c.id === porVencer.datos.id
    );
    expect(encontradoVencido).toEqual(
      expect.objectContaining({ estado: "vencido" })
    );
    expect(encontradoPorVencer).toEqual(
      expect.objectContaining({ estado: "por_vencer" })
    );
  } finally {
    await pedir("DELETE", `/contratos/${vencido.datos.id}`, { token });
    await pedir("DELETE", `/contratos/${porVencer.datos.id}`, { token });
  }
});

// PG-05: Métricas calculadas con datos reales de la BD
test("PG-05: /metricas devuelve cifras coherentes con la BD estática", async () => {
  const res = await pedir("GET", "/metricas", { token }); // delay 4 s
  expect(res.status).toBe(200);

  const m = res.datos.metricas;
  expect(typeof m.totalClientes).toBe("number");
  expect(typeof m.totalUsuarios).toBe("number");
  expect(Array.isArray(res.datos.contratosProximosAVencer)).toBe(true);
  expect(Array.isArray(res.datos.contratosVencidos)).toBe(true);

  // Cotejo directo contra la BD (misma consulta, mismo instante, sin paralelismo)
  const clientes = await pool.query(
    "SELECT count(*)::int AS n FROM clientes WHERE empresa_id = 1"
  );
  const usuarios = await pool.query(
    "SELECT count(*)::int AS n FROM empresa_usuarios WHERE empresa_id = 1"
  );
  const vencidos = await pool.query(
    `SELECT count(*)::int AS n FROM contratos c
     INNER JOIN clientes cl ON cl.id = c.cliente_id
     WHERE cl.empresa_id = 1 AND c.fecha_fin < CURRENT_DATE`
  );

  expect(m.totalClientes).toBe(clientes.rows[0].n);
  expect(m.totalUsuarios).toBe(usuarios.rows[0].n);
  expect(res.datos.contratosVencidos).toHaveLength(vencidos.rows[0].n);
});

// PG-06: Dashboard del contrato con conteos reales
test("PG-06: /contratos/dashboard devuelve conteos coherentes con la BD", async () => {
  const res = await pedir("GET", "/contratos/dashboard", { token });
  expect(res.status).toBe(200);

  const clientes = await pool.query(
    "SELECT count(*)::int AS n FROM clientes WHERE empresa_id = 1"
  );
  const usuarios = await pool.query(
    "SELECT count(*)::int AS n FROM empresa_usuarios WHERE empresa_id = 1"
  );
  const vencen7 = await pool.query(
    `SELECT count(*)::int AS n FROM contratos c
     INNER JOIN clientes cl ON cl.id = c.cliente_id
     WHERE cl.empresa_id = 1
       AND c.fecha_fin >= CURRENT_DATE AND c.fecha_fin <= CURRENT_DATE + 7`
  );

  expect(res.datos.totalClientes).toBe(clientes.rows[0].n);
  expect(res.datos.totalUsuarios).toBe(usuarios.rows[0].n);
  expect(res.datos.contratosVencen7Dias).toBe(vencen7.rows[0].n);
  expect(typeof res.datos.contratosVencen15Dias).toBe("number");
  expect(typeof res.datos.contratosVencen30Dias).toBe("number");
});

// PG-07: La auditoría registra logins y creaciones
test("PG-07: /auditoria registra el login y la creación de clientes", async () => {
  const creacion = await pedir("POST", "/clientes", {
    token,
    body: { nombre: "PG-Cliente Auditoria", correo: "pg.audit@atlasfake.com" },
  });
  expect(creacion.status).toBe(201);

  try {
    const res = await pedir("GET", "/auditoria", { token });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.datos)).toBe(true);

    const login = res.datos.find(
      (a) => a.usuario_id === "admin" && a.accion === "LOGIN: usuario inició sesión"
    );
    expect(login).toBeDefined();
    expect(login.fecha_hora).toBeDefined();

    const creacionAudit = res.datos.find(
      (a) =>
        a.usuario_id === "admin" &&
        a.accion === "CLIENTES_CREAR: creó cliente PG-Cliente Auditoria"
    );
    expect(creacionAudit).toBeDefined();
  } finally {
    await pedir("DELETE", `/clientes/${creacion.datos.id}`, { token });
  }
});
