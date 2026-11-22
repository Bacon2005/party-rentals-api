const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");

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
      if (name === "next/navigation")
        return {
          redirect,
          notFound: () => {
            throw new Error("NOT_FOUND");
          },
        };
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
    ["terms", "privacy", "data_collection"].map((document) => ({
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

const submissionId = "10000000-0000-4000-8000-000000000001";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3S0AAAAASUVORK5CYII=",
  "base64",
);
function fakeAdmin(
  tables,
  storage = {},
  rpc = async () => ({ data: true, error: null }),
) {
  return {
    rpc,
    storage: { from: () => storage },
    from: (table) => {
      let update;
      let limit = Infinity;
      let order;
      let ascending = true;
      const predicates = [];
      const records = () => {
        const found = (tables[table] ?? []).filter((r) =>
          predicates.every((p) => p(r)),
        );
        if (order)
          found.sort(
            (a, b) =>
              String(a[order]).localeCompare(String(b[order])) *
              (ascending ? 1 : -1),
          );
        return found.slice(0, limit);
      };
      const run = () => {
        const found = records();
        if (update)
          found.forEach((r) => {
            Object.assign(r, update);
          });
        return { data: found.map((r) => ({ ...r })), error: null };
      };
      const query = {
        select: () => query,
        returns: () => query,
        update: (data) => {
          update = data;
          return query;
        },
        eq: (key, value) => {
          predicates.push((r) => r[key] === value);
          return query;
        },
        neq: (key, value) => {
          predicates.push((r) => r[key] !== value);
          return query;
        },
        not: (key, _op, value) => {
          predicates.push((r) => r[key] !== value);
          return query;
        },
        in: (key, values) => {
          predicates.push((r) => values.includes(r[key]));
          return query;
        },
        order: (key, options = {}) => {
          order = key;
          ascending = options.ascending !== false;
          return query;
        },
        limit: (value) => {
          limit = value;
          return query;
        },
        maybeSingle: async () => ({
          data: records()[0] ? { ...records()[0] } : null,
          error: null,
        }),
        single: async () => ({
          data: records()[0] ? { ...records()[0] } : null,
          error: null,
        }),
        // biome-ignore lint/suspicious/noThenProperty: models PostgREST's intentional thenable API.
        then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
      };
      return query;
    },
  };
}
const submission = (overrides = {}) => ({
  id: submissionId,
  user_id: userId,
  id_type: "government",
  status: "pending",
  file_path: `${userId}/${submissionId}.png`,
  created_at: "2026-01-01T00:00:00Z",
  uploaded_at: null,
  reviewed_at: null,
  reject_reason: null,
  ...overrides,
});

test("upload content and size validation rejects renamed text, oversized files, and empty files", () => {
  const { uploadIdSchema, detectIdImage, MAX_ID_BYTES } = loadTs(
    "lib/id-validation.ts",
  );
  assert.equal(detectIdImage(png).ext, "png");
  assert.equal(detectIdImage(Buffer.from("This is not an ID image")), null);
  assert.equal(
    uploadIdSchema.safeParse({
      idType: "government",
      image: new File([new Uint8Array(MAX_ID_BYTES + 1)], "test.png"),
    }).success,
    false,
  );
  assert.equal(
    uploadIdSchema.safeParse({
      idType: "student",
      image: new File([], "test.png"),
    }).success,
    false,
  );
  assert.equal(
    uploadIdSchema.safeParse({
      idType: "other",
      image: new File([png], "test.png"),
    }).success,
    false,
  );
});

test("upload derives owner and extension on server, marks readiness, and handles duplicate pending", async () => {
  const calls = [];
  let duplicate = false;
  const admin = fakeAdmin(
    {},
    {
      upload: async (path, bytes, options) => {
        calls.push({ path, bytes, options });
        return { error: null };
      },
    },
    async (name, args) => {
      calls.push({ name, args });
      return name === "reserve_id_submission" && duplicate
        ? { error: { code: "23505" } }
        : { data: true, error: null };
    },
  );
  const { uploadId } = loadTs("app/verify-identity/actions.ts", {
    "@/lib/auth": {
      getProfile: async () => ({
        id: userId,
        tier: "basic",
        identityStatus: "none",
        dateOfBirth: "1990-01-02",
      }),
    },
    "@/lib/admin": { createAdminClient: () => admin },
    "next/cache": { revalidatePath: () => {} },
  });
  const data = form({
    idType: "student",
    user_id: "attacker",
    tier: "verified_host",
  });
  data.set(
    "image",
    new File([png], "private-name.txt", { type: "text/plain" }),
  );
  await assert.rejects(uploadId({}, data), redirected("/verify-identity"));
  assert.equal(calls[0].args.p_user_id, userId);
  assert.equal(calls[0].args.p_ext, "png");
  assert.match(calls[1].path, new RegExp(`^${userId}/[a-f0-9-]+\\.png$`));
  assert.equal(calls[1].options.contentType, "image/png");
  assert.equal(calls[2].name, "finish_id_submission");
  duplicate = true;
  const count = calls.length;
  assert.match((await uploadId({}, data)).message, /already/);
  assert.equal(calls.length, count + 1);
});

test("failed Storage upload compensates and reports cleanup failure explicitly", async () => {
  let cleaned = true;
  let cleanupArgs;
  const { uploadId } = loadTs("app/verify-identity/actions.ts", {
    "@/lib/auth": {
      getProfile: async () => ({
        id: userId,
        tier: "basic",
        identityStatus: "none",
        dateOfBirth: "1990-01-02",
      }),
    },
    "@/lib/admin": {
      createAdminClient: () =>
        fakeAdmin({}, { upload: async () => ({ error: {} }) }),
    },
    "@/lib/id-storage": {
      ID_BUCKET: "id-submissions",
      cleanIncompleteUpload: async (...args) => {
        cleanupArgs = args;
        return cleaned;
      },
    },
    "next/cache": { revalidatePath: () => {} },
  });
  const data = form({ idType: "government" });
  data.set("image", new File([png], "test.png"));
  assert.match((await uploadId({}, data)).message, /discarded/);
  assert.equal(cleanupArgs[1], userId);
  assert.equal(cleanupArgs[2], true);
  cleaned = false;
  assert.match((await uploadId({}, data)).message, /Cleanup is still needed/);
});

test("reviewed image deletion retains a retry path on error, clears it after success, and is idempotent", async () => {
  const row = submission({
    status: "approved",
    uploaded_at: "2026-01-01T00:00:00Z",
  });
  let fail = true;
  let removes = 0;
  const admin = fakeAdmin(
    { id_submissions: [row] },
    {
      remove: async () => {
        removes++;
        return { error: fail ? {} : null };
      },
    },
  );
  const { deleteReviewedImage } = loadTs("lib/id-storage.ts", {
    "@/lib/admin": { createAdminClient: () => admin },
  });
  assert.equal(await deleteReviewedImage(row.id), false);
  assert.ok(row.file_path);
  fail = false;
  assert.equal(await deleteReviewedImage(row.id), true);
  assert.equal(row.file_path, null);
  assert.equal(await deleteReviewedImage(row.id), true);
  assert.equal(removes, 2);
});

test("incomplete cleanup cannot remove ready or another user's image", async () => {
  const row = submission({ uploaded_at: "2026-01-01T00:00:00Z" });
  let removes = 0;
  const admin = fakeAdmin(
    { id_submissions: [row] },
    {
      remove: async () => {
        removes++;
        return { error: null };
      },
    },
  );
  const { cleanIncompleteUpload } = loadTs("lib/id-storage.ts", {
    "@/lib/admin": { createAdminClient: () => admin },
  });
  assert.equal(await cleanIncompleteUpload(row.id, userId, true), false);
  await cleanIncompleteUpload(row.id, "another-user", true);
  assert.equal(removes, 0);
});

test("only service-verified admins can render the queue or generate a 60-second image URL", async () => {
  const profile = {
    id: userId,
    is_admin: false,
    name: "Admin",
    date_of_birth: "1990-01-02",
  };
  let signed = 0;
  const admin = fakeAdmin(
    {
      profiles: [profile],
      id_submissions: [submission({ uploaded_at: "2026-01-01T00:00:00Z" })],
    },
    {
      createSignedUrl: async (_path, ttl) => {
        assert.equal(ttl, 60);
        signed++;
        return {
          data: { signedUrl: "https://example.invalid/temporary" },
          error: null,
        };
      },
    },
  );
  const { getReviewQueue } = loadTs("lib/admin-review.ts", {
    "@/lib/admin": { createAdminClient: () => admin },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: userId,
                email_confirmed_at: "confirmed",
                user_metadata: { is_admin: true },
              },
            },
            error: null,
          }),
        },
      }),
    },
  });
  await assert.rejects(getReviewQueue(), /NOT_FOUND/);
  assert.equal(signed, 0);
  profile.is_admin = true;
  const { rows } = await getReviewQueue();
  assert.equal(signed, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].file_path, undefined);
});

