const { toUiErrorModel } = require("./ui-error-model");

function createProjectResultScreen(input) {
  if (!input || typeof input !== "object") {
    throw new Error("projectResultScreen config is required");
  }
  if (!input.apiClient || typeof input.apiClient.getProjectResult !== "function") {
    throw new Error("projectResultScreen apiClient.getProjectResult is required");
  }

  const apiClient = input.apiClient;

  return {
    createEmpty(projectId) {
      const safeProjectId = asText(projectId);
      return buildState({
        phase: "EMPTY",
        projectId: safeProjectId,
        resultId: "",
        generatedAt: "",
        nodes: [],
        edges: [],
        coordinatesTable: [],
        connectivityTable: [],
        distancesTable: [],
        error: null
      });
    },

    async load(projectId) {
      ensureProjectId(projectId);

      try {
        const response = await apiClient.getProjectResult(projectId);
        const normalized = normalizeResult(response, projectId);
        return buildState({
          phase: "SUCCESS",
          projectId: normalized.projectId,
          resultId: normalized.resultId,
          generatedAt: normalized.generatedAt,
          nodes: normalized.nodes,
          edges: normalized.edges,
          coordinatesTable: normalized.coordinatesTable,
          connectivityTable: normalized.connectivityTable,
          distancesTable: normalized.distancesTable,
          error: null
        });
      } catch (error) {
        return buildState({
          phase: "FAILED",
          projectId,
          resultId: "",
          generatedAt: "",
          nodes: [],
          edges: [],
          coordinatesTable: [],
          connectivityTable: [],
          distancesTable: [],
          error: toUiErrorModel(error, {
            code: "UI_RESULT_ERROR",
            message: "Result loading failed"
          })
        });
      }
    }
  };
}

function normalizeResult(response, fallbackProjectId) {
  const payload = response && typeof response === "object" ? response : {};
  const model = payload.visualizationModel && typeof payload.visualizationModel === "object"
    ? payload.visualizationModel
    : {};

  return {
    resultId: asText(payload.resultId),
    projectId: asText(payload.projectId) || fallbackProjectId,
    generatedAt: asText(payload.generatedAt),
    nodes: normalizeNodes(model.nodes),
    edges: normalizeEdges(model.edges),
    coordinatesTable: normalizeCoordinateRows(payload.coordinatesTable),
    connectivityTable: normalizeConnectivityRows(payload.connectivityTable),
    distancesTable: normalizeDistanceRows(payload.distances)
  };
}

function buildState(input) {
  const pseudo3d = buildPseudo3dModel(input.nodes, input.edges);
  return {
    phase: input.phase,
    projectId: input.projectId,
    resultId: input.resultId,
    generatedAt: input.generatedAt,
    visualization: {
      nodes: input.nodes,
      edges: input.edges,
      pseudo3d
    },
    tables: {
      coordinates: input.coordinatesTable,
      connectivity: input.connectivityTable,
      distances: input.distancesTable
    },
    hasDistances: input.distancesTable.length > 0,
    error: input.error
  };
}

function buildPseudo3dModel(nodes, edges) {
  const projectedNodes = nodes.map((node) => {
    const screenX = round3(node.x + node.z * 0.5);
    const screenY = round3(node.y - node.z * 0.5);
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
      screenX,
      screenY,
      depth: node.z
    };
  });

  const nodeById = new Map(projectedNodes.map((node) => [node.id, node]));
  const projectedEdges = [];
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      continue;
    }
    projectedEdges.push({
      from: edge.from,
      to: edge.to,
      fromX: from.screenX,
      fromY: from.screenY,
      toX: to.screenX,
      toY: to.screenY
    });
  }

  return {
    projectedNodes,
    projectedEdges,
    bounds: calculateBounds(projectedNodes)
  };
}

function calculateBounds(nodes) {
  if (nodes.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0
    };
  }

  let minX = nodes[0].screenX;
  let maxX = nodes[0].screenX;
  let minY = nodes[0].screenY;
  let maxY = nodes[0].screenY;

  for (let index = 1; index < nodes.length; index += 1) {
    const node = nodes[index];
    minX = Math.min(minX, node.screenX);
    maxX = Math.max(maxX, node.screenX);
    minY = Math.min(minY, node.screenY);
    maxY = Math.max(maxY, node.screenY);
  }

  return { minX, maxX, minY, maxY };
}

function normalizeNodes(value) {
  const items = Array.isArray(value) ? value : [];
  return items.map((node) => ({
    id: toNumber(node && node.id),
    x: toNumber(node && node.x),
    y: toNumber(node && node.y),
    z: toNumber(node && node.z)
  }));
}

function normalizeEdges(value) {
  const items = Array.isArray(value) ? value : [];
  return items.map((edge) => ({
    from: toNumber(edge && edge.from),
    to: toNumber(edge && edge.to)
  }));
}

function normalizeCoordinateRows(value) {
  const items = Array.isArray(value) ? value : [];
  return items.map((row) => ({
    node: toNumber(row && row.node),
    x: toNumber(row && row.x),
    y: toNumber(row && row.y),
    z: toNumber(row && row.z)
  }));
}

function normalizeConnectivityRows(value) {
  const items = Array.isArray(value) ? value : [];
  return items.map((row) => ({
    from: toNumber(row && row.from),
    to: toNumber(row && row.to)
  }));
}

function normalizeDistanceRows(value) {
  const items = Array.isArray(value) ? value : [];
  return items.map((row) => ({
    name: asText(row && row.name),
    value: toNumber(row && row.value)
  }));
}

function ensureProjectId(projectId) {
  if (!projectId || typeof projectId !== "string" || !projectId.trim()) {
    throw new Error("projectId is required");
  }
}

function asText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function toNumber(value) {
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }
  return 0;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

module.exports = {
  createProjectResultScreen
};
