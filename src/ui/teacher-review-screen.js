const { toUiErrorModel } = require("./ui-error-model");

const ALLOWED_REVIEW_STATUSES = new Set(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]);

function createTeacherReviewScreen(input) {
  if (!input || typeof input !== "object") {
    throw new Error("teacherReviewScreen config is required");
  }
  if (!input.apiClient || typeof input.apiClient.listProjects !== "function") {
    throw new Error("teacherReviewScreen apiClient.listProjects is required");
  }
  if (typeof input.apiClient.updateReview !== "function") {
    throw new Error("teacherReviewScreen apiClient.updateReview is required");
  }

  const apiClient = input.apiClient;

  return {
    async loadAll(filters) {
      const safeFilters = normalizeTeacherFilters(filters);
      try {
        const response = await apiClient.listProjects(safeFilters);
        const sourceItems = Array.isArray(response && response.items) ? response.items : [];
        const items = sourceItems.map(mapTeacherItem);

        return {
          mode: "teacher",
          filters: safeFilters,
          total: items.length,
          items,
          error: null
        };
      } catch (error) {
        return {
          mode: "teacher",
          filters: safeFilters,
          total: 0,
          items: [],
          error: toUiErrorModel(error, {
            code: "UI_REVIEW_ERROR",
            message: "Review flow failed"
          })
        };
      }
    },

    async submitReview(projectId, reviewStatus) {
      ensureProjectId(projectId);
      const status = normalizeReviewStatus(reviewStatus);

      try {
        const response = await apiClient.updateReview({
          projectId,
          status
        });

        return {
          ok: true,
          projectId,
          reviewStatus: asText(response && response.reviewStatus) || status,
          error: null
        };
      } catch (error) {
        return {
          ok: false,
          projectId,
          reviewStatus: status,
          error: toUiErrorModel(error, {
            code: "UI_REVIEW_ERROR",
            message: "Review flow failed"
          })
        };
      }
    }
  };
}

function normalizeTeacherFilters(input) {
  const source = input && typeof input === "object" ? input : {};
  const keys = ["surname", "group", "name", "dateFrom", "dateTo"];
  const result = {};

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = source[key];
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (!text) {
      continue;
    }
    result[key] = text;
  }

  return result;
}

function mapTeacherItem(item) {
  const safe = item && typeof item === "object" ? item : {};
  const reviewStatus = asText(safe.reviewStatus);

  return {
    projectId: asText(safe.projectId),
    name: asText(safe.name),
    status: asText(safe.status),
    reviewStatus,
    ownerUserId: asText(safe.ownerUserId),
    ownerFullName: asText(safe.ownerFullName),
    ownerGroup: asText(safe.ownerGroup),
    updatedAt: asText(safe.updatedAt),
    canApprove: reviewStatus !== "APPROVED",
    canReject: reviewStatus !== "REJECTED",
    canRequestChanges: reviewStatus !== "CHANGES_REQUESTED"
  };
}

function normalizeReviewStatus(value) {
  const status = asText(value).trim().toUpperCase();
  if (!ALLOWED_REVIEW_STATUSES.has(status)) {
    throw new Error("reviewStatus must be one of APPROVED, REJECTED, CHANGES_REQUESTED");
  }
  return status;
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
  createTeacherReviewScreen
};
