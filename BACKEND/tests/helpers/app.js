const request = require("supertest");
const app = require("../../src/app");

function makeRequest() {
  return request(app);
}

module.exports = { makeRequest };
