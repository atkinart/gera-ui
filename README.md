# GERA UI Integration Modules (MVP)

Минимальные CommonJS-модули для Week 5:

- OIDC Authorization Code + PKCE (`W5-01`)
- Централизованный API client + typed models (`W5-02`)
- Интеграция списка проектов (`W5-03`)
- Create/Edit модуль проекта и ввода модели (`W5-04`)
- Запуск расчета и статусы (`W5-05`)
- Экран результата: псевдо-3D + таблицы (`W5-06`)
- Teacher review flow (`W5-07`)
- Единая UI error model (`W5-08`)
- E2E smoke orchestration (`W5-09`)

## Команды

```bash
npm run lint
npm test
```

## Docker

```bash
docker build -t gera-ui:local .
docker run --rm -p 8081:8081 -e PORT=8081 gera-ui:local
```

Health endpoint:

```bash
curl http://localhost:8081/health
```

## Использование

```js
const {
  createOidcPkceClient,
  createApiClient,
  createProjectsListScreen,
  createProjectEditorScreen,
  createProjectCalculationScreen,
  createProjectResultScreen,
  createTeacherReviewScreen,
  toUiErrorModel,
  createE2ESmokeFlow,
  createTraceContext
} = require("./index");

const oidc = createOidcPkceClient({
  issuer: "http://localhost:9000",
  clientId: "gera-ui",
  redirectUri: "http://localhost:5173/auth/callback",
  postLogoutRedirectUri: "http://localhost:5173/"
});

const login = oidc.beginLogin();
// redirect browser to login.authorizationUrl

const callback = oidc.consumeCallback("http://localhost:5173/auth/callback?code=...&state=...");
const tokenRequest = oidc.createTokenRequest({
  code: callback.code,
  codeVerifier: callback.codeVerifier
});

const logout = oidc.beginLogout({ idTokenHint: "<id_token>" });
// redirect browser to logout.logoutUrl

const api = createApiClient({
  baseUrl: "http://localhost:8080/api/v1",
  getAccessToken: async () => "<access_token>",
  traceContext: createTraceContext({ prefix: "ui" })
});

const projects = await api.listProjects({ group: "A-01" });
const calc = await api.calculateProject("prj_123");
const result = await api.getProjectResult("prj_123");

const projectsList = createProjectsListScreen({ apiClient: api });
const teacherView = await projectsList.load({
  role: "teacher",
  filters: { group: "A-01", surname: "Petrov" }
});

const projectEditor = createProjectEditorScreen({ apiClient: api });
const draft = projectEditor.createDraft({
  name: "Kupol",
  comment: "initial",
  modelParams: { configuration: { baseNodeNumbers: [1] } }
});
const created = await projectEditor.createProject(draft);
const loaded = await projectEditor.loadProject(created.projectId);
const updatedDraft = projectEditor.applyPatch(loaded.draft, { comment: "updated" });
await projectEditor.updateProject(created.projectId, updatedDraft);

const calculation = createProjectCalculationScreen({ apiClient: api });
const calcState = calculation.createState({
  projectId: created.projectId,
  status: "READY"
});
if (calcState.canRun) {
  const run = await calculation.runCalculation(created.projectId);
  const finalState = run.final;
}

const resultScreen = createProjectResultScreen({ apiClient: api });
const resultState = await resultScreen.load(created.projectId);
const pseudo3d = resultState.visualization.pseudo3d;

const teacherReview = createTeacherReviewScreen({ apiClient: api });
const teacherProjects = await teacherReview.loadAll({ group: "A-01" });
if (teacherProjects.total > 0) {
  await teacherReview.submitReview(teacherProjects.items[0].projectId, "APPROVED");
}

const unifiedError = toUiErrorModel(new Error("network unavailable"), {
  code: "UI_NETWORK_ERROR",
  message: "Network request failed"
});

const smoke = createE2ESmokeFlow({
  oidcClient: oidc,
  projectEditor,
  projectCalculation: calculation,
  projectResult: resultScreen,
  teacherReview
});
const smokeResult = await smoke.run({
  projectDraft: draft,
  reviewStatus: "APPROVED"
});
```

## Что покрыто

- Генерация authorize URL c `response_type=code`, `state`, `nonce`, `code_challenge` (`S256`).
- Валидация callback по `state` + получение `codeVerifier`.
- Формирование token request (`application/x-www-form-urlencoded`).
- Формирование RP-initiated logout URL (`id_token_hint`, `post_logout_redirect_uri`, `state`).
- Единый API client для endpoint'ов Week 4/5 (`projects`, `calculate`, `result`, `reviews`).
- Нормализация backend ошибок в `ApiClientError`.
- Интеграционный модуль списка проектов (`student`/`teacher` режим + фильтры).
- Модуль формы проекта (create/edit + нормализация `modelParams`).
- Модуль запуска расчета с UI-статусами (`Ready`, `Calculating`, `Success`, `Failed`).
- Модуль экрана результата (`псевдо-3D`, таблицы координат/связности, optional `distances`).
- Модуль teacher review (`список всех проектов`, `status update`).
- Общая модель ошибок UI (`toUiErrorModel`) для всех API-интеграций.
- E2E smoke orchestration для критического пути MVP.
