const { pool } = require("../../src/db");

function mockQueryOnce(result) {
  pool.query.mockResolvedValueOnce(result);
}

function mockQuery(result) {
  pool.query.mockResolvedValue(result);
}

function mockQueryErrorOnce(error) {
  pool.query.mockRejectedValueOnce(error);
}

function mockQueryError(error) {
  pool.query.mockRejectedValue(error);
}

function resetMock() {
  if (pool.query && pool.query.mockClear) pool.query.mockClear();
}

module.exports = {
  pool,
  mockQueryOnce,
  mockQuery,
  mockQueryErrorOnce,
  mockQueryError,
  resetMock,
};
