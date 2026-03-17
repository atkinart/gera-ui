const crypto = require("crypto");

const DEFAULT_SCOPE = "openid profile";

function createOidcPkceClient(config, stateStore) {
  const resolved = resolveConfig(config);
  const store = stateStore || createInMemoryStateStore();

  return {
    beginLogin() {
      const state = randomBase64Url(24);
      const nonce = randomBase64Url(24);
      const codeVerifier = randomBase64Url(64);
      const codeChallenge = createCodeChallenge(codeVerifier);

      store.save(state, { codeVerifier, nonce });

      const params = new URLSearchParams({
        response_type: "code",
        client_id: resolved.clientId,
        redirect_uri: resolved.redirectUri,
        scope: resolved.scope,
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      });

      return {
        state,
        nonce,
        codeVerifier,
        authorizationUrl: resolved.authorizationEndpoint + "?" + params.toString()
      };
    },

    consumeCallback(callbackUrl) {
      ensureString(callbackUrl, "callbackUrl");

      const parsed = new URL(callbackUrl);
      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");
      const error = parsed.searchParams.get("error");
      const errorDescription = parsed.searchParams.get("error_description");

      if (error) {
        const suffix = errorDescription ? ": " + errorDescription : "";
        throw new Error("OIDC callback error " + error + suffix);
      }

      if (!code) {
        throw new Error("OIDC callback must include code");
      }

      if (!state) {
        throw new Error("OIDC callback must include state");
      }

      const entry = store.read(state);
      if (!entry) {
        throw new Error("OIDC state validation failed");
      }
      store.remove(state);

      return {
        code,
        state,
        codeVerifier: entry.codeVerifier,
        nonce: entry.nonce
      };
    },

    createTokenRequest(input) {
      ensureObject(input, "tokenInput");
      ensureString(input.code, "tokenInput.code");
      ensureString(input.codeVerifier, "tokenInput.codeVerifier");

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        client_id: resolved.clientId,
        redirect_uri: resolved.redirectUri,
        code_verifier: input.codeVerifier
      });

      return {
        url: resolved.tokenEndpoint,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      };
    },

    beginLogout(input) {
      ensureObject(input, "logoutInput");
      ensureString(input.idTokenHint, "logoutInput.idTokenHint");

      const state = randomBase64Url(24);
      const params = new URLSearchParams({
        id_token_hint: input.idTokenHint,
        post_logout_redirect_uri: resolved.postLogoutRedirectUri,
        state
      });

      return {
        state,
        logoutUrl: resolved.logoutEndpoint + "?" + params.toString()
      };
    }
  };
}

function createInMemoryStateStore() {
  const map = new Map();
  return {
    save(state, value) {
      map.set(state, value);
    },
    read(state) {
      return map.get(state);
    },
    remove(state) {
      map.delete(state);
    }
  };
}

function createCodeChallenge(codeVerifier) {
  ensureString(codeVerifier, "codeVerifier");
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return toBase64Url(hash);
}

function resolveConfig(input) {
  ensureObject(input, "config");
  ensureString(input.clientId, "config.clientId");
  ensureString(input.redirectUri, "config.redirectUri");

  const issuer = input.issuer ? trimRightSlash(input.issuer) : "";

  const authorizationEndpoint = input.authorizationEndpoint || (issuer ? issuer + "/oauth2/authorize" : "");
  const tokenEndpoint = input.tokenEndpoint || (issuer ? issuer + "/oauth2/token" : "");
  const logoutEndpoint = input.logoutEndpoint || (issuer ? issuer + "/connect/logout" : "");

  ensureString(authorizationEndpoint, "config.authorizationEndpoint");
  ensureString(tokenEndpoint, "config.tokenEndpoint");
  ensureString(logoutEndpoint, "config.logoutEndpoint");

  const scope = input.scope && input.scope.trim() ? input.scope.trim() : DEFAULT_SCOPE;
  const postLogoutRedirectUri = input.postLogoutRedirectUri || input.redirectUri;

  return {
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    postLogoutRedirectUri,
    authorizationEndpoint,
    tokenEndpoint,
    logoutEndpoint,
    scope
  };
}

function trimRightSlash(value) {
  return value.replace(/\/+$/, "");
}

function randomBase64Url(bytesLength) {
  return toBase64Url(crypto.randomBytes(bytesLength));
}

function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function ensureObject(value, fieldName) {
  if (!value || typeof value !== "object") {
    throw new Error(fieldName + " is required");
  }
}

function ensureString(value, fieldName) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new Error(fieldName + " is required");
  }
}

module.exports = {
  createOidcPkceClient,
  createInMemoryStateStore,
  createCodeChallenge
};