test("admin actions reauthorize, reject invalid decisions, and expose deletion retry after saved decision", async () => {
  let adminAllowed = false;
  let rpcArgs;
  let cleaned = false;
  const actions = loadTs("app/admin/verifications/actions.ts", {
    "@/lib/admin-review": {
      requireAdmin: async () => {
        if (!adminAllowed) throw new Error("NOT_FOUND");
        return {
          userId,
          admin: {
            rpc: async (name, args) => {
              rpcArgs = { name, args };
              return { data: true, error: null };
            },
          },
        };
      },
    },
    "@/lib/id-storage": { deleteReviewedImage: async () => cleaned },
    "next/cache": { revalidatePath: () => {} },
  });
  const data = form({
    submissionId,
    decision: "approved",
    confirmReview: "on",
    admin_id: "attacker",
  });
  for (const action of [
    actions.reviewSubmission,
    actions.retryImageDeletion,
    actions.discardAdminUpload,
  ])
    await assert.rejects(action({}, data), /NOT_FOUND/);
  adminAllowed = true;
  assert.match(
    (
      await actions.reviewSubmission(
        {},
        form({ submissionId, decision: "rejected", reason: "unlisted" }),
      )
    ).message,
    /Invalid/,
  );
  assert.match(
    (await actions.reviewSubmission({}, data)).message,
    /deletion failed/,
  );
  assert.equal(rpcArgs.args.p_admin_id, userId);
  cleaned = true;
  assert.match(
    (await actions.retryImageDeletion({}, form({ submissionId }))).message,
    /Image deleted/,
  );
});

