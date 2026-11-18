const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const Stripe = require("stripe");

const root = path.resolve(__dirname, "..");
const userId = "c629f490-dca9-4fc9-a243-3c87be70479c";
class Redirect extends Error {
  constructor(destination) {
    super(destination);
    this.destination = destination;
  }
}
const redirect = (destination) => {
  throw new Redirect(destination);
};
const redirected = (destination) => (error) =>
  error instanceof Redirect && error.destination === destination;
function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

// Compile the actual server modules with explicit boundary mocks; no Next server,
// test runner dependency, secrets, or network calls are needed.
function loadTs(relative, mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const localRequire = createRequire(file);
    const resolve = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "server-only") return {};
      if (name === "next/navigation") return { redirect };
      if (name.startsWith("@/"))
        return load(path.join(root, `${name.slice(2)}.ts`));
      return localRequire(name);
    };
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    new Function("exports", "require", "module", compiled.outputText)(
      module.exports,
      resolve,
      module,
    );
    return module.exports;
  }
  return load(path.join(root, relative));
}

function form(values) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    data.set(key, value);
  });
  return data;
}

test("calendar age rejects minors/invalid dates and handles exact birthdays and leap days", () => {
  const { isAdult } = loadTs("lib/age.ts");
  const now = new Date("2026-11-18T23:59:59Z");
  assert.equal(isAdult("2008-11-18", now), true);
  assert.equal(isAdult("2008-11-19", now), false);
  assert.equal(isAdult("2027-01-01", now), false);
  assert.equal(isAdult("2008-02-30", now), false);
  assert.equal(isAdult("not-a-date", now), false);
  assert.equal(isAdult("2008-02-29", new Date("2026-02-28T12:00:00Z")), false);
  assert.equal(isAdult("2008-02-29", new Date("2026-03-01T00:00:00Z")), true);
});

const signup = {
  name: "Test Person",
  email: "test+otp@example.com",
  dateOfBirth: "1990-01-02",
  acceptTerms: "on",
  password: "abcdefgh",
  confirmPassword: "abcdefgh",
};
test("signup schema enforces 18+, consent, matching passwords and eight characters", () => {
  const { SignUpSchema } = loadTs("lib/definitions.ts");
  assert.equal(SignUpSchema.safeParse(signup).success, true);
  const minor = `${new Date().getUTCFullYear() - 10}-01-01`;
  for (const changes of [
    { dateOfBirth: minor },
    { acceptTerms: null },
    { password: "1234567", confirmPassword: "1234567" },
    { confirmPassword: "different" },
  ]) {
    assert.equal(
      SignUpSchema.safeParse({ ...signup, ...changes }).success,
      false,
    );
  }
});

test("signup preserves error fields, sends DOB/consent metadata and redirects to email OTP", async () => {
  let input;
  const { signUp } = loadTs("app/(auth)/sign-up/actions.ts", {
    "@/lib/consents": { LEGAL_VERSION: "2026-01" },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          signUp: async (value) => {
            input = value;
            return { data: { session: null }, error: null };
          },
        },
      }),
    },
  });
  const invalid = await signUp({}, form({ ...signup, acceptTerms: "" }));
  assert.equal(invalid.name, signup.name);
  assert.equal(invalid.email, signup.email);
  assert.equal(invalid.dateOfBirth, signup.dateOfBirth);
  assert.equal(input, undefined);
  await assert.rejects(
    signUp({}, form(signup)),
    redirected(`/verify-email?email=${encodeURIComponent(signup.email)}`),
  );
  assert.deepEqual(input.options.data, {
    name: signup.name,
    date_of_birth: signup.dateOfBirth,
    accept_terms: true,
    consent_version: "2026-01",
  });
});

test("OTP rejects wrong/expired codes and logs consent only after a confirmed session", async () => {
  const calls = [];
  let valid = false;
  const actions = loadTs("app/verify-email/actions.ts", {
    "@/lib/consents": { recordSignupConsents: async (id) => calls.push(id) },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          verifyOtp: async (input) => {
            assert.equal(input.type, "signup");
            return valid
              ? {
                  data: {
                    user: { id: userId, email_confirmed_at: "2026-01-01" },
                    session: {},
                  },
                  error: null,
                }
              : { data: {}, error: { message: "expired" } };
          },
          resend: async (input) => {
            calls.push(input);
            return { error: null };
          },
        },
      }),
    },
  });
  const otp = form({ email: signup.email, token: "123456" });
  assert.deepEqual(await actions.verifyEmail({}, otp), {
    message: "Invalid or expired code",
  });
  assert.equal(calls.length, 0);
  valid = true;
  await assert.rejects(actions.verifyEmail({}, otp), redirected("/dashboard"));
  assert.deepEqual(calls, [userId]);
  assert.match((await actions.resendCode("bad-email")).message, /valid email/);
  await actions.resendCode(signup.email);
  assert.deepEqual(calls[1], { type: "signup", email: signup.email });
});

