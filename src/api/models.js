module.exports = {
  apiErrorModel: {
    code: "string",
    message: "string",
    traceId: "string",
    details: "unknown"
  },
  projectListItemModel: {
    projectId: "string",
    name: "string",
    status: "string",
    reviewStatus: "string",
    ownerUserId: "string",
    ownerFullName: "string",
    ownerGroup: "string",
    updatedAt: "string"
  },
  calculateResponseModel: {
    projectId: "string",
    calculationStatus: "string",
    resultId: "string",
    finishedAt: "string"
  },
  projectResultResponseModel: {
    resultId: "string",
    projectId: "string",
    visualizationModel: {
      nodes: "VisualizationNode[]",
      edges: "VisualizationEdge[]"
    },
    coordinatesTable: "CoordinateRow[]",
    connectivityTable: "ConnectivityRow[]",
    distances: "DistanceRow[]",
    generatedAt: "string"
  }
};