test("proxy redirects a confirmed non-admin before streaming even with forged admin metadata", async (t) => {
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
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable";
  let isAdmin = false;
  const { updateSession } = loadTs("lib/supabase/proxy.ts", {
    "@supabase/ssr": {
      createServerClient: () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: userId,
                email_confirmed_at: "confirmed",
                user_metadata: { is_admin: true },
              },
            },
          }),
        },
      }),
    },
    "@/lib/admin": {
      createAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { is_admin: isAdmin },
                error: null,
              }),
            }),
          }),
        }),
      }),
    },
  });
  const denied = await updateSession(
    new NextRequest("http://localhost/admin/verifications"),
  );
  assert.equal(denied.status, 307);
  assert.equal(denied.headers.get("location"), "http://localhost/dashboard");
  isAdmin = true;
  assert.equal(
    (
      await updateSession(
        new NextRequest("http://localhost/admin/verifications"),
      )
    ).status,
    200,
  );
});

const accountProfile = () => ({
  id: userId,
  name: "Party Guest",
  email: "guest@example.invalid",
  phone: null,
  hostName: null,
  avatarUrl: null,
  dateOfBirth: "1990-01-02",
  role: "client",
  tier: "basic",
  identityStatus: "none",
  verifiedAt: null,
  isAdmin: false,
  signupConsentVersion: "2026-01",
});

test("mobile profile and ID endpoints reject anonymous requests before mutations", async () => {
  const mocks = { "@/lib/auth": { getProfile: async () => null } };
  const profile = loadTs("app/api/profile/route.ts", {
    ...mocks,
    "@/lib/profile-settings": {
      saveProfile: () => {
        throw new Error("unexpected write");
      },
    },
  });
  const verification = loadTs("app/api/verification/route.ts", mocks);
  for (const handler of [
    profile.GET,
    profile.PATCH,
    verification.GET,
    verification.POST,
    verification.DELETE,
  ]) {
    const response = await handler(new Request("http://localhost/api/profile"));
    assert.equal(response.status, 401);
  }
});

test("mobile verification status exposes the authenticated profile without private storage paths", async () => {
  const profile = accountProfile();
  profile.identityStatus = "pending";
  const { GET } = loadTs("app/api/verification/route.ts", {
    "@/lib/auth": {
      getProfile: async (request) => {
        assert.equal(
          request.headers.get("Authorization"),
          "Bearer mobile-token",
        );
        return profile;
      },
    },
    "@/lib/id-storage": {
      getLatestSubmission: async (id) => {
        assert.equal(id, userId);
        return submission();
      },
    },
  });
  const response = await GET(
    new Request("http://localhost/api/verification?userId=attacker", {
      headers: { Authorization: "Bearer mobile-token" },
    }),
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.profile.tier, "basic");
  assert.equal(body.profile.identity_status, "pending");
  assert.equal(body.profile.isAdmin, undefined);
  assert.equal(body.submission.file_path, undefined);
  assert.equal(body.submission.user_id, undefined);
});

