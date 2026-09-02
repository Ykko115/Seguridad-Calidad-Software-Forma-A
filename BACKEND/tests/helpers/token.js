const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "inseguro";

function createToken(overrides = {}) {
  const payload = {
    usuarioId: 1,
    nombreUsuario: "admin",
    empresaUsuarioId: 1,
    empresaId: 1,
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

module.exports = { createToken, JWT_SECRET };
