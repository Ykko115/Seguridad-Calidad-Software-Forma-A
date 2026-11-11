const { pedir, obtenerToken } = require("./ayudas");

let token;

beforeAll(async () => {
  token = await obtenerToken("admin", "admin");
});

test("PG-13: PUT de contrato con un solo campo no pisa los demás campos", async () => {
  const creacion = await pedir("POST", "/contratos", {
    token,
    body: {
      cliente_id: 1,
      titulo: "PG-Contrato Parcial",
      descripcion: "Descripción original",
      fecha_inicio: "2026-03-01",
      fecha_fin: "2026-09-30",
    },
  });
  expect(creacion.status).toBe(201);
  const id = creacion.datos.id;

  try {
    const edicion = await pedir("PUT", `/contratos/${id}`, {
      token,
      body: { descripcion: "Descripción modificada por regresión" },
    });
    expect(edicion.status).toBe(200);
    expect(edicion.datos.descripcion).toBe("Descripción modificada por regresión");
    expect(edicion.datos.titulo).toBe("PG-Contrato Parcial");
    expect(edicion.datos.fecha_inicio).toBe("2026-03-01T00:00:00.000Z");
    expect(edicion.datos.fecha_fin).toBe("2026-09-30T00:00:00.000Z");

    const lectura = await pedir("GET", `/contratos/${id}`, { token });
    expect(lectura.status).toBe(200);
    expect(lectura.datos.descripcion).toBe("Descripción modificada por regresión");
    expect(lectura.datos.titulo).toBe("PG-Contrato Parcial");
  } finally {
    await pedir("DELETE", `/contratos/${id}`, { token });
  }
});

test("PG-14: búsqueda /clientes/search encuentra datos reales y filtra", async () => {
  const maria = await pedir("GET", "/clientes/search?name=Mar%C3%ADa", { token });
  expect(maria.status).toBe(200);
  expect(maria.datos).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ nombre: "María González" }),
    ])
  );

  const vacia = await pedir("GET", "/clientes/search?name=zzz-no-existe", {
    token,
  });
  expect(vacia.status).toBe(200);
  expect(vacia.datos).toEqual([]);

  const sinParam = await pedir("GET", "/clientes/search", { token });
  expect(sinParam.status).toBe(200);
  expect(Array.isArray(sinParam.datos)).toBe(true);
});

test("PG-15: violación de integridad en la BD responde 500 con glosa", async () => {
  const fkRota = await pedir("POST", "/contratos", {
    token,
    body: {
      cliente_id: 999999,
      titulo: "PG-Contrato FK Rota",
      fecha_inicio: "2026-01-01",
      fecha_fin: "2026-12-31",
    },
  });
  expect(fkRota.status).toBe(500);
  expect(fkRota.datos.error).toBe("Error al crear contrato");
  expect(typeof fkRota.datos.glosa).toBe("string");
  expect(fkRota.datos.glosa.length).toBeGreaterThan(0);

  const sinNombre = await pedir("POST", "/clientes", {
    token,
    body: { correo: "pg.sinnombre@atlasfake.com" },
  });
  expect(sinNombre.status).toBe(500);
  expect(sinNombre.datos.error).toBe("Error al crear cliente");
  expect(typeof sinNombre.datos.glosa).toBe("string");
  expect(sinNombre.datos.glosa.length).toBeGreaterThan(0);
});