test("signup consent retries preserve original timestamp and trusted version", async () => {
  let options;
  let rows;
  const { recordSignupConsents } = loadTs("lib/consents.ts", {
    "@/lib/admin": {
      createAdminClient: () => ({
        from: (table) =>
          table === "profiles"
            ? {
                select: () => ({
                  eq: () => ({
                    single: async () => ({
                      data: { signup_consent_version: "2026-01" },
                      error: null,
                    }),
                  }),
                }),
              }
            : {
                upsert: async (data, config) => {
                  rows = data;
                  options = config;
                  return { error: null };
                },
              },
      }),
    },
  });
  await recordSignupConsents(userId);
  assert.deepEqual(
    rows,
    ["terms", "privacy"].map((document) => ({
      user_id: userId,
      document,
      version: "2026-01",
    })),
  );
  assert.equal(options.ignoreDuplicates, true);
});

test("login resends an unconfirmed signup and never permits signup through the login action", async () => {
  let resent;
  const { authenticate } = loadTs("app/(auth)/login/actions.ts", {
    "@/lib/consents": { recordSignupConsents: async () => {} },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          signInWithPassword: async () => ({
            data: {},
            error: {
              code: "email_not_confirmed",
              message: "Email not confirmed",
            },
          }),
          resend: async (input) => {
            resent = input;
          },
        },
      }),
    },
  });
  await assert.rejects(
    authenticate(
      {},
      form({
        email: signup.email,
        password: signup.password,
        intent: "signup",
      }),
    ),
    redirected(`/verify-email?email=${encodeURIComponent(signup.email)}`),
  );
  assert.deepEqual(resent, { type: "signup", email: signup.email });
});

function authMocks(
  profile,
  user = { id: userId, email_confirmed_at: "2026-01-01" },
) {
  return {
    "@/db": {
      db: {
        select: () => ({
          from: () => ({ where: async () => (profile ? [profile] : []) }),
        }),
      },
    },
    "@/db/schema": { profiles: { id: "id" } },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }) },
      }),
    },
  };
}

test("all web party actions redirect basic users before processing form data", async () => {
  const actions = loadTs(
    "app/(app)/party-actions.ts",
    authMocks({ id: userId, tier: "basic", dateOfBirth: "1990-01-02" }),
  );
  for (const action of [
    actions.rsvp,
    actions.messageHost,
    actions.createParty,
  ]) {
    await assert.rejects(
      action(new FormData()),
      redirected("/verify-identity"),
    );
  }
});

test("tier gates validate user, handle guest/host ranks, and return JSON for mobile APIs", async () => {
  const profile = {
    id: userId,
    tier: "verified_guest",
    dateOfBirth: "1990-01-02",
  };
  const auth = loadTs("lib/auth.ts", authMocks(profile));
  assert.equal((await auth.requireTier("verified_guest")).id, userId);
  await assert.rejects(
    auth.requireTier("verified_host"),
    redirected("/verify-identity"),
  );
  const response = (
    await auth.requireApiTier(
      new Request("http://localhost/api/events"),
      "verified_host",
    )
  ).response;
  assert.equal(response.status, 403);
  assert.equal((await response.json()).redirectTo, "/verify-identity");
  profile.tier = "verified_host";
  assert.equal((await auth.requireTier("verified_guest")).id, userId);
  assert.equal((await auth.requireTier("verified_host")).id, userId);
  profile.dateOfBirth = null;
  await assert.rejects(
    auth.requireTier("verified_guest"),
    redirected("/verify-identity"),
  );
  const anonymous = loadTs("lib/auth.ts", authMocks(null, null));
  await assert.rejects(
    anonymous.requireTier("verified_guest"),
    redirected("/login"),
  );
});

test("proxy redirects anonymous users and carries refreshed session cookies onto redirects", async (t) => {
  const { NextRequest } = require("next/server");
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ];
  const previous = names.map((name) => process.env[name]);
  t.after(() =>
    names.forEach((name, i) => {
      restoreEnv(name, previous[i]);
    }),
  );
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  let user = null;
  const { updateSession } = loadTs("lib/supabase/proxy.ts", {
    "@supabase/ssr": {
      createServerClient: (_url, _key, options) => ({
        auth: {
          getUser: async () => {
            options.cookies.setAll([
              {
                name: "test-session",
                value: "refreshed",
                options: { httpOnly: true, path: "/" },
              },
            ]);
            return { data: { user } };
          },
        },
      }),
    },
  });
  const denied = await updateSession(
    new NextRequest("http://localhost/dashboard?private=example"),
  );
  assert.equal(denied.status, 307);
  assert.equal(denied.headers.get("location"), "http://localhost/login");
  assert.equal(denied.cookies.get("test-session").value, "refreshed");
  user = { id: userId, email_confirmed_at: "2026-01-01" };
  assert.equal(
    (await updateSession(new NextRequest("http://localhost/dashboard"))).status,
    200,
  );
});

