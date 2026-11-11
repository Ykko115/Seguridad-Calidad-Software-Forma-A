// ============================================================================
// Entorno de las pruebas globales (se registra en setupFilesAfterEnv).
// - Antes de cada archivo: verifica que la API y la BD estén arriba y limpia
//   datos residuales de corridas anteriores (la BD debe quedar estática).
// - Después de cada archivo: restaura los datos de negocio creados por las
//   pruebas (prefijo "PG-") y borra la auditoría generada durante la corrida.
//   Se cierra el pool al final para que Jest no quede con handles abiertos.
// ============================================================================
const { pool } = require("../../src/db");

const API = process.env.GLOBALES_API_URL || "http://localhost:4450";
let inicioCorrida = null;

async function limpiarDatosDePrueba() {
  await pool.query(
    `DELETE FROM documentos_contrato
     WHERE contract_id IN (SELECT id FROM contratos WHERE titulo LIKE 'PG-%')`
  );
  await pool.query("DELETE FROM contratos WHERE titulo LIKE 'PG-%'");
  await pool.query("DELETE FROM clientes WHERE nombre LIKE 'PG-%'");
}

beforeAll(async () => {
  // 1) La API del docker-compose debe estar respondiendo.
  let apiOk = false;
  try {
    const res = await fetch(`${API}/`);
    apiOk = res.ok;
  } catch {
    apiOk = false;
  }
  if (!apiOk) {
    throw new Error(
      `La API no responde en ${API}. ` +
        `Levanta el stack primero: docker compose up -d --build`
    );
  }

  // 2) La BD estática (dump-atlas.sql) debe ser accesible.
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    throw new Error(
      `No hay conexión a la BD de pruebas (GLOBALES_DATABASE_URL): ${err.message}`
    );
  }

  // 3) Borra residuos de una corrida anterior que se haya interrumpido.
  await limpiarDatosDePrueba();

  inicioCorrida = new Date();
});

afterAll(async () => {
  await limpiarDatosDePrueba();
  if (inicioCorrida) {
    // Auditoría (LOGIN, CLIENTES_*, CONTRATOS_*) generada durante esta corrida.
    await pool.query("DELETE FROM auditoria WHERE fecha_hora >= $1", [
      inicioCorrida,
    ]);
  }
  await pool.end();
});
