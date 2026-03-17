const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiClientError } = require("../src/api/client");
const {
  createProjectEditorScreen
} = require("../src/ui/project-editor-screen");

test("createProject sends normalized payload with modelParams", async () => {
  let capturedPayload = null;
  const screen = createProjectEditorScreen({
    apiClient: {
      createProject: async (payload) => {
        capturedPayload = payload;
        return { projectId: "prj_10", status: "DRAFT" };
      },
      updateProject: async () => {
        throw new Error("not expected");
      },
      getProject: async () => {
        throw new Error("not expected");
      }
    }
  });

  const draft = screen.createDraft({
    name: "Kupol",
    comment: "first version",
    modelParams: { configuration: { baseNodeNumbers: [1] } }
  });

  const response = await screen.createProject(draft);

  assert.equal(response.projectId, "prj_10");
  assert.deepEqual(capturedPayload, {
    name: "Kupol",
    comment: "first version",
    modelParams: { configuration: { baseNodeNumbers: [1] } }
  });
});

test("updateProject sends payload for existing project", async () => {
  let captured = null;
  const screen = createProjectEditorScreen({
    apiClient: {
      createProject: async () => {
        throw new Error("not expected");
      },
      updateProject: async (projectId, payload) => {
        captured = { projectId, payload };
        return { projectId, status: "DRAFT" };
      },
      getProject: async () => {
        throw new Error("not expected");
      }
    }
  });

  const base = screen.createDraft({ name: "Most", comment: "v1", modelParams: {} });
  const patched = screen.applyPatch(base, {
    comment: "v2",
    modelParams: { calculationProcedures: { geometryProcedures: [] } }
  });

  const response = await screen.updateProject("prj_11", patched);

  assert.equal(response.projectId, "prj_11");
  assert.equal(captured.projectId, "prj_11");
  assert.deepEqual(captured.payload, {
    name: "Most",
    comment: "v2",
    modelParams: { calculationProcedures: { geometryProcedures: [] } }
  });
});

test("loadProject returns editor-ready draft", async () => {
  const screen = createProjectEditorScreen({
    apiClient: {
      createProject: async () => {
        throw new Error("not expected");
      },
      updateProject: async () => {
        throw new Error("not expected");
      },
      getProject: async () => ({
        projectId: "prj_12",
        name: "Bridge",
        comment: "draft",
        modelParams: { test: true }
      })
    }
  });

  const loaded = await screen.loadProject("prj_12");

  assert.equal(loaded.projectId, "prj_12");
  assert.deepEqual(loaded.draft, {
    name: "Bridge",
    comment: "draft",
    modelParams: { test: true }
  });
});

test("createProject validates required name", async () => {
  const screen = createProjectEditorScreen({
    apiClient: {
      createProject: async () => ({ projectId: "x" }),
      updateProject: async () => ({ projectId: "x" }),
      getProject: async () => ({ projectId: "x" })
    }
  });

  await assert.rejects(
    () => screen.createProject({ comment: "no name", modelParams: {} }),
    /project name is required/
  );
});

test("createProjectSafe maps ApiClientError to unified ui error", async () => {
  const screen = createProjectEditorScreen({
    apiClient: {
      createProject: async () => {
        throw new ApiClientError({
          status: 422,
          code: "CALC_INVALID_INPUT",
          message: "invalid payload",
          traceId: "trace-editor"
        });
      },
      updateProject: async () => ({ projectId: "x" }),
      getProject: async () => ({ projectId: "x" })
    }
  });

  const result = await screen.createProjectSafe({ name: "x", modelParams: {} });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "CALC_INVALID_INPUT");
  assert.equal(result.error.traceId, "trace-editor");
});
