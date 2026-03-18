const fs = require("fs/promises");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT || 8081);
const staticRoot = path.resolve(__dirname, "..", "public");

const config = {
  apiBaseUrl: normalizeBaseUrl(process.env.UI_API_BASE_URL || process.env.API_BASE_URL, "http://localhost:8080"),
  authBaseUrl: normalizeBaseUrl(process.env.UI_AUTH_BASE_URL || process.env.AUTH_BASE_URL, "http://localhost:9000"),
  apiProxyUpstream: normalizeBaseUrl(process.env.UI_API_PROXY_BASE_URL || process.env.API_PROXY_BASE_URL || process.env.UI_API_BASE_URL || process.env.API_BASE_URL, "http://localhost:8080"),
  authProxyUpstream: normalizeBaseUrl(process.env.UI_AUTH_PROXY_BASE_URL || process.env.AUTH_PROXY_BASE_URL || process.env.UI_AUTH_BASE_URL || process.env.AUTH_BASE_URL, "http://localhost:9000"),
  oidcClientId: String(process.env.UI_OIDC_CLIENT_ID || process.env.OIDC_CLIENT_ID || "spa"),
  oidcRedirectUri: String(process.env.UI_OIDC_REDIRECT_URI || process.env.OIDC_REDIRECT_URI || ""),
  oidcPostLogoutUri: String(process.env.UI_OIDC_POST_LOGOUT_URI || process.env.OIDC_POST_LOGOUT_URI || ""),
  apiProxyBase: "/proxy/api",
  authProxyBase: "/proxy/auth"
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  try {
    const incomingUrl = new URL(req.url || "/", "http://localhost");
    const pathname = incomingUrl.pathname;

    if (pathname === "/health") {
      sendJson(res, 200, {
        status: "UP",
        service: "gera-ui",
        mode: "mvp-web"
      });
      return;
    }

    if (pathname === "/config.js") {
      const payload = "window.__GERA_CONFIG__ = " + JSON.stringify(config) + ";\n";
      res.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/javascript; charset=utf-8"
      });
      res.end(payload);
      return;
    }

    if (pathname.startsWith(config.apiProxyBase + "/")) {
      await proxyRequest(req, res, config.apiProxyUpstream, pathname, config.apiProxyBase, incomingUrl.search);
      return;
    }

    if (pathname.startsWith(config.authProxyBase + "/")) {
      await proxyRequest(req, res, config.authProxyUpstream, pathname, config.authProxyBase, incomingUrl.search);
      return;
    }

    await serveStatic(res, pathname);
  } catch (error) {
    sendJson(res, 500, {
      code: "UI_SERVER_ERROR",
      message: error && error.message ? error.message : "unknown server error"
    });
  }
});

server.listen(port);

async function proxyRequest(req, res, targetBaseUrl, pathname, prefix, search) {
  const relativePath = pathname.slice(prefix.length);
  const targetUrl = targetBaseUrl + relativePath + (search || "");
  const method = (req.method || "GET").toUpperCase();

  const headers = {
    accept: req.headers.accept || "application/json"
  };

  if (typeof req.headers.authorization === "string" && req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }

  if (typeof req.headers["content-type"] === "string" && req.headers["content-type"]) {
    headers["content-type"] = req.headers["content-type"];
  }

  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readRequestBody(req) : undefined;

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? body : undefined,
      redirect: "manual"
    });
  } catch (error) {
    sendJson(res, 502, {
      code: "UPSTREAM_UNREACHABLE",
      message: "upstream request failed",
      details: String(error && error.message ? error.message : error)
    });
    return;
  }

  const responseHeaders = {};
  const contentType = upstream.headers.get("content-type");
  const location = upstream.headers.get("location");
  if (contentType) {
    responseHeaders["content-type"] = contentType;
  }
  if (location) {
    responseHeaders.location = location;
  }

  const arrayBuffer = await upstream.arrayBuffer();
  res.writeHead(upstream.status, responseHeaders);
  res.end(Buffer.from(arrayBuffer));
}

async function serveStatic(res, pathname) {
  let requestedPath = pathname;
  if (requestedPath === "/" || requestedPath === "/callback") {
    requestedPath = "/index.html";
  }

  const normalized = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, "");
  const safeRelative = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const filePath = path.resolve(staticRoot, safeRelative);

  if (!filePath.startsWith(staticRoot)) {
    sendJson(res, 403, { code: "FORBIDDEN" });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(content);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendJson(res, 404, { code: "NOT_FOUND" });
      return;
    }
    throw error;
  }
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function normalizeBaseUrl(input, fallback) {
  const value = String(input || fallback || "").trim();
  return value.replace(/\/+$/, "");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}
