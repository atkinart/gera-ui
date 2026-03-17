const crypto = require("crypto");

function createTraceContext(input) {
  const config = input && typeof input === "object" ? input : {};
  const prefix = normalizePrefix(config.prefix);

  return {
    next() {
      return prefix + "-" + randomPart();
    }
  };
}

function normalizePrefix(value) {
  if (typeof value !== "string") {
    return "ui";
  }
  const text = value.trim().toLowerCase();
  if (!text) {
    return "ui";
  }
  return text.replace(/[^a-z0-9-]/g, "");
}

function randomPart() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return crypto.randomBytes(16).toString("hex");
}

module.exports = {
  createTraceContext
};