// In-memory PostgREST boundary supports the same conditional updates as the
// production handler; replay tests therefore exercise the actual handler logic.
function profileAdmin(row) {
  return {
    from: () => {
      let changes;
      const filters = [];
      const matches = () => filters.every((predicate) => predicate(row));
      const result = () => {
        const matched = matches();
        if (changes && matched) Object.assign(row, changes);
        return { data: matched ? [{ ...row }] : [], error: null };
      };
      const builder = {
        select: () => builder,
        update: (value) => {
          changes = value;
          return builder;
        },
        eq: (key, value) => {
          filters.push((record) => record[key] === value);
          return builder;
        },
        neq: (key, value) => {
          filters.push((record) => record[key] !== value);
          return builder;
        },
        is: (key, value) => {
          filters.push((record) => record[key] === value);
          return builder;
        },
        maybeSingle: async () => ({
          data: matches() ? { ...row } : null,
          error: null,
        }),
        // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders intentionally implement thenables.
        then: (resolve, reject) =>
          Promise.resolve(result()).then(resolve, reject),
      };
      return builder;
    },
  };
}

const signingSecret = "whsec_unit_test_only";
function webhookFixture(overrides = {}) {
  const row = {
    id: userId,
    date_of_birth: "1990-01-02",
    tier: "basic",
    identity_status: "pending",
    identity_ref: "vs_test",
    verified_at: null,
    ...overrides,
  };
  const session = {
    id: "vs_test",
    metadata: { user_id: userId },
    livemode: false,
    status: "verified",
    type: "document",
    options: { document: { require_matching_selfie: true } },
    verified_outputs: { dob: { year: 1990, month: 1, day: 2 } },
  };
  const stripe = new Stripe("sk_test_unit_test_only");
  const sdk = {
    webhooks: stripe.webhooks,
    identity: { verificationSessions: { retrieve: async () => session } },
  };
  const route = loadTs("app/api/webhooks/identity/route.ts", {
    "@/lib/admin": { createAdminClient: () => profileAdmin(row) },
    "@/lib/stripe": {
      getStripe: () => sdk,
      getIdentityResultsStripe: () => sdk,
    },
  });
  async function send(
    type = "verified",
    changes = {},
    invalidSignature = false,
  ) {
    const payload = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: `identity.verification_session.${type}`,
      livemode: false,
      data: { object: { id: "vs_test", metadata: { user_id: userId } } },
      ...changes,
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: signingSecret,
    });
    return route.POST(
      new Request("http://localhost/api/webhooks/identity", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": invalidSignature ? "invalid" : header },
      }),
    );
  }
  return { row, session, send };
}

test("signed webhook alone promotes an adult with matching DOB; replay preserves timestamp and host tier", async (t) => {
  const old = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  t.after(() => restoreEnv("STRIPE_WEBHOOK_SECRET", old));
  const f = webhookFixture();
  assert.equal((await f.send("verified", {}, true)).status, 400);
  assert.equal(f.row.tier, "basic");
  assert.equal((await f.send()).status, 200);
  assert.equal(f.row.tier, "verified_guest");
  assert.equal(f.row.identity_status, "verified");
  const timestamp = f.row.verified_at;
  await f.send();
  assert.equal(f.row.verified_at, timestamp);
  f.row.tier = "verified_host";
  f.session.status = "requires_input";
  await f.send("requires_input");
  assert.equal(f.row.tier, "verified_host");
  assert.equal(f.row.identity_status, "verified");
  assert.deepEqual(
    Object.keys(f.row).sort(),
    [
      "id",
      "date_of_birth",
      "tier",
      "identity_status",
      "identity_ref",
      "verified_at",
    ].sort(),
  );
});

test("DOB mismatch, minor, missing DOB, or missing selfie fail without a tier change", async (t) => {
  const old = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  t.after(() => restoreEnv("STRIPE_WEBHOOK_SECRET", old));
  for (const scenario of ["mismatch", "minor", "missing", "selfie"]) {
    const f = webhookFixture();
    if (scenario === "mismatch") f.session.verified_outputs.dob.day = 3;
    if (scenario === "minor") {
      const year = new Date().getUTCFullYear() - 10;
      f.row.date_of_birth = `${year}-01-02`;
      f.session.verified_outputs.dob.year = year;
    }
    if (scenario === "missing") f.session.verified_outputs.dob = null;
    if (scenario === "selfie")
      f.session.options.document.require_matching_selfie = false;
    assert.equal((await f.send()).status, 200);
    assert.equal(f.row.identity_status, "failed");
    assert.equal(f.row.tier, "basic");
    assert.equal(f.row.verified_at, null);
  }
});

