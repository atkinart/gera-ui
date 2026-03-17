const { toUiErrorModel } = require("./ui-error-model");

function createProjectEditorScreen(input) {
  if (!input || typeof input !== "object") {
    throw new Error("projectEditorScreen config is required");
  }
  if (!input.apiClient) {
    throw new Error("projectEditorScreen apiClient is required");
  }

  const apiClient = input.apiClient;
  ensureMethod(apiClient, "createProject");
  ensureMethod(apiClient, "updateProject");
  ensureMethod(apiClient, "getProject");

  return {
    createDraft(initial) {
      const source = initial && typeof initial === "object" ? initial : {};
      return {
        name: asText(source.name),
        comment: asText(source.comment),
        modelParams: asObject(source.modelParams)
      };
    },

    applyPatch(draft, patch) {
      const base = draft && typeof draft === "object" ? draft : {};
      const next = patch && typeof patch === "object" ? patch : {};
      return {
        name: asText(next.name !== undefined ? next.name : base.name),
        comment: asText(next.comment !== undefined ? next.comment : base.comment),
        modelParams: asObject(next.modelParams !== undefined ? next.modelParams : base.modelParams)
      };
    },

    async loadProject(projectId) {
      ensureNonEmptyString(projectId, "projectId");
      const response = await apiClient.getProject(projectId);
      return {
        projectId: asText(response && response.projectId),
        draft: {
          name: asText(response && response.name),
          comment: asText(response && response.comment),
          modelParams: asObject(response && response.modelParams)
        }
      };
    },

    async loadProjectSafe(projectId) {
      try {
        const response = await this.loadProject(projectId);
        return {
          ok: true,
          data: response,
          error: null
        };
      } catch (error) {
        return {
          ok: false,
          data: null,
          error: toUiErrorModel(error, {
            code: "UI_PROJECT_EDITOR_ERROR",
            message: "Project loading failed"
          })
        };
      }
    },

    async createProject(draft) {
      const payload = buildPayload(draft);
      return apiClient.createProject(payload);
    },

    async createProjectSafe(draft) {
      try {
        const response = await this.createProject(draft);
        return {
          ok: true,
          data: response,
          error: null
        };
      } catch (error) {
        return {
          ok: false,
          data: null,
          error: toUiErrorModel(error, {
            code: "UI_PROJECT_EDITOR_ERROR",
            message: "Project creation failed"
          })
        };
      }
    },

    async updateProject(projectId, draft) {
      ensureNonEmptyString(projectId, "projectId");
      const payload = buildPayload(draft);
      return apiClient.updateProject(projectId, payload);
    },

    async updateProjectSafe(projectId, draft) {
      try {
        const response = await this.updateProject(projectId, draft);
        return {
          ok: true,
          data: response,
          error: null
        };
      } catch (error) {
        return {
          ok: false,
          data: null,
          error: toUiErrorModel(error, {
            code: "UI_PROJECT_EDITOR_ERROR",
            message: "Project update failed"
          })
        };
      }
    }
  };
}

function buildPayload(draft) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const name = asText(safeDraft.name).trim();
  if (!name) {
    throw new Error("project name is required");
  }

  return {
    name,
    comment: asText(safeDraft.comment),
    modelParams: asObject(safeDraft.modelParams)
  };
}

function asText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function ensureMethod(target, name) {
  if (!target || typeof target[name] !== "function") {
    throw new Error("projectEditorScreen apiClient." + name + " is required");
  }
}

function ensureNonEmptyString(value, fieldName) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new Error(fieldName + " is required");
  }
}

module.exports = {
  createProjectEditorScreen
};
