const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiClientError } = require("../src/api/client");
const {
  createTeacherReviewScreen
} = require("../src/ui/teacher-review-screen");

test("loadAll returns teacher list with review actions", async () => {
  let capturedFilters = null;
  const screen = createTeacherReviewScreen({
    apiClient: {
      listProjects: async (filters) => {
        capturedFilters = filters;
        return {
          items: [
            {
              projectId: "prj_41",
              name: "Kupol",
              status: "READY",
              reviewStatus: "PENDING",
              ownerUserId: "student-1",
              ownerFullName: "Ivan Petrov",
              ownerGroup: "A-01",
              updatedAt: "2026-02-24T16:00:00Z"
            }
          ]
        };
      },
      updateReview: async () => ({
        projectId: "prj_41",
        reviewStatus: "APPROVED"
      })
    }
  });

  const state = await screen.loadAll({
    surname: "Petrov",
    group: "A-01",
    name: "Kup"
  });

  assert.deepEqual(capturedFilters, {
    surname: "Petrov",
    group: "A-01",
    name: "Kup"
  });
  assert.equal(state.mode, "teacher");
  assert.equal(state.total, 1);
  assert.equal(state.items[0].canApprove, true);
  assert.equal(state.items[0].canReject, true);
  assert.equal(state.error, null);
});

test("submitReview sends payload and returns success", async () => {
  let capturedPayload = null;
  const screen = createTeacherReviewScreen({
    apiClient: {
      listProjects: async () => ({ items: [] }),
      updateReview: async (payload) => {
        capturedPayload = payload;
        return {
          projectId: payload.projectId,
          reviewStatus: payload.status
        };
      }
    }
  });

  const result = await screen.submitReview("prj_42", "approved");

  assert.deepEqual(capturedPayload, {
    projectId: "prj_42",
    status: "APPROVED"
  });
  assert.equal(result.ok, true);
  assert.equal(result.reviewStatus, "APPROVED");
});

test("loadAll maps backend errors into UI error model", async () => {
  const screen = createTeacherReviewScreen({
    apiClient: {
      listProjects: async () => {
        throw new ApiClientError({
          status: 403,
          code: "FORBIDDEN",
          message: "Forbidden",
          traceId: "trace-403"
        });
      },
      updateReview: async () => ({
        projectId: "x",
        reviewStatus: "APPROVED"
      })
    }
  });

  const state = await screen.loadAll({});

  assert.equal(state.total, 0);
  assert.equal(state.error.code, "FORBIDDEN");
  assert.equal(state.error.traceId, "trace-403");
});

test("submitReview validates review status", async () => {
  const screen = createTeacherReviewScreen({
    apiClient: {
      listProjects: async () => ({ items: [] }),
      updateReview: async () => ({ projectId: "x", reviewStatus: "APPROVED" })
    }
  });

  await assert.rejects(
    () => screen.submitReview("prj_43", "pending"),
    /reviewStatus must be one of/
  );
});
