const { toUiErrorModel } = require("./ui-error-model");

function createProjectsListScreen(input) {
  if (!input || typeof input !== "object") {
    throw new Error("projectsListScreen config is required");
  }
  if (!input.apiClient || typeof input.apiClient.listProjects !== "function") {
    throw new Error("projectsListScreen apiClient is required");
  }

  const apiClient = input.apiClient;

  return {
    async load(context) {
      const resolved = normalizeContext(context);
      const filters = buildFiltersForRole(resolved.role, resolved.filters);
      try {
        const response = await apiClient.listProjects(filters);
        const sourceItems = Array.isArray(response && response.items) ? response.items : [];

        const items = sourceItems.map((item) => mapListItem(item, resolved.role));

        return {
          mode: resolved.role,
          filters,
          total: items.length,
          empty: items.length === 0,
          items,
          error: null
        };
      } catch (error) {
        return {
          mode: resolved.role,
          filters,
          total: 0,
          empty: true,
          items: [],
          error: toUiErrorModel(error, {
            code: "UI_PROJECT_LIST_ERROR",
            message: "Projects list loading failed"
          })
        };
      }
    }
  };
}

function normalizeContext(input) {
  const role = input && typeof input.role === "string"
    ? input.role.trim().toLowerCase()
    : "student";

  if (role !== "student" && role !== "teacher") {
    throw new Error("projectsListScreen role must be student or teacher");
  }

  return {
    role,
    filters: (input && input.filters && typeof input.filters === "object") ? input.filters : {}
  };
}

function buildFiltersForRole(role, filters) {
  if (role === "teacher") {
    return pickFilters(filters, ["surname", "group", "name", "dateFrom", "dateTo"]);
  }

  return pickFilters(filters, ["name"]);
}

function pickFilters(input, keys) {
  const out = {};
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = input[key];
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (!text) {
      continue;
    }
    out[key] = text;
  }
  return out;
}

function mapListItem(item, role) {
  const safeItem = (item && typeof item === "object") ? item : {};
  const status = asText(safeItem.status);
  const reviewStatus = asText(safeItem.reviewStatus);

  return {
    projectId: asText(safeItem.projectId),
    name: asText(safeItem.name),
    status,
    reviewStatus,
    ownerUserId: asText(safeItem.ownerUserId),
    ownerFullName: asText(safeItem.ownerFullName),
    ownerGroup: asText(safeItem.ownerGroup),
    updatedAt: asText(safeItem.updatedAt),
    canOpen: Boolean(safeItem.projectId),
    canCalculate: status === "DRAFT" || status === "READY",
    canMarkReadyForReview: status === "DRAFT",
    canReview: role === "teacher"
  };
}

function asText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

module.exports = {
  createProjectsListScreen
};
