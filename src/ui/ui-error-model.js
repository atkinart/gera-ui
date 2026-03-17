const { ApiClientError } = require("../api/client");

function toUiErrorModel(error, fallback) {
  const config = normalizeFallback(fallback);

  if (error instanceof ApiClientError) {
    const traceId = error.traceId || error.requestTraceId || "";
    return {
      code: error.code || config.code,
      message: error.message || config.message,
      traceId,
      requestTraceId: error.requestTraceId || traceId,
      status: error.status || 0,
      source: "api"
    };
  }

  return {
    code: config.code,
    message: messageOf(error) || config.message,
    traceId: "",
    requestTraceId: "",
    status: 0,
    source: "ui"
  };
}

function normalizeFallback(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    code: isText(source.code) ? source.code : "UI_ERROR",
    message: isText(source.message) ? source.message : "Unexpected UI error"
  };
}

function messageOf(error) {
  if (!error || typeof error !== "object") {
    return "";
  }
  if (!isText(error.message)) {
    return "";
  }
  return error.message;
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

module.exports = {
  toUiErrorModel
};
