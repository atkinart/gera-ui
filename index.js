function helloNpm() {
  return "Hello GERA UI";
}

const {
  createOidcPkceClient,
  createInMemoryStateStore,
  createCodeChallenge
} = require("./src/auth/oidc-pkce");
const {
  createApiClient,
  ApiClientError
} = require("./src/api/client");
const apiModels = require("./src/api/models");
const {
  createProjectsListScreen
} = require("./src/ui/projects-list-screen");
const {
  createProjectEditorScreen
} = require("./src/ui/project-editor-screen");
const {
  createProjectCalculationScreen
} = require("./src/ui/project-calculation-screen");
const {
  createProjectResultScreen
} = require("./src/ui/project-result-screen");
const {
  createTeacherReviewScreen
} = require("./src/ui/teacher-review-screen");
const {
  toUiErrorModel
} = require("./src/ui/ui-error-model");
const {
  createE2ESmokeFlow
} = require("./src/ui/e2e-smoke-flow");
const {
  createTraceContext
} = require("./src/api/trace-context");

module.exports = helloNpm;
module.exports.createOidcPkceClient = createOidcPkceClient;
module.exports.createInMemoryStateStore = createInMemoryStateStore;
module.exports.createCodeChallenge = createCodeChallenge;
module.exports.createApiClient = createApiClient;
module.exports.ApiClientError = ApiClientError;
module.exports.apiModels = apiModels;
module.exports.createProjectsListScreen = createProjectsListScreen;
module.exports.createProjectEditorScreen = createProjectEditorScreen;
module.exports.createProjectCalculationScreen = createProjectCalculationScreen;
module.exports.createProjectResultScreen = createProjectResultScreen;
module.exports.createTeacherReviewScreen = createTeacherReviewScreen;
module.exports.toUiErrorModel = toUiErrorModel;
module.exports.createE2ESmokeFlow = createE2ESmokeFlow;
module.exports.createTraceContext = createTraceContext;
