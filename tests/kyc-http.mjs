import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.KYC_TEST_PORT ?? 3011);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid test port.");
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/next/dist/bin/next"),
    "start",
    "-p",
    String(port),
  ],
  {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore"],
  },
);
server.on("error", () => {});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let ready = false;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      const response = await fetch(`${base}/terms`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the local server; no external requests are made. */
    }
    await delay(250);
  }
  assert.equal(
    ready,
    true,
    "Production server must start (run npm run build first; port must be free).",
  );
  const signupAlias = await fetch(`${base}/signup`, { redirect: "manual" });
  assert.equal(signupAlias.status, 307);
  assert.equal(signupAlias.headers.get("location"), "/sign-up");
  const signup = await fetch(`${base}/sign-up`);
  assert.equal(signup.status, 200);
  const signupHtml = await signup.text();
  assert.match(signupHtml, /name="dateOfBirth"/);
  assert.match(signupHtml, /name="acceptTerms"/);
  assert.match(signupHtml, /autoComplete="new-password"/i);
  const otp = await fetch(
    `${base}/verify-email?email=kyc-test%40example.invalid`,
  );
  assert.equal(otp.status, 200);
  const otpHtml = await otp.text();
  assert.match(otpHtml, /one-time-code/);
  assert.match(otpHtml, /maxLength="6"/i);
  assert.match(otpHtml, /Resend code in/);
  for (const route of [
    "dashboard",
    "events",
    "bookings",
    "analytics",
    "settings",
    "verify-identity",
    "become-host",
  ]) {
    const response = await fetch(`${base}/${route}`, { redirect: "manual" });
    assert.equal(response.status, 307, `/${route} must require login`);
    assert.equal(
      new URL(response.headers.get("location"), base).pathname,
      "/login",
    );
  }
  for (const route of ["events", "reservations"]) {
    const response = await fetch(`${base}/api/${route}`, {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
      redirect: "manual",
    });
    assert.equal(
      response.status,
      401,
      `Anonymous /api/${route} must be rejected`,
    );
  }
  const webhook = await fetch(`${base}/api/webhooks/identity`, {
    method: "POST",
    body: "{}",
    redirect: "manual",
  });
  assert.ok(
    [400, 503].includes(webhook.status),
    "Unsigned webhook must fail without redirecting to login",
  );
  console.log(
    "PASS: production signup/OTP HTML, seven protected routes, two API gates, and unsigned webhook rejection",
  );
} finally {
  if (server.exitCode === null) {
    server.kill();
    await Promise.race([once(server, "exit"), delay(5000)]);
  }
}
