const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiClientError } = require("../src/api/client");
const { toUiErrorModel } = require("../src/ui/ui-error-model");

test("maps ApiClientError preserving backend contract fields", () => {
  const error = new ApiClientError({
    status: 504,
    code: "CALC_TIMEOUT",
    message: "Calculation exceeded 10000 ms timeout",
    traceId: "trace-ui",
    requestTraceId: "trace-request"
  });

  const model = toUiErrorModel(error, {
    code: "UI_FALLBACK",
    message: "fallback"
  });

  assert.equal(model.code, "CALC_TIMEOUT");
  assert.equal(model.message, "Calculation exceeded 10000 ms timeout");
  assert.equal(model.traceId, "trace-ui");
  assert.equal(model.requestTraceId, "trace-request");
  assert.equal(model.status, 504);
  assert.equal(model.source, "api");
});

test("maps unknown error to fallback ui code", () => {
  const model = toUiErrorModel(new Error("boom"), {
    code: "UI_RESULT_ERROR",
    message: "Result loading failed"
  });

  assert.equal(model.code, "UI_RESULT_ERROR");
  assert.equal(model.message, "boom");
  assert.equal(model.traceId, "");
  assert.equal(model.requestTraceId, "");
  assert.equal(model.status, 0);
  assert.equal(model.source, "ui");
});
