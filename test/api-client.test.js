const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createApiClient,
  ApiClientError
} = require("../src/api/client");

test("listProjects uses centralized baseUrl, query and bearer token", async () => {
  const calls = [];
  const api = createApiClient({
    baseUrl: "http://localhost:8080/api/v1",
    getAccessToken: async () => "token-1",
    traceContext: {
      next: () => "trace-1"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: {
          get: () => "application/json"
        },
        json: async () => ({ items: [], status: "OK" })
      };
    }
  });

  const response = await api.listProjects({ group: "A-01", surname: "Petrov" });

  assert.equal(response.status, "OK");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:8080/api/v1/projects?group=A-01&surname=Petrov");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.authorization, "Bearer token-1");
  assert.equal(calls[0].options.headers["x-trace-id"], "trace-1");
});

test("calculateProject sends POST request to calculate endpoint", async () => {
  const calls = [];
  const api = createApiClient({
    baseUrl: "http://localhost:8080/api/v1",
    traceContext: {
      next: () => "trace-2"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        headers: {
          get: () => "application/json"
        },
        json: async () => ({
          projectId: "prj_1",
          calculationStatus: "SUCCESS",
          resultId: "res_1",
          finishedAt: "2026-02-24T13:00:00Z"
        })
      };
    }
  });

  const result = await api.calculateProject("prj_1");

  assert.equal(result.calculationStatus, "SUCCESS");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:8080/api/v1/projects/prj_1/calculate");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["x-trace-id"], "trace-2");
});

test("throws ApiClientError with normalized backend error payload", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:8080/api/v1",
    traceContext: {
      next: () => "trace-3"
    },
    fetchImpl: async () => ({
      ok: false,
      status: 504,
      headers: {
        get: () => "application/json"
      },
      json: async () => ({
        code: "CALC_TIMEOUT",
        message: "Calculation exceeded 10000 ms timeout",
        traceId: "trace-1"
      })
    })
  });

  await assert.rejects(
    () => api.calculateProject("prj_2"),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.status, 504);
      assert.equal(error.code, "CALC_TIMEOUT");
      assert.equal(error.traceId, "trace-1");
      assert.equal(error.requestTraceId, "trace-3");
      return true;
    }
  );
});

test("uses request trace when backend did not return traceId", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:8080/api/v1",
    traceContext: {
      next: () => "trace-4"
    },
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      headers: {
        get: () => "application/json"
      },
      json: async () => ({
        code: "INTERNAL_ERROR",
        message: "unexpected"
      })
    })
  });

  await assert.rejects(
    () => api.getProject("prj_4"),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.traceId, "trace-4");
      assert.equal(error.requestTraceId, "trace-4");
      return true;
    }
  );
});

test("deleteProject returns null for 204 response", async () => {
  const api = createApiClient({
    baseUrl: "http://localhost:8080/api/v1",
    traceContext: {
      next: () => "trace-5"
    },
    fetchImpl: async () => ({
      ok: true,
      status: 204,
      headers: {
        get: () => ""
      },
      text: async () => ""
    })
  });

  const response = await api.deleteProject("prj_3");
  assert.equal(response, null);
});
