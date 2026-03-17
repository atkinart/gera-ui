const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createOidcPkceClient,
  createCodeChallenge
} = require("../src/auth/oidc-pkce");

function createConfig() {
  return {
    issuer: "http://localhost:9000",
    clientId: "gera-ui",
    redirectUri: "http://localhost:5173/auth/callback",
    postLogoutRedirectUri: "http://localhost:5173/"
  };
}

test("beginLogin creates authorization url with PKCE params", () => {
  const client = createOidcPkceClient(createConfig());

  const login = client.beginLogin();
  const url = new URL(login.authorizationUrl);

  assert.equal(url.origin + url.pathname, "http://localhost:9000/oauth2/authorize");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "gera-ui");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:5173/auth/callback");
  assert.equal(url.searchParams.get("scope"), "openid profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), createCodeChallenge(login.codeVerifier));
  assert.ok(login.state.length > 10);
  assert.ok(login.nonce.length > 10);
});

test("consumeCallback validates state and returns codeVerifier", () => {
  const client = createOidcPkceClient(createConfig());
  const login = client.beginLogin();

  const callbackUrl =
    "http://localhost:5173/auth/callback?code=auth-code-1&state=" + login.state;
  const callback = client.consumeCallback(callbackUrl);

  assert.equal(callback.code, "auth-code-1");
  assert.equal(callback.state, login.state);
  assert.equal(callback.codeVerifier, login.codeVerifier);
});

test("consumeCallback rejects unknown state", () => {
  const client = createOidcPkceClient(createConfig());
  client.beginLogin();

  assert.throws(
    () => client.consumeCallback("http://localhost:5173/auth/callback?code=auth-code-1&state=unknown"),
    /OIDC state validation failed/
  );
});

test("createTokenRequest creates form-urlencoded payload", () => {
  const client = createOidcPkceClient(createConfig());
  const request = client.createTokenRequest({
    code: "auth-code-2",
    codeVerifier: "verifier-2"
  });

  assert.equal(request.url, "http://localhost:9000/oauth2/token");
  assert.equal(request.method, "POST");
  assert.equal(request.headers["content-type"], "application/x-www-form-urlencoded");

  const body = new URLSearchParams(request.body);
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "auth-code-2");
  assert.equal(body.get("client_id"), "gera-ui");
  assert.equal(body.get("redirect_uri"), "http://localhost:5173/auth/callback");
  assert.equal(body.get("code_verifier"), "verifier-2");
});

test("beginLogout creates RP-initiated logout url", () => {
  const client = createOidcPkceClient(createConfig());
  const logout = client.beginLogout({ idTokenHint: "id-token-value" });
  const url = new URL(logout.logoutUrl);

  assert.equal(url.origin + url.pathname, "http://localhost:9000/connect/logout");
  assert.equal(url.searchParams.get("id_token_hint"), "id-token-value");
  assert.equal(url.searchParams.get("post_logout_redirect_uri"), "http://localhost:5173/");
  assert.ok(url.searchParams.get("state"));
});
