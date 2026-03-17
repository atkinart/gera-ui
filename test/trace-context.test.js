const test = require("node:test");
const assert = require("node:assert/strict");

const { createTraceContext } = require("../src/api/trace-context");

test("createTraceContext generates unique prefixed trace ids", () => {
  const context = createTraceContext({ prefix: "ui" });

  const first = context.next();
  const second = context.next();

  assert.ok(first.startsWith("ui-"));
  assert.ok(second.startsWith("ui-"));
  assert.notEqual(first, second);
});
