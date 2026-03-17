const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiClientError } = require("../src/api/client");
const {
  createProjectsListScreen
} = require("../src/ui/projects-list-screen");

test("teacher mode passes full filter set and enables review", async () => {
  let capturedFilters = null;
  const screen = createProjectsListScreen({
    apiClient: {
      listProjects: async (filters) => {
        capturedFilters = filters;
        return {
          items: [
            {
              projectId: "prj_1",
              name: "Kupol",
              status: "READY",
              reviewStatus: "PENDING",
              ownerUserId: "student-1",
              ownerFullName: "Ivan Petrov",
              ownerGroup: "A-01",
              updatedAt: "2026-02-24T10:00:00Z"
            }
          ]
        };
      }
    }
  });

  const result = await screen.load({
    role: "teacher",
    filters: {
      group: "A-01",
      surname: "Petrov",
      name: "Kup",
      dateFrom: "2026-02-01T00:00:00Z",
      dateTo: "2026-02-28T23:59:59Z"
    }
  });

  assert.deepEqual(capturedFilters, {
    surname: "Petrov",
    group: "A-01",
    name: "Kup",
    dateFrom: "2026-02-01T00:00:00Z",
    dateTo: "2026-02-28T23:59:59Z"
  });
  assert.equal(result.mode, "teacher");
  assert.equal(result.total, 1);
  assert.equal(result.items[0].canReview, true);
  assert.equal(result.items[0].canMarkReadyForReview, false);
  assert.equal(result.error, null);
});

test("student mode limits filters and disables review", async () => {
  let capturedFilters = null;
  const screen = createProjectsListScreen({
    apiClient: {
      listProjects: async (filters) => {
        capturedFilters = filters;
        return {
          items: [
            {
              projectId: "prj_2",
              name: "Most",
              status: "DRAFT",
              reviewStatus: "PENDING",
              ownerUserId: "student-2",
              ownerFullName: "Petr Ivanov",
              ownerGroup: "B-01",
              updatedAt: "2026-02-24T11:00:00Z"
            }
          ]
        };
      }
    }
  });

  const result = await screen.load({
    role: "student",
    filters: {
      name: "Most",
      group: "B-01"
    }
  });

  assert.deepEqual(capturedFilters, { name: "Most" });
  assert.equal(result.mode, "student");
  assert.equal(result.items[0].canReview, false);
  assert.equal(result.items[0].canMarkReadyForReview, true);
  assert.equal(result.items[0].canCalculate, true);
  assert.equal(result.error, null);
});

test("returns empty view model when list is empty", async () => {
  const screen = createProjectsListScreen({
    apiClient: {
      listProjects: async () => ({ items: [] })
    }
  });

  const result = await screen.load({ role: "teacher" });

  assert.equal(result.total, 0);
  assert.equal(result.empty, true);
  assert.deepEqual(result.items, []);
  assert.equal(result.error, null);
});

test("throws on unsupported role", async () => {
  const screen = createProjectsListScreen({
    apiClient: {
      listProjects: async () => ({ items: [] })
    }
  });

  await assert.rejects(
    () => screen.load({ role: "admin" }),
    /projectsListScreen role must be student or teacher/
  );
});

test("returns unified error model when list request fails", async () => {
  const screen = createProjectsListScreen({
    apiClient: {
      listProjects: async () => {
        throw new ApiClientError({
          status: 403,
          code: "FORBIDDEN",
          message: "Forbidden",
          traceId: "trace-list"
        });
      }
    }
  });

  const result = await screen.load({ role: "teacher" });

  assert.equal(result.total, 0);
  assert.equal(result.error.code, "FORBIDDEN");
  assert.equal(result.error.traceId, "trace-list");
});
