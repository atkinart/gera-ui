const test = require("node:test");
const assert = require("node:assert/strict");

const { createE2ESmokeFlow } = require("../src/ui/e2e-smoke-flow");

function createSuccessfulDeps() {
  const store = new Map();
  return {
    oidcClient: {
      beginLogin() {
        const state = "state-1";
        store.set(state, { codeVerifier: "verifier-1" });
        return { state };
      },
      consumeCallback(callbackUrl) {
        const url = new URL(callbackUrl);
        const state = url.searchParams.get("state");
        const entry = store.get(state);
        return {
          code: url.searchParams.get("code"),
          codeVerifier: entry.codeVerifier
        };
      },
      createTokenRequest() {
        return { ok: true };
      }
    },
    projectEditor: {
      createDraft(input) {
        return input;
      },
      async createProject() {
        return { projectId: "prj-e2e-1" };
      },
      async loadProject() {
        return { draft: { name: "MVP", comment: "old", modelParams: {} } };
      },
      applyPatch(base, patch) {
        return Object.assign({}, base, patch);
      },
      async updateProject() {
        return { projectId: "prj-e2e-1" };
      }
    },
    projectCalculation: {
      async runCalculation() {
        return {
          final: {
            phase: "SUCCESS"
          }
        };
      }
    },
    projectResult: {
      async load() {
        return {
          phase: "SUCCESS"
        };
      }
    },
    teacherReview: {
      async loadAll() {
        return { total: 1, items: [] };
      },
      async submitReview() {
        return { ok: true, reviewStatus: "APPROVED" };
      }
    }
  };
}

test("run completes full critical path for e2e smoke", async () => {
  const flow = createE2ESmokeFlow(createSuccessfulDeps());

  const result = await flow.run({
    projectDraft: { name: "Kupol", comment: "v1", modelParams: {} }
  });

  assert.equal(result.ok, true);
  assert.equal(result.projectId, "prj-e2e-1");
  assert.deepEqual(result.steps, ["login", "create-edit", "calculate", "view", "review"]);
  assert.equal(result.failedStep, "");
  assert.equal(result.error, null);
});

test("run returns unified error when one step fails", async () => {
  const deps = createSuccessfulDeps();
  deps.projectCalculation.runCalculation = async () => ({ final: { phase: "FAILED" } });
  const flow = createE2ESmokeFlow(deps);

  const result = await flow.run({});

  assert.equal(result.ok, false);
  assert.equal(result.projectId, "prj-e2e-1");
  assert.equal(result.failedStep, "calculate");
  assert.equal(result.error.code, "UI_E2E_SMOKE_FAILED");
  assert.equal(result.steps.includes("calculate"), false);
});
