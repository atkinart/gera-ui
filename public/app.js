(function () {
  var cfg = window.__GERA_CONFIG__ || {};

  var state = {
    accessToken: localStorage.getItem("gera.access_token") || "",
    idToken: localStorage.getItem("gera.id_token") || "",
    activeProjectId: "",
    legacyFixture: null,
    lastResult: null,
    compareSummary: null,
    viewer: {
      rotX: 25,
      rotY: 0,
      zoom: 90,
      renderEnabled: false,
      expectedOverlay: null
    },
    logs: []
  };

  var authBase = trimSlash(cfg.authBaseUrl || "");
  var apiBase = trimSlash(cfg.apiBaseUrl || "");
  var clientId = String(cfg.oidcClientId || "spa-stage");
  var redirectUri = String(cfg.oidcRedirectUri || window.location.origin + "/callback");
  var postLogoutUri = String(cfg.oidcPostLogoutUri || window.location.origin + "/");

  var MODEL_TEMPLATE = {
    configuration: {
      baseNodeNumbers: [1, 2, 3],
      baseCoordinates: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 }
      ],
      baseDistances: [10, 14.14]
    },
    calculationProcedures: {
      geometryProcedures: [
        {
          code: 1,
          args: {
            j2: 1,
            j3: 2,
            j4: 3
          }
        }
      ],
      graphProcedures: [
        {
          code: 1,
          args: {
            j2: 1,
            j3: 2
          }
        }
      ]
    }
  };
  var ARG_KEYS = ["j2", "j3", "j4", "j5", "j6", "j7", "j8", "j9", "j10", "j11", "j12"];
  var VIEWER_LIMITS = {
    rotMin: -180,
    rotMax: 180,
    zoomMin: 20,
    zoomMax: 220
  };

  initStaticInfo();
  initModelEditor();
  bindEvents();
  ensureModelTemplate();
  updateTokenState();
  renderProjects([]);
  initViewer();
  clearResultOutput();
  setHealthStatus("health-ui-status", "n/a");
  setHealthStatus("health-auth-status", "n/a");
  setHealthStatus("health-api-status", "n/a");

  handleCallback().catch(function (error) {
    print("Callback error", {
      message: toErrorMessage(error)
    });
  });

  function initStaticInfo() {
    byId("auth-endpoint").textContent = authBase || "-";
    byId("api-endpoint").textContent = apiBase || "-";
    byId("client-id").textContent = clientId;
  }

  function bindEvents() {
    byId("login-btn").addEventListener("click", beginLogin);
    byId("logout-btn").addEventListener("click", beginLogout);

    byId("check-ui").addEventListener("click", function () {
      runAndPrint(
        "UI health",
        function () {
          return fetchJson("/health");
        },
        {
          onSuccess: function () {
            setHealthStatus("health-ui-status", "UP 200");
          },
          onError: function (error) {
            setHealthStatus("health-ui-status", "DOWN " + String(error && error.status ? error.status : "x"));
          }
        }
      );
    });

    byId("check-auth").addEventListener("click", function () {
      runAndPrint(
        "Auth health",
        function () {
          return fetchJson("/proxy/auth/actuator/health");
        },
        {
          onSuccess: function () {
            setHealthStatus("health-auth-status", "UP 200");
          },
          onError: function (error) {
            setHealthStatus("health-auth-status", "DOWN " + String(error && error.status ? error.status : "x"));
          }
        }
      );
    });

    byId("check-api").addEventListener("click", function () {
      runAndPrint(
        "API readiness",
        function () {
          return fetchJson("/proxy/api/actuator/health/readiness");
        },
        {
          onSuccess: function () {
            setHealthStatus("health-api-status", "UP 200");
          },
          onError: function (error) {
            setHealthStatus("health-api-status", "DOWN " + String(error && error.status ? error.status : "x"));
          }
        }
      );
    });

    byId("register-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = new FormData(event.target);
      var payload = {
        username: String(form.get("username") || "").trim(),
        email: String(form.get("email") || "").trim(),
        password: String(form.get("password") || "")
      };

      runAndPrint("POST /api/auth/register", function () {
        return fetchJson("/proxy/auth/api/auth/register", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });
      });
    });

    byId("list-projects").addEventListener("click", function () {
      runAndPrint("GET /api/v1/projects", listProjects);
    });

    byId("load-project-btn").addEventListener("click", function () {
      runAndPrint("GET /api/v1/projects/{id}", function () {
        return loadProject(requireProjectId("Загрузите проект из списка или укажите Project ID"));
      });
    });

    byId("create-project-btn").addEventListener("click", function () {
      runAndPrint("POST /api/v1/projects", createProject);
    });

    byId("update-project-btn").addEventListener("click", function () {
      runAndPrint("PUT /api/v1/projects/{id}", function () {
        return updateProject(requireProjectId("Сначала создайте или выберите проект для обновления"));
      });
    });

    byId("ready-review-btn").addEventListener("click", function () {
      runAndPrint("POST /api/v1/projects/{id}/ready-for-review", function () {
        return markReadyForReview(requireProjectId("Сначала создайте или выберите проект"));
      });
    });

    byId("calculate-btn").addEventListener("click", function () {
      runAndPrint("POST /api/v1/projects/{id}/calculate", function () {
        return calculateFromCurrentContext();
      });
    });

    byId("load-result-btn").addEventListener("click", function () {
      runAndPrint("GET /api/v1/projects/{id}/result", function () {
        return loadResult(requireProjectId("Сначала выберите проект и выполните расчет"));
      });
    });

    byId("apply-template-btn").addEventListener("click", function () {
      setModelFromParams(MODEL_TEMPLATE);
      print("Model template applied", { ok: true });
    });

    byId("apply-ger-dan-btn").addEventListener("click", function () {
      runAndPrint("Load GER.DAN baseline", applyGerDanBaseline);
    });

    byId("add-base-point-btn").addEventListener("click", function () {
      addBasePointRow();
      updateModelSummary();
    });

    byId("add-base-distance-btn").addEventListener("click", function () {
      addBaseDistanceRow();
      updateModelSummary();
    });

    byId("add-geometry-proc-btn").addEventListener("click", function () {
      addProcedureRow("geometry");
      updateModelSummary();
    });

    byId("add-graph-proc-btn").addEventListener("click", function () {
      addProcedureRow("graph");
      updateModelSummary();
    });

    byId("submit-review-btn").addEventListener("click", function () {
      runAndPrint("POST /api/v1/projects/{id}/review-status", function () {
        return submitReview();
      });
    });

    byId("compare-legacy-btn").addEventListener("click", function () {
      runAndPrint("Compare with ger.xyz", compareWithLegacy);
    });

    byId("viewer-rot-left-btn").addEventListener("click", function () {
      adjustViewer({ dRotY: -10 });
    });

    byId("viewer-rot-right-btn").addEventListener("click", function () {
      adjustViewer({ dRotY: 10 });
    });

    byId("viewer-rot-up-btn").addEventListener("click", function () {
      adjustViewer({ dRotX: -10 });
    });

    byId("viewer-rot-down-btn").addEventListener("click", function () {
      adjustViewer({ dRotX: 10 });
    });

    byId("viewer-zoom-in-btn").addEventListener("click", function () {
      adjustViewer({ dZoom: 10 });
    });

    byId("viewer-zoom-out-btn").addEventListener("click", function () {
      adjustViewer({ dZoom: -10 });
    });

    byId("viewer-reset-btn").addEventListener("click", function () {
      resetViewerControls();
      render3DScene();
    });

    byId("projects-table-body").addEventListener("click", function (event) {
      var target = event.target.closest("button[data-action]");
      if (!target) {
        return;
      }

      var projectId = String(target.getAttribute("data-project-id") || "").trim();
      if (!projectId) {
        return;
      }

      var action = String(target.getAttribute("data-action") || "");
      if (action === "load") {
        runAndPrint("GET /api/v1/projects/{id}", function () {
          return loadProject(projectId);
        });
      } else if (action === "ready") {
        runAndPrint("POST /api/v1/projects/{id}/ready-for-review", function () {
          return markReadyForReview(projectId);
        });
      } else if (action === "calc") {
        runAndPrint("POST /api/v1/projects/{id}/calculate", function () {
          return calculateProject(projectId);
        });
      } else if (action === "result") {
        runAndPrint("GET /api/v1/projects/{id}/result", function () {
          return loadResult(projectId);
        });
      } else if (action === "review") {
        setActiveProjectId(projectId);
        print("Review project selected", { projectId: projectId });
      }
    });

    bindModelTableActions("base-points-body");
    bindModelTableActions("base-distances-body");
    bindModelTableActions("geometry-proc-body");
    bindModelTableActions("graph-proc-body");
    bindViewerMouseControls();
  }

  async function listProjects() {
    var nameFilter = String(byId("filter-name").value || "").trim();
    var qs = new URLSearchParams();
    if (nameFilter) {
      qs.set("name", nameFilter);
    }

    var path = "/proxy/api/api/v1/projects" + (qs.toString() ? "?" + qs.toString() : "");
    var response = await fetchJson(path, {
      headers: authHeaders()
    });

    var items = Array.isArray(response.body && response.body.items) ? response.body.items : [];
    renderProjects(items);
    return {
      status: response.status,
      total: items.length
    };
  }

  async function createProject() {
    var draft = collectDraft();
    if (!draft.name) {
      throw new Error("Project name is required");
    }

    var response = await fetchJson("/proxy/api/api/v1/projects", {
      method: "POST",
      headers: withJsonHeaders(authHeaders()),
      body: JSON.stringify(draft)
    });

    var projectId = String(response.body && response.body.projectId || "");
    if (projectId) {
      setActiveProjectId(projectId);
    }
    state.viewer.renderEnabled = false;
    state.lastResult = null;
    await listProjects();
    return response;
  }

  async function loadProject(projectId) {
    ensureProjectId(projectId);
    var response = await fetchJson("/proxy/api/api/v1/projects/" + encodeURIComponent(projectId), {
      headers: authHeaders()
    });

    var body = response.body || {};
    setActiveProjectId(String(body.projectId || projectId));
    byId("project-name-input").value = String(body.name || "");
    byId("project-comment-input").value = String(body.comment || "");
    setModelFromParams(body.modelParams || MODEL_TEMPLATE);
    state.viewer.renderEnabled = false;
    state.lastResult = null;
    state.compareSummary = null;
    state.viewer.expectedOverlay = null;
    setLegacyCompareStatus("n/a");
    render3DScene();

    return response;
  }

  async function updateProject(projectId) {
    ensureProjectId(projectId);
    var draft = collectDraft();
    if (!draft.name) {
      throw new Error("Project name is required");
    }

    var response = await fetchJson("/proxy/api/api/v1/projects/" + encodeURIComponent(projectId), {
      method: "PUT",
      headers: withJsonHeaders(authHeaders()),
      body: JSON.stringify(draft)
    });

    await listProjects();
    return response;
  }

  async function markReadyForReview(projectId) {
    ensureProjectId(projectId);
    setActiveProjectId(projectId);
    var response = await fetchJson("/proxy/api/api/v1/projects/" + encodeURIComponent(projectId) + "/ready-for-review", {
      method: "POST",
      headers: authHeaders()
    });
    await listProjects();
    return response;
  }

  async function calculateProject(projectId) {
    ensureProjectId(projectId);
    setActiveProjectId(projectId);
    state.viewer.renderEnabled = false;

    var response = await fetchJson("/proxy/api/api/v1/projects/" + encodeURIComponent(projectId) + "/calculate", {
      method: "POST",
      headers: authHeaders()
    });

    var calculationStatus = String(response && response.body && response.body.calculationStatus || "").toUpperCase();
    if (calculationStatus === "SUCCESS") {
      state.viewer.renderEnabled = true;
      await loadResult(projectId);
    }

    await listProjects();
    return response;
  }

  async function loadResult(projectId) {
    ensureProjectId(projectId);
    setActiveProjectId(projectId);

    var response = await fetchJson("/proxy/api/api/v1/projects/" + encodeURIComponent(projectId) + "/result", {
      headers: authHeaders()
    });

    renderResult(response.body || {});
    return response;
  }

  async function submitReview() {
    var projectId = String(byId("review-project-id").value || "").trim();
    ensureProjectId(projectId);
    setActiveProjectId(projectId);

    var status = String(byId("review-status").value || "").trim().toUpperCase();
    if (!["PENDING", "APPROVED", "REWORK"].includes(status)) {
      throw new Error("Unsupported review status");
    }

    var response = await fetchJson("/proxy/api/api/v1/projects/" + encodeURIComponent(projectId) + "/review-status", {
      method: "POST",
      headers: withJsonHeaders(authHeaders()),
      body: JSON.stringify({ status: status })
    });

    await listProjects();
    return response;
  }

  function collectDraft() {
    var modelParams = collectModelParams();

    return {
      name: String(byId("project-name-input").value || "").trim(),
      comment: String(byId("project-comment-input").value || "").trim(),
      modelParams: modelParams
    };
  }

  function readProjectId() {
    var inputValue = String(byId("project-id-input").value || "").trim();
    if (inputValue) {
      state.activeProjectId = inputValue;
      return inputValue;
    }
    return String(state.activeProjectId || "").trim();
  }

  function requireProjectId(message) {
    var projectId = readProjectId();
    if (!projectId) {
      throw new Error(message || "projectId is required");
    }
    return projectId;
  }

  async function calculateFromCurrentContext() {
    var projectId = readProjectId();
    if (!projectId) {
      var draft = collectDraft();
      if (!draft.name) {
        throw new Error("Укажите название проекта или выберите существующий проект");
      }
      var created = await createProject();
      projectId = String(created && created.body && created.body.projectId || "").trim();
      if (!projectId) {
        throw new Error("Не удалось создать проект перед расчетом");
      }
      print("Проект создан автоматически перед расчетом", { projectId: projectId });
    }
    return calculateProject(projectId);
  }

  function setActiveProjectId(projectId) {
    var value = String(projectId || "").trim();
    if (!value) {
      return;
    }
    state.activeProjectId = value;
    byId("project-id-input").value = value;
    byId("review-project-id").value = value;
  }

  function ensureProjectId(projectId) {
    if (!projectId) {
      throw new Error("projectId is required");
    }
  }

  async function getLegacyFixture() {
    if (state.legacyFixture) {
      return state.legacyFixture;
    }

    var response = await fetchJson("/fixtures/ger-kupol-fixture.json");
    state.legacyFixture = response.body || null;
    if (!state.legacyFixture) {
      throw new Error("Не удалось загрузить fixture ger-kupol");
    }
    return state.legacyFixture;
  }

  async function applyGerDanBaseline() {
    var fixture = await getLegacyFixture();
    var modelParams = fixture && fixture.modelParams ? fixture.modelParams : null;
    if (!modelParams) {
      throw new Error("В fixture отсутствует modelParams");
    }

    setModelFromParams(modelParams);
    byId("project-name-input").value = "GER.DAN baseline";
    byId("project-comment-input").value = "Loaded from gera-lib/code/ger.dan";
    state.activeProjectId = "";
    state.viewer.renderEnabled = false;
    state.lastResult = null;
    state.compareSummary = null;
    state.viewer.expectedOverlay = null;
    byId("project-id-input").value = "";
    byId("review-project-id").value = "";

    setLegacyCompareStatus("fixture loaded");
    render3DScene();

    var header = fixture.legacyHeader || {};
    return {
      source: fixture.source || {},
      geometryProcedureCount: Number(header.geometryProcedureCount || 0),
      graphProcedureCount: Number(header.graphProcedureCount || 0),
      baseNodeCount: Number(header.baseNodeCount || 0),
      expectedNodeCount: Array.isArray(fixture.expectedXyz && fixture.expectedXyz.nodes) ? fixture.expectedXyz.nodes.length : 0
    };
  }

  async function compareWithLegacy() {
    if (!state.lastResult) {
      throw new Error("Сначала выполните расчет и загрузите результат");
    }

    var fixture = await getLegacyFixture();
    var expectedNodes = Array.isArray(fixture.expectedXyz && fixture.expectedXyz.nodes)
      ? fixture.expectedXyz.nodes
      : [];
    if (expectedNodes.length === 0) {
      throw new Error("В fixture отсутствуют узлы expectedXyz");
    }

    var actualNodes = extractResultNodes(state.lastResult);
    if (actualNodes.length === 0) {
      throw new Error("В результате расчета отсутствуют узлы для сравнения");
    }

    var expectedMap = new Map();
    expectedNodes.forEach(function (node) {
      expectedMap.set(Number(node.id), {
        id: Number(node.id),
        x: Number(node.x),
        y: Number(node.y),
        z: Number(node.z)
      });
    });

    var actualMap = new Map();
    actualNodes.forEach(function (node) {
      actualMap.set(Number(node.id), node);
    });

    var matched = 0;
    var missingExpected = 0;
    var maxAbsDelta = 0;
    var sumSq = 0;

    expectedMap.forEach(function (expected, id) {
      var actual = actualMap.get(id);
      if (!actual) {
        missingExpected += 1;
        return;
      }
      matched += 1;
      var dx = actual.x - expected.x;
      var dy = actual.y - expected.y;
      var dz = actual.z - expected.z;
      sumSq += dx * dx + dy * dy + dz * dz;
      maxAbsDelta = Math.max(maxAbsDelta, Math.abs(dx), Math.abs(dy), Math.abs(dz));
    });

    var extraActual = 0;
    actualMap.forEach(function (_node, id) {
      if (!expectedMap.has(id)) {
        extraActual += 1;
      }
    });

    var rmse = matched > 0 ? Math.sqrt(sumSq / (matched * 3)) : null;
    var pass = matched > 0 && missingExpected === 0 && extraActual === 0 && maxAbsDelta <= 0.01;
    var statusText = pass
      ? "PASS maxΔ=" + maxAbsDelta.toFixed(4)
      : "DIFF maxΔ=" + maxAbsDelta.toFixed(4) + " miss=" + missingExpected + " extra=" + extraActual;

    setLegacyCompareStatus(statusText);

    state.compareSummary = {
      pass: pass,
      matchedNodes: matched,
      expectedNodes: expectedNodes.length,
      actualNodes: actualNodes.length,
      missingExpected: missingExpected,
      extraActual: extraActual,
      maxAbsDelta: Number(maxAbsDelta.toFixed(6)),
      rmse: rmse === null ? null : Number(rmse.toFixed(6))
    };

    state.viewer.expectedOverlay = expectedNodes;
    render3DScene();

    return state.compareSummary;
  }

  function setLegacyCompareStatus(value) {
    var el = byId("legacy-compare-status");
    if (!el) {
      return;
    }
    el.textContent = String(value || "n/a");
  }

  function initViewer() {
    resetViewerControls();
    render3DScene();
    window.addEventListener("resize", function () {
      render3DScene();
    });
  }

  function resetViewerControls() {
    state.viewer.rotX = 25;
    state.viewer.rotY = 0;
    state.viewer.zoom = 90;
  }

  function adjustViewer(delta) {
    var d = delta && typeof delta === "object" ? delta : {};
    state.viewer.rotX = clamp(state.viewer.rotX + Number(d.dRotX || 0), VIEWER_LIMITS.rotMin, VIEWER_LIMITS.rotMax);
    state.viewer.rotY = clamp(state.viewer.rotY + Number(d.dRotY || 0), VIEWER_LIMITS.rotMin, VIEWER_LIMITS.rotMax);
    state.viewer.zoom = clamp(state.viewer.zoom + Number(d.dZoom || 0), VIEWER_LIMITS.zoomMin, VIEWER_LIMITS.zoomMax);
    render3DScene();
  }

  function bindViewerMouseControls() {
    var canvas = byId("result-3d-canvas");
    if (!canvas || canvas.getAttribute("data-mouse-bound") === "1") {
      return;
    }
    canvas.setAttribute("data-mouse-bound", "1");

    var dragState = {
      active: false,
      x: 0,
      y: 0
    };

    function endDrag() {
      dragState.active = false;
      canvas.classList.remove("is-dragging");
    }

    canvas.addEventListener("mousedown", function (event) {
      dragState.active = true;
      dragState.x = event.clientX;
      dragState.y = event.clientY;
      canvas.classList.add("is-dragging");
    });

    canvas.addEventListener("mousemove", function (event) {
      if (!dragState.active) {
        return;
      }
      var dx = event.clientX - dragState.x;
      var dy = event.clientY - dragState.y;
      dragState.x = event.clientX;
      dragState.y = event.clientY;

      state.viewer.rotY = clamp(state.viewer.rotY + dx * 0.45, VIEWER_LIMITS.rotMin, VIEWER_LIMITS.rotMax);
      state.viewer.rotX = clamp(state.viewer.rotX + dy * 0.45, VIEWER_LIMITS.rotMin, VIEWER_LIMITS.rotMax);
      render3DScene();
    });

    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);
    window.addEventListener("mouseup", endDrag);

    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      state.viewer.zoom = clamp(state.viewer.zoom - event.deltaY * 0.05, VIEWER_LIMITS.zoomMin, VIEWER_LIMITS.zoomMax);
      render3DScene();
    }, { passive: false });

    canvas.addEventListener("dblclick", function () {
      resetViewerControls();
      render3DScene();
    });
  }

  function render3DScene() {
    var canvas = byId("result-3d-canvas");
    if (!canvas) {
      return;
    }
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    var rect = canvas.getBoundingClientRect();
    var width = Math.max(320, Math.floor(rect.width || canvas.width || 920));
    var height = Math.max(220, Math.floor(rect.height || canvas.height || 420));
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    var grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#f9fcff");
    grad.addColorStop(1, "#eef5ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    var nodes = extractResultNodes(state.lastResult);
    var edges = extractResultEdges(state.lastResult);
    if (!state.viewer.renderEnabled || nodes.length === 0) {
      drawAxes(ctx, width, height, {
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        radius: 1
      }, radians(state.viewer.rotX), radians(state.viewer.rotY), state.viewer.zoom);
      ctx.fillStyle = "#4c5b80";
      ctx.font = "14px Avenir Next, sans-serif";
      ctx.fillText("3D preview: модель доступна после успешного расчета", 18, 28);
      return;
    }

    var rotX = radians(state.viewer.rotX);
    var rotY = radians(state.viewer.rotY);
    var scaleData = computeScaleData(nodes);
    drawAxes(ctx, width, height, scaleData, rotX, rotY, state.viewer.zoom);
    var projected = projectNodes(nodes, rotX, rotY, state.viewer.zoom, width, height, scaleData);
    var byIdMap = new Map();
    projected.forEach(function (point) {
      byIdMap.set(point.id, point);
    });

    ctx.strokeStyle = "rgba(9, 64, 108, 0.65)";
    ctx.lineWidth = 1.2;
    edges.forEach(function (edge) {
      var fromPoint = byIdMap.get(edge.from);
      var toPoint = byIdMap.get(edge.to);
      if (!fromPoint || !toPoint) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(fromPoint.sx, fromPoint.sy);
      ctx.lineTo(toPoint.sx, toPoint.sy);
      ctx.stroke();
    });

    var overlay = Array.isArray(state.viewer.expectedOverlay) ? state.viewer.expectedOverlay : [];
    if (overlay.length > 0) {
      var overlayProjected = projectNodes(overlay, rotX, rotY, state.viewer.zoom, width, height, scaleData);
      ctx.fillStyle = "rgba(241, 143, 1, 0.55)";
      overlayProjected.forEach(function (point) {
        ctx.beginPath();
        ctx.arc(point.sx, point.sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    projected.sort(function (a, b) {
      return a.depth - b.depth;
    });
    projected.forEach(function (point) {
      var radius = 2.2 + point.scaleFactor * 1.6;
      ctx.beginPath();
      ctx.fillStyle = "rgba(0, 95, 115, 0.86)";
      ctx.arc(point.sx, point.sy, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#2c4569";
    ctx.font = "12px Avenir Next, sans-serif";
    ctx.fillText("nodes=" + nodes.length + " edges=" + edges.length, 16, 20);
    if (state.compareSummary) {
      var label = state.compareSummary.pass
        ? "legacy compare: PASS"
        : "legacy compare: DIFF";
      ctx.fillText(label, 16, 38);
    }
  }

  function computeScaleData(nodes) {
    var minX = Number.POSITIVE_INFINITY;
    var minY = Number.POSITIVE_INFINITY;
    var minZ = Number.POSITIVE_INFINITY;
    var maxX = Number.NEGATIVE_INFINITY;
    var maxY = Number.NEGATIVE_INFINITY;
    var maxZ = Number.NEGATIVE_INFINITY;

    nodes.forEach(function (node) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      minZ = Math.min(minZ, node.z);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
      maxZ = Math.max(maxZ, node.z);
    });

    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;
    var cz = (minZ + maxZ) / 2;
    var dx = Math.max(1, maxX - minX);
    var dy = Math.max(1, maxY - minY);
    var dz = Math.max(1, maxZ - minZ);
    var radius = Math.max(dx, dy, dz);

    return {
      centerX: cx,
      centerY: cy,
      centerZ: cz,
      radius: radius
    };
  }

  function drawAxes(ctx, width, height, scaleData, rotX, rotY, zoomPercent) {
    var axisLen = Math.max(1, scaleData.radius) * 0.85;
    var origin = projectPoint(
      { id: 0, x: scaleData.centerX, y: scaleData.centerY, z: scaleData.centerZ },
      rotX,
      rotY,
      zoomPercent,
      width,
      height,
      scaleData
    );
    var xEnd = projectPoint(
      { id: 0, x: scaleData.centerX + axisLen, y: scaleData.centerY, z: scaleData.centerZ },
      rotX,
      rotY,
      zoomPercent,
      width,
      height,
      scaleData
    );
    var yEnd = projectPoint(
      { id: 0, x: scaleData.centerX, y: scaleData.centerY + axisLen, z: scaleData.centerZ },
      rotX,
      rotY,
      zoomPercent,
      width,
      height,
      scaleData
    );
    var zEnd = projectPoint(
      { id: 0, x: scaleData.centerX, y: scaleData.centerY, z: scaleData.centerZ + axisLen },
      rotX,
      rotY,
      zoomPercent,
      width,
      height,
      scaleData
    );

    drawAxisLine(ctx, origin, xEnd, "#d62828", "X");
    drawAxisLine(ctx, origin, yEnd, "#2a9d8f", "Y");
    drawAxisLine(ctx, origin, zEnd, "#1d4ed8", "Z");
  }

  function drawAxisLine(ctx, origin, end, color, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(end.sx, end.sy);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(end.sx, end.sy, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "12px Avenir Next, sans-serif";
    ctx.fillText(label, end.sx + 4, end.sy - 4);
  }

  function projectNodes(nodes, rotX, rotY, zoomPercent, width, height, scaleData) {
    return nodes.map(function (node) {
      return projectPoint(node, rotX, rotY, zoomPercent, width, height, scaleData);
    });
  }

  function projectPoint(node, rotX, rotY, zoomPercent, width, height, scaleData) {
    var radius = Math.max(1, scaleData.radius);
    var baseScale = (Math.min(width, height) * 0.36) / radius;
    var zoomMul = Math.max(0.2, Number(zoomPercent || 90) / 90);
    var camera = radius * 3.2;

    var x = toFiniteNumber(node && node.x, 0) - scaleData.centerX;
    var y = toFiniteNumber(node && node.y, 0) - scaleData.centerY;
    var z = toFiniteNumber(node && node.z, 0) - scaleData.centerZ;

    var y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
    var z1 = y * Math.sin(rotX) + z * Math.cos(rotX);

    var x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
    var z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);

    var perspective = camera / (camera + z2 + radius * 0.8);
    var sx = width / 2 + x2 * baseScale * perspective * zoomMul;
    var sy = height / 2 + y1 * baseScale * perspective * zoomMul;

    return {
      id: toFiniteInt(node && node.id, 0),
      sx: sx,
      sy: sy,
      depth: z2,
      scaleFactor: perspective
    };
  }

  function radians(degrees) {
    return (Number(degrees || 0) * Math.PI) / 180;
  }

  function extractResultNodes(payload) {
    if (!payload || typeof payload !== "object") {
      return [];
    }

    var model = payload.visualizationModel && typeof payload.visualizationModel === "object"
      ? payload.visualizationModel
      : {};
    var visualNodes = Array.isArray(model.nodes) ? model.nodes : [];
    if (visualNodes.length > 0) {
      return visualNodes
        .map(function (node, index) {
          return {
            id: toFiniteInt(node && node.id, index + 1),
            x: toFiniteNumber(node && node.x, 0),
            y: toFiniteNumber(node && node.y, 0),
            z: toFiniteNumber(node && node.z, 0)
          };
        });
    }

    var coordinates = Array.isArray(payload.coordinatesTable) ? payload.coordinatesTable : [];
    return coordinates.map(function (row, index) {
      return {
        id: toFiniteInt(row && row.node, index + 1),
        x: toFiniteNumber(row && row.x, 0),
        y: toFiniteNumber(row && row.y, 0),
        z: toFiniteNumber(row && row.z, 0)
      };
    });
  }

  function extractResultEdges(payload) {
    if (!payload || typeof payload !== "object") {
      return [];
    }
    var model = payload.visualizationModel && typeof payload.visualizationModel === "object"
      ? payload.visualizationModel
      : {};
    var visualEdges = Array.isArray(model.edges) ? model.edges : [];
    if (visualEdges.length > 0) {
      return visualEdges.map(function (edge) {
        return {
          from: toFiniteInt(edge && edge.from, 0),
          to: toFiniteInt(edge && edge.to, 0)
        };
      }).filter(function (edge) {
        return edge.from > 0 && edge.to > 0;
      });
    }

    var connectivity = Array.isArray(payload.connectivityTable) ? payload.connectivityTable : [];
    return connectivity.map(function (edge) {
      return {
        from: toFiniteInt(edge && edge.from, 0),
        to: toFiniteInt(edge && edge.to, 0)
      };
    }).filter(function (edge) {
      return edge.from > 0 && edge.to > 0;
    });
  }

  function toFiniteNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function toFiniteInt(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value || 0)));
  }

  function renderProjects(items) {
    var rows = Array.isArray(items) ? items : [];
    byId("projects-summary").textContent = rows.length + " project(s)";
    byId("kpi-project-count").textContent = String(rows.length);

    var readyCount = rows.filter(function (item) {
      return String(item && item.status || "").toUpperCase() === "READY";
    }).length;
    byId("kpi-ready-count").textContent = "READY: " + String(readyCount);

    var tbody = byId("projects-table-body");
    tbody.innerHTML = "";

    if (rows.length === 0) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No projects";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (var index = 0; index < rows.length; index += 1) {
      var item = rows[index] || {};
      var trRow = document.createElement("tr");
      appendTextCell(trRow, String(item.projectId || ""));
      appendTextCell(trRow, String(item.name || ""));
      appendTextCell(trRow, String(item.status || ""));
      appendTextCell(trRow, String(item.reviewStatus || ""));
      appendTextCell(trRow, String(item.updatedAt || ""));

      var actionsTd = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "row";
      actions.appendChild(actionButton("Load", "load", item.projectId));
      actions.appendChild(actionButton("Ready", "ready", item.projectId));
      actions.appendChild(actionButton("Calc", "calc", item.projectId));
      actions.appendChild(actionButton("Result", "result", item.projectId));
      actions.appendChild(actionButton("Review", "review", item.projectId));
      actionsTd.appendChild(actions);
      trRow.appendChild(actionsTd);

      tbody.appendChild(trRow);
    }
  }

  function appendTextCell(row, value) {
    var td = document.createElement("td");
    td.textContent = value;
    row.appendChild(td);
  }

  function actionButton(label, action, projectId) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("data-action", action);
    button.setAttribute("data-project-id", String(projectId || ""));
    return button;
  }

  function renderResult(payload) {
    state.lastResult = payload && typeof payload === "object" ? payload : {};
    state.viewer.expectedOverlay = null;
    state.compareSummary = null;
    setLegacyCompareStatus("n/a");

    var model = payload && payload.visualizationModel ? payload.visualizationModel : {};
    var nodes = Array.isArray(model.nodes) ? model.nodes : [];
    var edges = Array.isArray(model.edges) ? model.edges : [];
    var coords = Array.isArray(payload.coordinatesTable) ? payload.coordinatesTable : [];
    var conn = Array.isArray(payload.connectivityTable) ? payload.connectivityTable : [];
    var dist = Array.isArray(payload.distances) ? payload.distances : [];

    var summary = {
      projectId: payload.projectId || "",
      resultId: payload.resultId || "",
      generatedAt: payload.generatedAt || "",
      nodes: nodes.length,
      edges: edges.length,
      coordinates: coords.length,
      connectivity: conn.length,
      distances: dist.length,
      sampleNodes: nodes.slice(0, 5),
      sampleEdges: edges.slice(0, 5)
    };

    byId("result-output").textContent = pretty(summary);
    byId("kpi-result-nodes").textContent = "nodes: " + String(nodes.length) + " / edges: " + String(edges.length);
    byId("kpi-last-op").textContent = "Result loaded";
    render3DScene();
  }

  function clearResultOutput() {
    state.lastResult = null;
    state.viewer.renderEnabled = false;
    state.viewer.expectedOverlay = null;
    state.compareSummary = null;
    setLegacyCompareStatus("n/a");

    byId("result-output").textContent = pretty({
      message: "No result loaded yet"
    });
    byId("kpi-result-nodes").textContent = "nodes: 0 / edges: 0";
    render3DScene();
  }

  function ensureModelTemplate() {
    var hasAnyPoints = byId("base-points-body").children.length > 0;
    var hasAnyGeo = byId("geometry-proc-body").children.length > 0;
    var hasAnyGraph = byId("graph-proc-body").children.length > 0;
    if (!hasAnyPoints && !hasAnyGeo && !hasAnyGraph) {
      setModelFromParams(MODEL_TEMPLATE);
    }
    updateModelSummary();
  }

  function initModelEditor() {
    byId("base-points-body").innerHTML = "";
    byId("base-distances-body").innerHTML = "";
    byId("geometry-proc-body").innerHTML = "";
    byId("graph-proc-body").innerHTML = "";
  }

  function bindModelTableActions(tbodyId) {
    var tbody = byId(tbodyId);
    if (!tbody) {
      return;
    }
    tbody.addEventListener("click", function (event) {
      var target = event.target.closest("button[data-remove-row]");
      if (!target) {
        return;
      }
      var row = target.closest("tr");
      if (row) {
        row.remove();
      }
      updateModelSummary();
    });

    tbody.addEventListener("input", function () {
      updateModelSummary();
    });
  }

  function setModelFromParams(modelParams) {
    var source = modelParams && typeof modelParams === "object" ? modelParams : {};
    var cfg = source.configuration && typeof source.configuration === "object" ? source.configuration : {};
    var proc = source.calculationProcedures && typeof source.calculationProcedures === "object" ? source.calculationProcedures : {};

    var nodeNumbers = Array.isArray(cfg.baseNodeNumbers) ? cfg.baseNodeNumbers : [];
    var coordinates = Array.isArray(cfg.baseCoordinates) ? cfg.baseCoordinates : [];
    var distances = Array.isArray(cfg.baseDistances) ? cfg.baseDistances : [];

    byId("base-points-body").innerHTML = "";
    byId("base-distances-body").innerHTML = "";
    byId("geometry-proc-body").innerHTML = "";
    byId("graph-proc-body").innerHTML = "";

    var maxLen = Math.max(nodeNumbers.length, coordinates.length);
    if (maxLen === 0) {
      addBasePointRow();
    } else {
      for (var i = 0; i < maxLen; i += 1) {
        var point = coordinates[i] || {};
        addBasePointRow({
          node: nodeNumbers[i],
          x: point.x,
          y: point.y,
          z: point.z
        });
      }
    }

    if (distances.length === 0) {
      addBaseDistanceRow();
    } else {
      for (var d = 0; d < distances.length; d += 1) {
        addBaseDistanceRow({ value: distances[d] });
      }
    }

    var geometryProcedures = Array.isArray(proc.geometryProcedures) ? proc.geometryProcedures : [];
    if (geometryProcedures.length === 0) {
      addProcedureRow("geometry");
    } else {
      for (var g = 0; g < geometryProcedures.length; g += 1) {
        addProcedureRow("geometry", geometryProcedures[g]);
      }
    }

    var graphProcedures = Array.isArray(proc.graphProcedures) ? proc.graphProcedures : [];
    if (graphProcedures.length === 0) {
      addProcedureRow("graph");
    } else {
      for (var j = 0; j < graphProcedures.length; j += 1) {
        addProcedureRow("graph", graphProcedures[j]);
      }
    }

    updateModelSummary();
  }

  function addBasePointRow(data) {
    var source = data && typeof data === "object" ? data : {};
    var tr = document.createElement("tr");

    tr.appendChild(basePointCell("node", source.node));
    tr.appendChild(basePointCell("x", source.x));
    tr.appendChild(basePointCell("y", source.y));
    tr.appendChild(basePointCell("z", source.z));
    tr.appendChild(removeCell());

    byId("base-points-body").appendChild(tr);
  }

  function basePointCell(kind, value) {
    var td = document.createElement("td");
    var input = document.createElement("input");
    input.type = "number";
    input.className = "model-number";
    input.setAttribute("data-kind", kind);
    if (kind === "node") {
      input.step = "1";
    } else {
      input.step = "any";
    }
    if (value !== undefined && value !== null && value !== "") {
      input.value = String(value);
    }
    td.appendChild(input);
    return td;
  }

  function addBaseDistanceRow(data) {
    var source = data && typeof data === "object" ? data : {};
    var tr = document.createElement("tr");
    var tdValue = document.createElement("td");
    var input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.className = "model-number";
    input.setAttribute("data-kind", "distance");
    if (source.value !== undefined && source.value !== null && source.value !== "") {
      input.value = String(source.value);
    }
    tdValue.appendChild(input);
    tr.appendChild(tdValue);
    tr.appendChild(removeCell());
    byId("base-distances-body").appendChild(tr);
  }

  function addProcedureRow(type, data) {
    var source = data && typeof data === "object" ? data : {};
    var args = source.args && typeof source.args === "object" ? source.args : {};
    var tr = document.createElement("tr");
    tr.setAttribute("data-procedure-type", type);

    var tdCode = document.createElement("td");
    var inputCode = document.createElement("input");
    inputCode.type = "number";
    inputCode.step = "1";
    inputCode.className = "model-number";
    inputCode.setAttribute("data-kind", "code");
    if (source.code !== undefined && source.code !== null && source.code !== "") {
      inputCode.value = String(source.code);
    }
    tdCode.appendChild(inputCode);
    tr.appendChild(tdCode);

    for (var i = 0; i < ARG_KEYS.length; i += 1) {
      var key = ARG_KEYS[i];
      var tdArg = document.createElement("td");
      var inputArg = document.createElement("input");
      inputArg.type = "number";
      inputArg.step = "1";
      inputArg.className = "model-number";
      inputArg.setAttribute("data-kind", key);
      if (args[key] !== undefined && args[key] !== null && args[key] !== "") {
        inputArg.value = String(args[key]);
      }
      tdArg.appendChild(inputArg);
      tr.appendChild(tdArg);
    }

    tr.appendChild(removeCell());
    var targetBody = type === "geometry" ? "geometry-proc-body" : "graph-proc-body";
    byId(targetBody).appendChild(tr);
  }

  function removeCell() {
    var td = document.createElement("td");
    var button = document.createElement("button");
    button.type = "button";
    button.className = "danger-btn";
    button.setAttribute("data-remove-row", "1");
    button.textContent = "Удалить";
    td.appendChild(button);
    return td;
  }

  function collectModelParams() {
    var points = collectBasePoints();
    var distances = collectDistances();
    var geometry = collectProcedures("geometry-proc-body");
    var graph = collectProcedures("graph-proc-body");

    if (points.baseNodeNumbers.length === 0) {
      throw new Error("Добавьте минимум один базовый узел");
    }

    return {
      configuration: {
        baseNodeNumbers: points.baseNodeNumbers,
        baseCoordinates: points.baseCoordinates,
        baseDistances: distances
      },
      calculationProcedures: {
        geometryProcedures: geometry,
        graphProcedures: graph
      }
    };
  }

  function collectBasePoints() {
    var rows = byId("base-points-body").querySelectorAll("tr");
    var baseNodeNumbers = [];
    var baseCoordinates = [];

    rows.forEach(function (row) {
      var nodeRaw = valueFor(row, "node");
      var xRaw = valueFor(row, "x");
      var yRaw = valueFor(row, "y");
      var zRaw = valueFor(row, "z");

      if (!nodeRaw && !xRaw && !yRaw && !zRaw) {
        return;
      }

      if (!nodeRaw || !xRaw || !yRaw || !zRaw) {
        throw new Error("Заполните node/x/y/z в каждой строке базовых узлов");
      }

      baseNodeNumbers.push(parseIntStrict(nodeRaw, "baseNodeNumbers"));
      baseCoordinates.push({
        x: parseFloatStrict(xRaw, "baseCoordinates.x"),
        y: parseFloatStrict(yRaw, "baseCoordinates.y"),
        z: parseFloatStrict(zRaw, "baseCoordinates.z")
      });
    });

    return {
      baseNodeNumbers: baseNodeNumbers,
      baseCoordinates: baseCoordinates
    };
  }

  function collectDistances() {
    var rows = byId("base-distances-body").querySelectorAll("tr");
    var result = [];

    rows.forEach(function (row) {
      var value = valueFor(row, "distance");
      if (!value) {
        return;
      }
      result.push(parseFloatStrict(value, "baseDistances"));
    });

    return result;
  }

  function collectProcedures(tbodyId) {
    var rows = byId(tbodyId).querySelectorAll("tr");
    var result = [];

    rows.forEach(function (row) {
      var codeRaw = valueFor(row, "code");
      var hasAnyArg = false;
      for (var i = 0; i < ARG_KEYS.length; i += 1) {
        if (valueFor(row, ARG_KEYS[i])) {
          hasAnyArg = true;
          break;
        }
      }

      if (!codeRaw && !hasAnyArg) {
        return;
      }
      if (!codeRaw) {
        throw new Error("Укажите code для процедуры");
      }

      var args = {};
      for (var j = 0; j < ARG_KEYS.length; j += 1) {
        var key = ARG_KEYS[j];
        var raw = valueFor(row, key);
        if (!raw) {
          continue;
        }
        args[key] = parseIntStrict(raw, key);
      }

      result.push({
        code: parseIntStrict(codeRaw, "procedure.code"),
        args: args
      });
    });

    return result;
  }

  function valueFor(row, kind) {
    var input = row.querySelector('input[data-kind="' + kind + '"]');
    if (!input) {
      return "";
    }
    return String(input.value || "").trim();
  }

  function parseIntStrict(value, field) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error("Некорректное число в " + field);
    }
    return Math.trunc(parsed);
  }

  function parseFloatStrict(value, field) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error("Некорректное число в " + field);
    }
    return parsed;
  }

  function updateModelSummary() {
    var pointsCount = byId("base-points-body").querySelectorAll("tr").length;
    var distancesCount = byId("base-distances-body").querySelectorAll("tr").length;
    var geoCount = byId("geometry-proc-body").querySelectorAll("tr").length;
    var graphCount = byId("graph-proc-body").querySelectorAll("tr").length;
    byId("model-summary").textContent = "Модель: points=" + pointsCount + ", distances=" + distancesCount + ", geometry=" + geoCount + ", graph=" + graphCount;
  }

  function beginLogin() {
    if (!authBase) {
      print("Login error", { message: "Auth base URL is empty" });
      return;
    }

    createPkcePair().then(function (pkce) {
      var stateValue = randomBase64Url(24);
      var nonce = randomBase64Url(24);
      sessionStorage.setItem(
        "gera.pkce." + stateValue,
        JSON.stringify({ codeVerifier: pkce.verifier, nonce: nonce, createdAt: Date.now() })
      );

      var params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "openid profile api.read",
        state: stateValue,
        nonce: nonce,
        code_challenge: pkce.challenge,
        code_challenge_method: "S256"
      });

      window.location.assign(authBase + "/oauth2/authorize?" + params.toString());
    }).catch(function (error) {
      print("Login error", {
        message: toErrorMessage(error)
      });
    });
  }

  function beginLogout() {
    if (!state.idToken) {
      clearTokens();
      print("Logout", { message: "No id_token stored, local session cleared" });
      return;
    }

    var params = new URLSearchParams({
      id_token_hint: state.idToken,
      post_logout_redirect_uri: postLogoutUri,
      state: randomBase64Url(16)
    });

    clearTokens();
    window.location.assign(authBase + "/connect/logout?" + params.toString());
  }

  async function handleCallback() {
    var url = new URL(window.location.href);
    if (!url.pathname.startsWith("/callback")) {
      return;
    }

    var code = url.searchParams.get("code");
    var stateValue = url.searchParams.get("state");
    var err = url.searchParams.get("error");
    if (err) {
      print("OIDC callback error", {
        error: err,
        error_description: url.searchParams.get("error_description") || ""
      });
      window.history.replaceState({}, "", "/");
      return;
    }

    if (!code || !stateValue) {
      print("OIDC callback", { message: "Missing code/state" });
      window.history.replaceState({}, "", "/");
      return;
    }

    var entryRaw = sessionStorage.getItem("gera.pkce." + stateValue);
    sessionStorage.removeItem("gera.pkce." + stateValue);
    if (!entryRaw) {
      print("OIDC callback", { message: "PKCE state not found" });
      window.history.replaceState({}, "", "/");
      return;
    }

    var entry = JSON.parse(entryRaw);
    var tokenResponse = await fetchJson("/proxy/auth/oauth2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: entry.codeVerifier
      }).toString()
    });

    state.accessToken = String(tokenResponse.body.access_token || "");
    state.idToken = String(tokenResponse.body.id_token || "");
    localStorage.setItem("gera.access_token", state.accessToken);
    localStorage.setItem("gera.id_token", state.idToken);
    updateTokenState();

    print("OIDC token exchange", {
      status: tokenResponse.status,
      token_type: tokenResponse.body.token_type,
      expires_in: tokenResponse.body.expires_in,
      has_access_token: Boolean(state.accessToken),
      has_id_token: Boolean(state.idToken)
    });

    window.history.replaceState({}, "", "/");
  }

  function authHeaders() {
    var headers = {};
    if (state.accessToken) {
      headers.authorization = "Bearer " + state.accessToken;
    }
    return headers;
  }

  function withJsonHeaders(headers) {
    var out = Object.assign({}, headers || {});
    out["content-type"] = "application/json";
    return out;
  }

  function clearTokens() {
    state.accessToken = "";
    state.idToken = "";
    localStorage.removeItem("gera.access_token");
    localStorage.removeItem("gera.id_token");
    updateTokenState();
  }

  function updateTokenState() {
    byId("token-state").textContent = state.accessToken ? "present" : "none";
    var accessPayload = decodeJwtPayload(state.accessToken);
    byId("token-sub").textContent = accessPayload && accessPayload.sub ? String(accessPayload.sub) : "-";

    var scope = "-";
    if (accessPayload) {
      if (typeof accessPayload.scope === "string" && accessPayload.scope) {
        scope = accessPayload.scope;
      } else if (Array.isArray(accessPayload.scp) && accessPayload.scp.length > 0) {
        scope = accessPayload.scp.join(" ");
      }
    }
    byId("token-scope").textContent = scope;
  }

  function decodeJwtPayload(token) {
    if (!token || typeof token !== "string") {
      return null;
    }
    var parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }
    try {
      var payload = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      var pad = payload.length % 4;
      if (pad) {
        payload += "=".repeat(4 - pad);
      }
      var json = atob(payload);
      return JSON.parse(json);
    } catch (_error) {
      return null;
    }
  }

  function runAndPrint(title, callback, hooks) {
    var options = hooks && typeof hooks === "object" ? hooks : {};
    Promise.resolve()
      .then(callback)
      .then(function (result) {
        if (typeof options.onSuccess === "function") {
          options.onSuccess(result);
        }
        print(title, result);
      })
      .catch(function (error) {
        if (typeof options.onError === "function") {
          options.onError(error);
        }
        print(title + " failed", {
          message: toErrorMessage(error),
          status: error && error.status ? error.status : 0,
          details: error && error.details ? error.details : null
        });
      });
  }

  async function fetchJson(url, options) {
    var request = options || {};
    var response = await fetch(url, request);
    var text = await response.text();
    var body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_err) {
      body = { raw: text };
    }

    if (!response.ok) {
      var error = new Error("HTTP " + response.status);
      error.status = response.status;
      error.details = body;
      throw error;
    }

    return {
      status: response.status,
      body: body
    };
  }

  function print(title, payload) {
    var row = {
      at: new Date().toISOString(),
      title: title,
      payload: payload
    };
    state.logs.push(row);
    if (state.logs.length > 20) {
      state.logs = state.logs.slice(state.logs.length - 20);
    }
    byId("output").textContent = pretty(state.logs);
    byId("kpi-last-op").textContent = title;
  }

  function setHealthStatus(id, value) {
    var el = byId(id);
    if (!el) {
      return;
    }
    el.textContent = String(value || "n/a");
  }

  function pretty(value) {
    return JSON.stringify(value, null, 2);
  }

  function toErrorMessage(error) {
    return String(error && error.message ? error.message : error);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function trimSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function randomBase64Url(length) {
    var bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  }

  function toBase64Url(input) {
    var binary = "";
    for (var index = 0; index < input.length; index += 1) {
      binary += String.fromCharCode(input[index]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  async function createPkcePair() {
    var verifier = randomBase64Url(64);
    var encoded = new TextEncoder().encode(verifier);
    var digest = await crypto.subtle.digest("SHA-256", encoded);
    var challenge = toBase64Url(new Uint8Array(digest));
    return { verifier: verifier, challenge: challenge };
  }
})();
