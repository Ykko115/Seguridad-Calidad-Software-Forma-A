require("dotenv").config({
  path: require("path").join(__dirname, "..", "..", ".env"),
});

process.env.DATABASE_URL =
  process.env.GLOBALES_DATABASE_URL ||
  "postgres://postgres:postgres@localhost:15432/atlas";
