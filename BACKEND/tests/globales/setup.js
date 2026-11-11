// Entorno de las pruebas globales. Corre ANTES de cargar cualquier test,
// por lo que fija DATABASE_URL antes de que src/db.js lo lea (dotenv no
// sobreescribe variables ya presentes en process.env).
require("dotenv").config({
  path: require("path").join(__dirname, "..", "..", ".env"),
});

// BD estática del proyecto: Postgres del docker-compose (dump-atlas.sql)
// en el puerto 15432. Se puede sobrescribir con GLOBALES_DATABASE_URL si
// se necesita apuntar a otra instancia.
process.env.DATABASE_URL =
  process.env.GLOBALES_DATABASE_URL ||
  "postgres://postgres:postgres@localhost:15432/atlas";
