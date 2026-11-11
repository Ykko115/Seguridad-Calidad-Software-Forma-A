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

  try {
    await pool.query("SELECT 1");
  } catch (err) {
    throw new Error(
      `No hay conexión a la BD de pruebas (GLOBALES_DATABASE_URL): ${err.message}`
    );
  }

  await limpiarDatosDePrueba();

  inicioCorrida = new Date();
});

afterAll(async () => {
  await limpiarDatosDePrueba();
  if (inicioCorrida) {
    await pool.query("DELETE FROM auditoria WHERE fecha_hora >= $1", [
      inicioCorrida,
    ]);
  }
  await pool.end();
});
