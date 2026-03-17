const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiClientError } = require("../src/api/client");
const {
  createProjectResultScreen
} = require("../src/ui/project-result-screen");

test("load maps backend result to pseudo3d visualization and tables", async () => {
  const screen = createProjectResultScreen({
    apiClient: {
      getProjectResult: async () => ({
        resultId: "res_31",
        projectId: "prj_31",
        generatedAt: "2026-02-24T15:00:00Z",
        visualizationModel: {
          nodes: [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 10, y: 5, z: 4 }
          ],
          edges: [
            { from: 1, to: 2 }
          ]
        },
        coordinatesTable: [{ node: 1, x: 0, y: 0, z: 0 }],
        connectivityTable: [{ from: 1, to: 2 }],
        distances: [{ name: "L1(1-2)", value: 11.2 }]
      })
    }
  });

  const state = await screen.load("prj_31");

  assert.equal(state.phase, "SUCCESS");
  assert.equal(state.projectId, "prj_31");
  assert.equal(state.resultId, "res_31");
  assert.equal(state.visualization.pseudo3d.projectedNodes.length, 2);
  assert.equal(state.visualization.pseudo3d.projectedEdges.length, 1);
  assert.equal(state.tables.coordinates.length, 1);
  assert.equal(state.tables.connectivity.length, 1);
  assert.equal(state.tables.distances.length, 1);
  assert.equal(state.hasDistances, true);
});

test("load handles empty result payload and keeps tables empty", async () => {
  const screen = createProjectResultScreen({
    apiClient: {
      getProjectResult: async () => ({
        resultId: "res_32",
        projectId: "prj_32",
        generatedAt: "2026-02-24T15:10:00Z",
        visualizationModel: { nodes: [], edges: [] },
        coordinatesTable: [],
        connectivityTable: [],
        distances: []
      })
    }
  });

  const state = await screen.load("prj_32");

  assert.equal(state.phase, "SUCCESS");
  assert.equal(state.visualization.pseudo3d.projectedNodes.length, 0);
  assert.equal(state.visualization.pseudo3d.bounds.minX, 0);
  assert.equal(state.tables.coordinates.length, 0);
  assert.equal(state.tables.connectivity.length, 0);
  assert.equal(state.tables.distances.length, 0);
  assert.equal(state.hasDistances, false);
});

test("load maps ApiClientError into FAILED state", async () => {
  const screen = createProjectResultScreen({
    apiClient: {
      getProjectResult: async () => {
        throw new ApiClientError({
          status: 404,
          code: "RESULT_NOT_FOUND",
          message: "Result not found: prj_33",
          traceId: "trace-404"
        });
      }
    }
  });

  const state = await screen.load("prj_33");

  assert.equal(state.phase, "FAILED");
  assert.equal(state.error.code, "RESULT_NOT_FOUND");
  assert.equal(state.error.traceId, "trace-404");
});

test("createEmpty returns initial EMPTY state", () => {
  const screen = createProjectResultScreen({
    apiClient: {
      getProjectResult: async () => ({})
    }
  });

  const state = screen.createEmpty("prj_34");

  assert.equal(state.phase, "EMPTY");
  assert.equal(state.projectId, "prj_34");
  assert.equal(state.tables.coordinates.length, 0);
  assert.equal(state.error, null);
});
