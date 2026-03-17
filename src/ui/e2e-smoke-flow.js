const { toUiErrorModel } = require("./ui-error-model");

function createE2ESmokeFlow(input) {
  const deps = validateDependencies(input);

  return {
    async run(options) {
      const config = normalizeOptions(options);
      const steps = [];
      let projectId = "";
      let failedStep = "";

      try {
        failedStep = "login";
        const login = deps.oidcClient.beginLogin();
        const callback = deps.oidcClient.consumeCallback(config.callbackBaseUrl + "?code=" + config.authCode + "&state=" + login.state);
        deps.oidcClient.createTokenRequest({
          code: callback.code,
          codeVerifier: callback.codeVerifier
        });
        steps.push("login");

        failedStep = "create-edit";
        const draft = deps.projectEditor.createDraft(config.projectDraft);
        const created = await deps.projectEditor.createProject(draft);
        projectId = String(created.projectId || "");
        if (!projectId) {
          throw new Error("projectId missing after createProject");
        }

        const loaded = await deps.projectEditor.loadProject(projectId);
        const patched = deps.projectEditor.applyPatch(loaded.draft, {
          comment: config.updatedComment
        });
        await deps.projectEditor.updateProject(projectId, patched);
        steps.push("create-edit");

        failedStep = "calculate";
        const calcRun = await deps.projectCalculation.runCalculation(projectId);
        if (!calcRun || !calcRun.final || calcRun.final.phase !== "SUCCESS") {
          throw new Error("calculation did not reach SUCCESS");
        }
        steps.push("calculate");

        failedStep = "view";
        const resultState = await deps.projectResult.load(projectId);
        if (!resultState || resultState.phase !== "SUCCESS") {
          throw new Error("result screen did not reach SUCCESS");
        }
        steps.push("view");

        failedStep = "review";
        await deps.teacherReview.loadAll(config.teacherFilters);
        const review = await deps.teacherReview.submitReview(projectId, config.reviewStatus);
        if (!review || review.ok !== true) {
          throw new Error("teacher review submit failed");
        }
        steps.push("review");

        return {
          ok: true,
          projectId,
          steps,
          failedStep: "",
          error: null
        };
      } catch (error) {
        return {
          ok: false,
          projectId,
          steps,
          failedStep,
          error: toUiErrorModel(error, {
            code: "UI_E2E_SMOKE_FAILED",
            message: "E2E smoke flow failed"
          })
        };
      }
    }
  };
}

function validateDependencies(input) {
  if (!input || typeof input !== "object") {
    throw new Error("e2eSmokeFlow config is required");
  }

  const required = [
    ["oidcClient", "beginLogin"],
    ["oidcClient", "consumeCallback"],
    ["oidcClient", "createTokenRequest"],
    ["projectEditor", "createDraft"],
    ["projectEditor", "createProject"],
    ["projectEditor", "loadProject"],
    ["projectEditor", "applyPatch"],
    ["projectEditor", "updateProject"],
    ["projectCalculation", "runCalculation"],
    ["projectResult", "load"],
    ["teacherReview", "loadAll"],
    ["teacherReview", "submitReview"]
  ];

  for (let index = 0; index < required.length; index += 1) {
    const pair = required[index];
    const objectName = pair[0];
    const methodName = pair[1];
    const target = input[objectName];
    if (!target || typeof target[methodName] !== "function") {
      throw new Error("e2eSmokeFlow " + objectName + "." + methodName + " is required");
    }
  }

  return input;
}

function normalizeOptions(input) {
  const source = input && typeof input === "object" ? input : {};
  const projectDraft = source.projectDraft && typeof source.projectDraft === "object"
    ? source.projectDraft
    : { name: "MVP Project", comment: "draft", modelParams: {} };

  return {
    callbackBaseUrl: asText(source.callbackBaseUrl) || "http://localhost:5173/auth/callback",
    authCode: asText(source.authCode) || "auth-code",
    updatedComment: asText(source.updatedComment) || "updated",
    reviewStatus: asText(source.reviewStatus).toUpperCase() || "APPROVED",
    teacherFilters: source.teacherFilters && typeof source.teacherFilters === "object"
      ? source.teacherFilters
      : {},
    projectDraft
  };
}

function asText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

module.exports = {
  createE2ESmokeFlow
};
