// ============================================================================
// Servidor MSW para pruebas de INTEGRACIÓN del frontend (plan EP1, 3.2.4).
// Mock a nivel de red: los componentes usan el axios/interceptor/AuthContext
// REALES; solo el transporte HTTP es simulado con los mismos contratos que
// la API Express real.
// ============================================================================
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function makeToken(overrides = {}) {
  const payload = {
    usuarioId: 1,
    nombreUsuario: 'admin',
    empresaUsuarioId: 10,
    empresaId: 5,
    ...overrides,
  };
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`;
}

function seedDb() {
  return {
    usuarios: [{ id: 1, nombre_usuario: 'admin', correo: 'admin@test.com' }],
    clientes: [
      {
        id: 1,
        empresa_id: 5,
        es_empresa: false,
        rut: '11111111-1',
        nombre: 'ACME',
        correo: 'a@b.com',
        telefono: '123',
      },
    ],
    contratos: [
      {
        id: 1,
        cliente_id: 1,
        titulo: 'Contrato Anual',
        descripcion: 'Servicios',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2026-12-31',
        created_at: '2024-01-02T00:00:00.000Z',
        cliente_nombre: 'ACME',
      },
    ],
    auditoria: [],
    metricas: {
      metricas: {
        totalUsuarios: 3,
        totalClientes: 5,
        contratos7Dias: 1,
        contratos15Dias: 2,
        contratos30Dias: 4,
      },
      contratosProximosAVencer: [
        { id: 1, cliente: 'ACME', fechaVencimiento: '2026-10-15', diasRestantes: 16 },
      ],
      contratosVencidos: [
        { id: 9, cliente: 'Beta', fechaVencimiento: '2026-01-01', diasVencidos: 271 },
      ],
    },
    nextId: { cliente: 2, contrato: 2, auditoria: 1, usuario: 2 },
  };
}

export const db = seedDb();

export function resetDb() {
  const fresh = seedDb();
  db.usuarios = fresh.usuarios;
  db.clientes = fresh.clientes;
  db.contratos = fresh.contratos;
  db.auditoria = fresh.auditoria;
  db.metricas = fresh.metricas;
  db.nextId = fresh.nextId;
}

function audit(usuario, accion) {
  db.auditoria.unshift({
    id: db.nextId.auditoria++,
    usuario_id: usuario,
    accion,
  });
}

// Captura del FormData real construido por los componentes (vía
// transformRequest de axios en los tests). El puente XHR de jsdom no
// preserva los bytes multipart hasta MSW, así que el test observa el
// FormData real y el handler lo usa para construir el 201.
let capturedUpload = null;

export function setCapturedUpload(upload) {
  capturedUpload = upload;
}

export function takeCapturedUpload() {
  const u = capturedUpload;
  capturedUpload = null;
  return u;
}

// Parseo multipart mínimo (fallback cuando el Content-Type no viaja por el
// interceptor XHR de jsdom y request.formData() no puede usarse).
function parseMultipart(text) {
  const firstLine = (text.split('\r\n', 1)[0] || text.split('\n', 1)[0]).trim();
  const boundary = firstLine.replace(/^--/, '');
  const fields = {};
  const files = {};
  for (const part of text.split(`--${boundary}`)) {
    const m = part.match(/name="([^"]+)"(?:;\s*filename="([^"]+)")?/);
    if (!m) continue;
    const chunks = part.split(/\r\n\r\n|\n\n/);
    if (chunks.length < 2) continue;
    const value = chunks
      .slice(1)
      .join('\n\n')
      .replace(/(\r\n|\n)--\s*$/, '')
      .replace(/(\r\n|\n)$/, '');
    if (m[2]) files[m[1]] = { filename: m[2], content: value };
    else fields[m[1]] = value;
  }
  return { fields, files };
}

function requireAuth(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

export const handlers = [
  // --- Autenticación -------------------------------------------------------
  http.post('*/autenticacion/login', async ({ request }) => {
    const body = await request.json();
    if (body.nombre_usuario === 'admin' && body.password === 'admin') {
      audit('admin', 'LOGIN: usuario inició sesión');
      return HttpResponse.json({ token: makeToken() });
    }
    return HttpResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }),

  // --- Registro (crea usuario + empresa + rol admin) ------------------------
  http.post('*/empresas', async ({ request }) => {
    const body = await request.json();
    if (body.usuario && body.empresa) {
      const usuario = {
        id: db.nextId.usuario++,
        nombre_usuario: body.usuario.nombre_usuario,
        correo: body.usuario.correo,
        created_at: new Date().toISOString(),
      };
      db.usuarios.unshift(usuario);
      const empresa = { id: 5, ...body.empresa };
      audit(usuario.nombre_usuario, 'EMPRESAS_CREAR: creó empresa ' + empresa.nombre);
      return HttpResponse.json({ usuario, empresa }, { status: 201 });
    }
    return HttpResponse.json({ id: 5, ...body }, { status: 201 });
  }),

  // --- Métricas / dashboard -------------------------------------------------
  http.get('*/metricas', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return HttpResponse.json(db.metricas);
  }),

  // --- Clientes -------------------------------------------------------------
  http.get('*/clientes', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return HttpResponse.json(db.clientes);
  }),
  http.post('*/clientes', async ({ request }) => {
    const token = requireAuth(request);
    if (!token) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const cliente = { id: db.nextId.cliente++, empresa_id: 5, ...body };
    db.clientes.unshift(cliente);
    audit('admin', 'CLIENTES_CREAR: creó cliente ' + cliente.nombre);
    return HttpResponse.json(cliente, { status: 201 });
  }),
  http.put('*/clientes/:id', async ({ request, params }) => {
    const token = requireAuth(request);
    if (!token) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json();
    const item = db.clientes.find((c) => c.id === Number(params.id));
    if (!item) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    Object.assign(item, body);
    audit('admin', 'CLIENTES_ACTUALIZAR: actualizó cliente ID ' + params.id);
    return HttpResponse.json(item);
  }),
  http.delete('*/clientes/:id', ({ request, params }) => {
    const token = requireAuth(request);
    if (!token) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const idx = db.clientes.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    db.clientes.splice(idx, 1);
    audit('admin', 'CLIENTES_ELIMINAR: eliminó cliente ID ' + params.id);
    return HttpResponse.json({ deleted: true });
  }),

  // --- Contratos ------------------------------------------------------------
  http.get('*/contratos', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const rows = db.contratos.map((c) => ({
      ...c,
      cliente_nombre: db.clientes.find((cl) => cl.id === c.cliente_id)?.nombre || 'ACME',
    }));
    return HttpResponse.json(rows);
  }),
  http.post('*/contratos', async ({ request }) => {
    const token = requireAuth(request);
    if (!token) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    // 1) Intento estándar: FormData parseado por MSW.
    let fields = {};
    let files = {};
    try {
      const form = await request.clone().formData();
      for (const [k, v] of form.entries()) {
        if (typeof v === 'string') fields[k] = v;
        else files[k] = { filename: v.name, content: 'binario' };
      }
    } catch {
      // 2) Fallback jsdom/XHR: el test capturó el FormData real vía
      // transformRequest de axios (ver setCapturedUpload).
      const captured = takeCapturedUpload();
      if (captured) {
        fields = captured.fields;
        files = captured.files;
      } else {
        try {
          const parsed = parseMultipart(await request.clone().text());
          fields = parsed.fields;
          files = parsed.files;
        } catch {
          fields = {};
          files = {};
        }
      }
    }
    const contrato = {
      id: db.nextId.contrato++,
      cliente_id: Number(fields.cliente_id),
      titulo: fields.titulo,
      descripcion: fields.descripcion || null,
      fecha_inicio: fields.fecha_inicio,
      fecha_fin: fields.fecha_fin,
      created_at: new Date().toISOString(),
      tieneArchivo: !!files.file,
      nombreArchivo: files.file ? files.file.filename : null,
    };
    db.contratos.unshift(contrato);
    audit('admin', 'CONTRATOS_CREAR: creó contrato ' + contrato.titulo);
    return HttpResponse.json(contrato, { status: 201 });
  }),
  http.get('*/contratos/estados', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return HttpResponse.json([
      { id: 1, titulo: 'Contrato Anual', estado: 'por_vencer' },
      { id: 9, titulo: 'Contrato viejo', estado: 'vencido' },
    ]);
  }),
  http.get('*/contratos/dashboard', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return HttpResponse.json({
      totalUsuarios: 3,
      totalClientes: 5,
      contratosVencen7Dias: 1,
      contratosVencen15Dias: 2,
      contratosVencen30Dias: 4,
    });
  }),
  http.get('*/contratos/:id', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const item = db.contratos.find((c) => c.id === Number(params.id));
    if (!item) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    return HttpResponse.json(item);
  }),
  http.delete('*/contratos/:id', ({ request, params }) => {
    const token = requireAuth(request);
    if (!token) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const idx = db.contratos.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    db.contratos.splice(idx, 1);
    audit('admin', 'CONTRATOS_ELIMINAR: eliminó contrato ID ' + params.id);
    return HttpResponse.json({ deleted: true });
  }),

  // --- Auditoría ------------------------------------------------------------
  http.post('*/auditoria', async ({ request }) => {
    const body = await request.json();
    const entry = {
      id: db.nextId.auditoria++,
      usuario_id: 'admin',
      accion: body.detalles ? `${body.accion}: ${body.detalles}` : body.accion,
    };
    db.auditoria.unshift(entry);
    return HttpResponse.json(entry, { status: 201 });
  }),
  http.get('*/auditoria', () => HttpResponse.json(db.auditoria)),

  // --- Usuarios / empresa-usuarios / empresa --------------------------------
  http.get('*/empresa-usuarios', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return HttpResponse.json(
      db.usuarios.map((u) => ({ ...u, rol: 'administrador' }))
    );
  }),
  http.get('*/usuarios/:id', ({ params }) => {
    const item = db.usuarios.find((u) => u.id === Number(params.id));
    if (!item) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    return HttpResponse.json(item);
  }),
  http.put('*/usuarios/:id', async ({ request, params }) => {
    const body = await request.json();
    const item = db.usuarios.find((u) => u.id === Number(params.id));
    if (!item) return HttpResponse.json({ error: 'No encontrado' }, { status: 404 });
    Object.assign(item, body);
    return HttpResponse.json(item);
  }),
  http.get('*/empresas/:id', ({ params }) =>
    HttpResponse.json({ id: Number(params.id), nombre: 'ACME', direccion: 'Av 1', telefono: '1', correo: 'a@b.com' })
  ),
  http.put('*/empresas/:id', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Number(params.id), ...body });
  }),
];

export const server = setupServer(...handlers);