test("failed/canceled events, stale sessions, live mode, and out-of-order deliveries", async (t) => {
  const old = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  t.after(() => restoreEnv("STRIPE_WEBHOOK_SECRET", old));
  for (const status of ["requires_input", "canceled"]) {
    const f = webhookFixture();
    f.session.status = status;
    await f.send(status);
    assert.equal(f.row.identity_status, "failed");
    await f.send(status);
    assert.equal(f.row.tier, "basic");
  }
  const stale = webhookFixture({ identity_ref: "vs_new_attempt" });
  await stale.send();
  assert.equal(stale.row.identity_status, "pending");
  const reordered = webhookFixture();
  await reordered.send("requires_input"); // Stripe now reports verified.
  assert.equal(reordered.row.tier, "verified_guest");
  const live = webhookFixture();
  assert.equal((await live.send("verified", { livemode: true })).status, 400);
  assert.equal(live.row.tier, "basic");
});

test("identity start requires consent, requests selfie/live capture, and only writes pending outcome", async () => {
  const row = {
    id: userId,
    tier: "basic",
    identity_status: "none",
    identity_ref: null,
  };
  const profile = {
    id: userId,
    tier: "basic",
    dateOfBirth: "1990-01-02",
    identityStatus: "none",
    identityRef: null,
  };
  let created;
  const { startIdentityVerification } = loadTs(
    "app/verify-identity/actions.ts",
    {
      "@/lib/auth": { getProfile: async () => profile },
      "@/lib/admin": { createAdminClient: () => profileAdmin(row) },
      "@/lib/stripe": {
        identityReturnUrl: () => "http://localhost:3000/verify-identity",
        getStripe: () => ({
          identity: {
            verificationSessions: {
              create: async (input, options) => {
                created = { input, options };
                return {
                  id: "vs_test",
                  livemode: false,
                  url: "https://verify.stripe.com/test",
                };
              },
            },
          },
        }),
      },
    },
  );
  assert.match(
    (await startIdentityVerification({}, new FormData())).message,
    /notice/,
  );
  assert.equal(created, undefined);
  await assert.rejects(
    startIdentityVerification(
      {},
      form({ acceptBiometrics: "on", tier: "verified_host" }),
    ),
    redirected("https://verify.stripe.com/test"),
  );
  assert.equal(created.input.options.document.require_matching_selfie, true);
  assert.equal(created.input.options.document.require_live_capture, true);
  assert.deepEqual(created.input.metadata, { user_id: userId });
  assert.equal(row.identity_status, "pending");
  assert.equal(row.tier, "basic");
});

test("host action requires acceptance and uses authenticated user and server agreement version", async () => {
  let rpc;
  const { becomeHost } = loadTs("app/become-host/actions.ts", {
    "@/lib/auth": {
      requireTier: async (tier) => {
        assert.equal(tier, "verified_guest");
        return { id: userId };
      },
    },
    "@/lib/admin": {
      createAdminClient: () => ({
        rpc: async (name, args) => {
          rpc = { name, args };
          return { error: null };
        },
      }),
    },
    "@/lib/consents": { HOST_AGREEMENT_VERSION: "2026-01" },
    "next/cache": { revalidatePath: () => {} },
  });
  assert.match((await becomeHost({}, new FormData())).message, /Accept/);
  assert.equal(rpc, undefined);
  await assert.rejects(
    becomeHost({}, form({ agree: "on", user_id: "attacker", version: "fake" })),
    redirected("/dashboard"),
  );
  assert.deepEqual(rpc, {
    name: "accept_host_agreement",
    args: { p_user_id: userId, p_version: "2026-01" },
  });
});

test("Stripe configuration rejects live keys and requires a restricted key for DOB", (t) => {
  const names = ["STRIPE_SECRET_KEY", "STRIPE_IDENTITY_RESTRICTED_KEY"];
  const previous = names.map((name) => process.env[name]);
  t.after(() =>
    names.forEach((name, i) => {
      restoreEnv(name, previous[i]);
    }),
  );
  const { getStripe, getIdentityResultsStripe } = loadTs("lib/stripe.ts");
  process.env.STRIPE_SECRET_KEY = "sk_live_disallowed";
  assert.throws(getStripe, /test key/);
  process.env.STRIPE_SECRET_KEY = "sk_test_unit_test_only";
  delete process.env.STRIPE_IDENTITY_RESTRICTED_KEY;
  assert.throws(getIdentityResultsStripe, /restricted/);
  process.env.STRIPE_IDENTITY_RESTRICTED_KEY = "rk_test_unit_test_only";
  assert.ok(getIdentityResultsStripe());
});
