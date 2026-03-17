const { toUiErrorModel } = require("./ui-error-model");

function createProjectCalculationScreen(input) {
  if (!input || typeof input !== "object") {
    throw new Error("projectCalculationScreen config is required");
  }
  if (!input.apiClient || typeof input.apiClient.calculateProject !== "function") {
    throw new Error("projectCalculationScreen apiClient.calculateProject is required");
  }

  const apiClient = input.apiClient;

  return {
    createState(project) {
      const source = project && typeof project === "object" ? project : {};
      const projectId = asText(source.projectId);
      const status = asText(source.status);
      const calculationStatus = asText(source.calculationStatus);

      let phase = "READY";
      if (calculationStatus === "SUCCESS") {
        phase = "SUCCESS";
      } else if (calculationStatus === "FAILED") {
        phase = "FAILED";
      }

      return {
        projectId,
        status,
        calculationStatus,
        phase,
        canRun: Boolean(projectId),
        resultId: "",
        finishedAt: "",
        error: null
      };
    },

    async runCalculation(projectId) {
      ensureProjectId(projectId);
      const calculating = {
        projectId,
        phase: "CALCULATING",
        canRun: false,
        error: null
      };

      try {
        const response = await apiClient.calculateProject(projectId);
        return {
          calculating,
          final: {
            projectId: asText(response && response.projectId) || projectId,
            status: "READY",
            calculationStatus: asText(response && response.calculationStatus) || "SUCCESS",
            phase: "SUCCESS",
            resultId: asText(response && response.resultId),
            finishedAt: asText(response && response.finishedAt),
            canRun: true,
            error: null
          }
        };
      } catch (error) {
        return {
          calculating,
          final: {
            projectId,
            status: "READY",
            calculationStatus: "FAILED",
            phase: "FAILED",
            resultId: "",
            finishedAt: "",
            canRun: true,
            error: toUiErrorModel(error, {
              code: "UI_CALC_ERROR",
              message: "Calculation failed"
            })
          }
        };
      }
    }
  };
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

module.exports = {
  createProjectCalculationScreen
};