test("mobile profile edits only write editable fields and normalize PH phone numbers", async () => {
  let written;
  const { saveProfile } = loadTs("lib/profile-settings.ts", {
    "drizzle-orm": { eq: (...args) => args },
    "@/db/schema": { profiles: { id: "id" } },
    "@/db": {
      db: {
        update: () => ({
          set: (fields) => ({
            where: async (condition) => {
              assert.deepEqual(condition, ["id", userId]);
              written = fields;
            },
          }),
        }),
      },
    },
  });
  const result = await saveProfile(
    accountProfile(),
    form({
      name: " New Name ",
      phone: "0917 123 4567",
      hostName: " New Host ",
      tier: "verified_host",
      identityStatus: "verified",
      id: "attacker",
      dateOfBirth: "2000-01-01",
    }),
  );
  assert.equal(result.ok, true);
  assert.deepEqual(written, {
    name: "New Name",
    phone: "+639171234567",
    hostName: "New Host",
    avatarUrl: null,
  });
  const invalid = await saveProfile(
    accountProfile(),
    form({ name: "", phone: "123", hostName: "X".repeat(81) }),
  );
  assert.equal(invalid.ok, false);
  assert.ok(invalid.fieldErrors.name);
  assert.ok(invalid.fieldErrors.phone);
  assert.ok(invalid.fieldErrors.hostName);
  const imageForm = form({ name: "Name" });
  imageForm.set(
    "avatar",
    new File(["renamed text"], "photo.png", { type: "image/png" }),
  );
  assert.ok(
    (await saveProfile(accountProfile(), imageForm)).fieldErrors.avatar,
  );
});

test("mobile ID upload delegates to shared validation with the authenticated owner", async () => {
  let owner;
  const { POST } = loadTs("app/api/verification/route.ts", {
    "@/lib/auth": { getProfile: async () => accountProfile() },
    "@/lib/id-upload": {
      submitId: async (profile, data) => {
        owner = profile.id;
        assert.equal(data.get("idType"), "student");
        assert.equal(data.get("image").size, png.length);
        return { ok: true, message: "Under review" };
      },
    },
  });
  const data = form({ idType: "student", userId: "attacker" });
  data.set("image", new File([png], "id.png", { type: "image/png" }));
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/verification", {
          method: "POST",
          body: data,
        }),
      )
    ).status,
    201,
  );
  assert.equal(owner, userId);
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/verification", {
          method: "POST",
          headers: { "content-length": String(7 * 1024 * 1024) },
        }),
      )
    ).status,
    413,
  );
});

test("mobile interrupted-upload cleanup is scoped to the authenticated owner", async () => {
  const { DELETE } = loadTs("app/api/verification/route.ts", {
    "@/lib/auth": { getProfile: async () => accountProfile() },
    "@/lib/id-storage": {
      cleanIncompleteUpload: async (id, owner) => {
        assert.equal(id, submissionId);
        assert.equal(owner, userId);
        return false;
      },
    },
  });
  const response = await DELETE(
    new Request("http://localhost/api/verification", {
      method: "DELETE",
      body: JSON.stringify({ submissionId, userId: "attacker" }),
    }),
  );
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /10 minutes/);
});

test("mobile host promotion requires a verified guest and the current host agreement", async () => {
  let calls = 0;
  const { POST } = loadTs("app/api/profile/host/route.ts", {
    "@/lib/auth": {
      requireApiTier: async (_request, minimum) => {
        assert.equal(minimum, "verified_guest");
        return { user: accountProfile() };
      },
    },
    "@/lib/consents": { HOST_AGREEMENT_VERSION: "2026-01" },
    "@/lib/admin": {
      createAdminClient: () => ({
        rpc: async (name, args) => {
          calls++;
          assert.equal(name, "accept_host_agreement");
          assert.deepEqual(args, { p_user_id: userId, p_version: "2026-01" });
          return { error: null };
        },
      }),
    },
  });
  const request = (body) =>
    new Request("http://localhost/api/profile/host", {
      method: "POST",
      body: JSON.stringify(body),
    });
  assert.equal((await POST(request({ agree: false }))).status, 400);
  assert.equal(calls, 0);
  assert.equal(
    (
      await POST(
        request({ agree: true, userId: "attacker", version: "forged" }),
      )
    ).status,
    200,
  );
  assert.equal(calls, 1);
});

test("a lost finalization response preserves an ID that was already queued for review", async () => {
  let reserved;
  const admin = fakeAdmin(
    {},
    {
      upload: async () => ({ error: null }),
      remove: async () => {
        throw new Error("must not delete ready image");
      },
    },
    async (name, args) => {
      if (name === "reserve_id_submission") {
        reserved = args.p_id;
        return { error: null };
      }
      return { data: null, error: { message: "lost response" } };
    },
  );
  const { submitId } = loadTs("lib/id-upload.ts", {
    "@/lib/admin": { createAdminClient: () => admin },
    "@/lib/id-storage": {
      ID_BUCKET: "id-submissions",
      getLatestSubmission: async () => ({
        id: reserved,
        uploaded_at: "2026-01-01T00:00:00Z",
      }),
    },
  });
  const data = form({ idType: "government" });
  data.set("image", new File([png], "id.png"));
  assert.equal((await submitId(accountProfile(), data)).ok, true);
});
