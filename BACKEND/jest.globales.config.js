// ============================================================================
// Pruebas GLOBALES del sistema (Encargo 3, Fase 1)
// API Express + Postgres REAL con el dump estático del proyecto.
// A diferencia de tests/integracion_api.test.js, NADA se mockea: las jornadas
// tocan la BD del docker-compose.
//
// Requisito: el stack completo arriba (API + BD con el dump):
//   docker compose up -d --build
// (tests/globales/entorno.js verifica que la API y la BD respondan antes
// de correr y restaura los datos creados al terminar cada archivo).
//
// Uso (desde BACKEND/):  npm run test:globales
// ============================================================================
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/globales/**/*.test.js"],
  // setupFiles corre antes de cargar los tests: fija DATABASE_URL antes de
  // que src/db (dotenv) lo lea.
  setupFiles: ["<rootDir>/tests/globales/setup.js"],
  setupFilesAfterEnv: [
    // Silencia console.log/error igual que el resto de las suites del repo.
    "<rootDir>/tests/setup.js",
    // Verifica API + BD, limpia residuos al inicio y restaura la BD,
    // y cierra el pool al terminar cada archivo.
    "<rootDir>/tests/globales/entorno.js",
  ],
  // Varios endpoints tienen un delay artificial de 4 s (login, GET /clientes,
  // GET /contratos, GET /metricas): el timeout por defecto (5 s) no alcanza.
  testTimeout: 60000,
  // Serial: los tests cotejan conteos y auditoría contra la MISMA BD estática,
  // en paralelo podrían pisarse entre archivos (flakiness).
  maxWorkers: 1,
};
