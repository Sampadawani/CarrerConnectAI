import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { requireTurnstile } from "../middleware/turnstile.js";
import { verifyTurnstileToken } from "./turnstile.js";

const originalFetch = globalThis.fetch;
const originalSecret = process.env.TURNSTILE_SECRET_KEY;

beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalSecret;
});

function siteverifyResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function mockResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("accepts valid login and registration tokens only for the matching action", async () => {
  for (const action of ["login", "register"]) {
    globalThis.fetch = async (_url, options) => {
      const submitted = new URLSearchParams(options.body);
      assert.equal(submitted.get("secret"), "test-secret");
      assert.equal(submitted.get("response"), "valid-token");
      return siteverifyResponse({ success: true, action });
    };

    assert.deepEqual(await verifyTurnstileToken("valid-token", action), {
      verified: true,
    });
  }
});

test("rejects expired, invalid and wrong-action tokens", async () => {
  for (const result of [
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: true, action: "login" },
  ]) {
    globalThis.fetch = async () => siteverifyResponse(result);
    assert.deepEqual(await verifyTurnstileToken("invalid-token", "register"), {
      verified: false,
      reason: "invalid-token",
    });
  }
});

test("rejects missing token and missing server secret", async () => {
  globalThis.fetch = async () => {
    throw new Error("Siteverify must not be called");
  };
  assert.deepEqual(await verifyTurnstileToken("", "login"), {
    verified: false,
    reason: "invalid-token",
  });

  delete process.env.TURNSTILE_SECRET_KEY;
  assert.deepEqual(await verifyTurnstileToken("valid-token", "login"), {
    verified: false,
    reason: "not-configured",
  });
});

test("reports Siteverify outages and malformed responses as unavailable", async () => {
  globalThis.fetch = async () => {
    throw new Error("Network unavailable");
  };
  assert.deepEqual(await verifyTurnstileToken("valid-token", "login"), {
    verified: false,
    reason: "unavailable",
  });

  globalThis.fetch = async () => siteverifyResponse(null);
  assert.deepEqual(await verifyTurnstileToken("valid-token", "login"), {
    verified: false,
    reason: "unavailable",
  });

  globalThis.fetch = async () => siteverifyResponse({}, 502);
  assert.deepEqual(await verifyTurnstileToken("valid-token", "login"), {
    verified: false,
    reason: "unavailable",
  });
});

test("middleware rejects missing tokens and forwards valid tokens", async () => {
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return siteverifyResponse({ success: true, action: "register" });
  };
  const handler = requireTurnstile("register");

  const missingResponse = mockResponse();
  await handler({ body: {} }, missingResponse, () => {
    assert.fail("Missing CAPTCHA token must not continue.");
  });
  assert.equal(missingResponse.statusCode, 400);
  assert.equal(fetchCalls, 0);

  const validResponse = mockResponse();
  let nextCalled = false;
  await handler({ body: { captchaToken: "valid-token" } }, validResponse, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(fetchCalls, 1);
});

test("middleware distinguishes invalid CAPTCHA from missing configuration", async () => {
  globalThis.fetch = async () => siteverifyResponse({ success: false });
  const invalidResponse = mockResponse();
  await requireTurnstile("login")(
    { body: { captchaToken: "invalid-token" } },
    invalidResponse,
    () => assert.fail("Invalid CAPTCHA must not continue.")
  );
  assert.equal(invalidResponse.statusCode, 400);

  delete process.env.TURNSTILE_SECRET_KEY;
  const unconfiguredResponse = mockResponse();
  await requireTurnstile("login")(
    { body: { captchaToken: "valid-token" } },
    unconfiguredResponse,
    () => assert.fail("Unconfigured CAPTCHA must not continue.")
  );
  assert.equal(unconfiguredResponse.statusCode, 503);
});
