const test = require("node:test");
const assert = require("node:assert/strict");

const helloNpm = require("../index");

test("helloNpm returns expected greeting", () => {
  assert.equal(helloNpm(), "Hello GERA UI");
});
