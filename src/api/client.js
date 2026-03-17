const defaultModels = require("./models");
const { createTraceContext } = require("./trace-context");

class ApiClientError extends Error {
  constructor(input) {
    super(input.message || "API request failed");
    this.name = "ApiClientError";
    this.status = input.status || 0;
    this.code = input.code || "API_ERROR";
    this.traceId = input.traceId || "";
    this.requestTraceId = input.requestTraceId || "";
    this.details = input.details;
  }
}

function createApiClient(input) {
  const config = normalizeConfig(input);

  async function request(path, options) {
    const headers = {
      accept: "application/json"
    };

    const requestTraceId = config.traceContext.next();
    headers["x-trace-id"] = requestTraceId;

    const hasBody = options && Object.prototype.hasOwnProperty.call(options, "body");
    if (hasBody) {
      headers["content-type"] = "application/json";
    }

    const token = await getAccessToken(config.getAccessToken);
    if (token) {
      headers.authorization = "Bearer " + token;
    }

    const response = await config.fetchImpl(config.baseUrl + path, {
      method: (options && options.method) || "GET",
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 204) {
      return null;
    }

    const data = await parseBody(response);
    if (!response.ok) {
      throw toApiError(response.status, data, requestTraceId);
    }
    return data;
  }

  return {
    models: defaultModels,

    listProjects(filters) {
      return request("/projects" + toQueryString(filters), { method: "GET" });
    },

    createProject(payload) {
      return request("/projects", { method: "POST", body: payload });
    },

    getProject(projectId) {
      return request("/projects/" + encodeURIComponent(projectId), { method: "GET" });
    },

    updateProject(projectId, payload) {
      return request("/projects/" + encodeURIComponent(projectId), { method: "PUT", body: payload });
    },

    deleteProject(projectId) {
      return request("/projects/" + encodeURIComponent(projectId), { method: "DELETE" });
    },

    markReadyForReview(projectId) {
      return request("/projects/" + encodeURIComponent(projectId) + "/ready-for-review", { method: "POST" });
    },

    calculateProject(projectId) {
      return request("/projects/" + encodeURIComponent(projectId) + "/calculate", { method: "POST" });
    },

    getProjectResult(projectId) {
      return request("/projects/" + encodeURIComponent(projectId) + "/result", { method: "GET" });
    },

    updateProjectReviewStatus(projectId, status) {
      return request("/projects/" + encodeURIComponent(projectId) + "/review-status", {
        method: "POST",
        body: { status }
      });
    },

    updateReview(payload) {
      return request("/reviews", { method: "POST", body: payload });
    }
  };
}

function normalizeConfig(input) {
  if (!input || typeof input !== "object") {
    throw new Error("apiClient config is required");
  }
  if (!input.baseUrl || typeof input.baseUrl !== "string") {
    throw new Error("apiClient baseUrl is required");
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("apiClient fetch implementation is required");
  }

  return {
    baseUrl: input.baseUrl.replace(/\/+$/, ""),
    getAccessToken: input.getAccessToken,
    fetchImpl,
    traceContext: input.traceContext || createTraceContext({ prefix: "ui" })
  };
}

async function getAccessToken(getter) {
  if (!getter) {
    return "";
  }
  const value = await getter();
  if (typeof value !== "string") {
    return "";
  }
  return value;
}

async function parseBody(response) {
  const contentType = response.headers && response.headers.get
    ? response.headers.get("content-type") || ""
    : "";

  if (contentType.toLowerCase().includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }
  return { message: text };
}

function toApiError(status, body, requestTraceId) {
  if (body && typeof body === "object") {
    return new ApiClientError({
      status,
      code: body.code,
      message: body.message,
      traceId: body.traceId || requestTraceId || "",
      requestTraceId: requestTraceId || "",
      details: body.details
    });
  }
  return new ApiClientError({
    status,
    code: "API_ERROR",
    message: "API request failed",
    traceId: requestTraceId || "",
    requestTraceId: requestTraceId || "",
    details: body
  });
}

function toQueryString(filters) {
  if (!filters || typeof filters !== "object") {
    return "";
  }
  const params = new URLSearchParams();
  const keys = Object.keys(filters);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = filters[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(key, String(value));
  }

  const query = params.toString();
  if (!query) {
    return "";
  }
  return "?" + query;
}

module.exports = {
  createApiClient,
  ApiClientError
};
