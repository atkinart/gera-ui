const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiClientError } = require("../src/api/client");
const {
  createProjectCalculationScreen
} = require("../src/ui/project-calculation-screen");

test("createState returns READY for draft project", () => {
  const screen = createProjectCalculationScreen({
    apiClient: {
      calculateProject: async () => ({})
    }
  });

  const state = screen.createState({
    projectId: "prj_20",
    status: "DRAFT"
  });

  assert.equal(state.projectId, "prj_20");
  assert.equal(state.phase, "READY");
  assert.equal(state.canRun, true);
});

test("runCalculation returns CALCULATING then SUCCESS", async () => {
  const screen = createProjectCalculationScreen({
    apiClient: {
      calculateProject: async () => ({
        projectId: "prj_21",
        calculationStatus: "SUCCESS",
        resultId: "res_21",
        finishedAt: "2026-02-24T14:00:00Z"
      })
    }
  });

  const result = await screen.runCalculation("prj_21");

  assert.equal(result.calculating.phase, "CALCULATING");
  assert.equal(result.final.phase, "SUCCESS");
  assert.equal(result.final.resultId, "res_21");
  assert.equal(result.final.canRun, true);
});

test("runCalculation maps ApiClientError to FAILED state", async () => {
  const screen = createProjectCalculationScreen({
    apiClient: {
      calculateProject: async () => {
        throw new ApiClientError({
          status: 504,
          code: "CALC_TIMEOUT",
          message: "Calculation exceeded 10000 ms timeout",
          traceId: "trace-200"
        });
      }
    }
  });

  const result = await screen.runCalculation("prj_22");

  assert.equal(result.final.phase, "FAILED");
  assert.equal(result.final.calculationStatus, "FAILED");
  assert.equal(result.final.error.code, "CALC_TIMEOUT");
  assert.equal(result.final.error.traceId, "trace-200");
});

test("runCalculation maps unknown errors to UI_CALC_ERROR", async () => {
  const screen = createProjectCalculationScreen({
    apiClient: {
      calculateProject: async () => {
        throw new Error("network down");
      }
    }
  });

  const result = await screen.runCalculation("prj_23");

  assert.equal(result.final.phase, "FAILED");
  assert.equal(result.final.error.code, "UI_CALC_ERROR");
  assert.equal(result.final.error.message, "network down");
});
