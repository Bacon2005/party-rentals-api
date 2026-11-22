const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { DatabaseSync } = require("node:sqlite");
const { test } = require("node:test");
const { drizzle } = require("drizzle-orm/pg-proxy");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadTs(relative, mocks = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const localRequire = createRequire(filename);
    function resolve(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith("./")) {
        const base = name.startsWith("@/")
          ? path.join(root, name.slice(2))
          : path.resolve(path.dirname(filename), name);
        return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      return localRequire(name);
    }
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("exports", "require", "module", output)(
      module.exports,
      resolve,
      module,
    );
    return module.exports;
  }
  return load(path.join(root, relative));
}

function fixture(t) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  sqlite.exec(`
    create table event (event_id text primary key, host_id text, total_earned numeric);
    create table event_ticket (ticket_id text primary key, event_id text, ticket_price numeric);
    create table event_table (table_id text primary key, event_id text, table_price numeric, capacity integer);
    create table reservation (reservation_id text primary key, attendee_id text, status text);
    create table reservation_item (reservation_item_id text primary key, reservation_id text, ticket_id text, table_id text, item_type text, unit_price numeric);
    create table payment_proof (proof_id text primary key, reservation_item_id text, status text);
    insert into event values ('event-a','host-a',999999), ('event-b','host-a',888888), ('event-other','host-b',777777), ('event-empty','host-a',555555);
    insert into event_ticket values ('ticket-a','event-a',999), ('ticket-b','event-b',999), ('ticket-other','event-other',999), ('ticket-free','event-a',0);
    insert into event_table values ('table-a','event-a',9000,8);
    insert into reservation values ('confirmed','guest-a','Confirmed'), ('multiple','guest-a','Confirmed'), ('pending','guest-b','Pending'), ('denied','guest-c','Denied'), ('free','guest-d','Confirmed'), ('other','guest-e','Confirmed'), ('shared','guest-f','Confirmed');
    insert into reservation_item values
      ('item-1','confirmed','ticket-a',null,'ticket',200.25),
      ('item-2','confirmed',null,'table-a','table',1200.50),
      ('item-3','multiple','ticket-a',null,'ticket',200.25),
      ('item-4','multiple','ticket-b',null,'ticket',99.50),
      ('item-5','pending','ticket-a',null,'ticket',6000),
      ('item-6','denied',null,'table-a','table',8000),
      ('item-7','free','ticket-free',null,'ticket',0),
      ('item-8','other','ticket-other',null,'ticket',1000),
      ('item-9','shared','ticket-b',null,'ticket',10),
      ('item-10','shared','ticket-other',null,'ticket',500);
    insert into payment_proof values ('proof-1','item-1','succeeded'), ('proof-2','item-1','pending'), ('proof-3','item-5','succeeded');
  `);
  // Execute Drizzle's actual generated SELECT/UPDATE SQL against isolated rows.
  // These queries use standard SQL shared by PostgreSQL and SQLite.
  const db = drizzle(async (query, params) => {
    const bindings = Object.fromEntries(
      params.map((value, index) => [`$${index + 1}`, value]),
    );
    const rows = sqlite.prepare(query).all(bindings);
    return { rows: rows.map((row) => Object.values(row)) };
  });
  const mocks = { "@/db": { db } };
  return { sqlite, mocks, dashboard: loadTs("lib/dashboard.ts", mocks) };
}

test("revenue sums confirmed booked ticket and table prices once for the current host", async (t) => {
  const { dashboard } = fixture(t);
  // Pending/denied bookings, another host, duplicate proofs, edited catalog
  // prices, table capacity and stale event.total_earned must not inflate this.
  assert.equal(await dashboard.getTotalRevenue("host-a"), 1710.5);
  assert.equal(await dashboard.getTotalRevenue("host-b"), 1500);
});

test("empty hosts and events with no confirmed income return zero", async (t) => {
  const { dashboard } = fixture(t);
  assert.equal(await dashboard.getTotalRevenue("no-events"), 0);
  assert.deepEqual(await dashboard.getEventRevenues("host-a", []), []);
  assert.deepEqual(
    await dashboard.getEventRevenues("host-a", ["event-empty"]),
    [],
  );
});

test("per-event revenue uses the same confirmed amounts and cannot include another host", async (t) => {
  const { dashboard } = fixture(t);
  const rows = await dashboard.getEventRevenues("host-a", [
    "event-a",
    "event-b",
    "event-other",
  ]);
  assert.deepEqual(
    new Map(rows.map((row) => [row.eventId, row.total])),
    new Map([
      ["event-a", 1601],
      ["event-b", 109.5],
    ]),
  );
});

test("confirming a booking updates earned revenue and invalidates the dashboard only once", async (t) => {
  const { mocks, dashboard } = fixture(t);
  const paths = [];
  let notifications = 0;
  const { decideReservation } = loadTs("app/(app)/bookings/actions.ts", {
    ...mocks,
    "@/lib/auth": { verifyUser: async () => ({ id: "host-a" }) },
    "@/lib/push": {
      sendPushToProfile: async () => {
        notifications++;
      },
    },
    "next/cache": { revalidatePath: (value) => paths.push(value) },
  });
  assert.equal((await decideReservation("pending", "Confirmed")).ok, true);
  assert.equal(await dashboard.getTotalRevenue("host-a"), 7710.5);
  assert.deepEqual(paths, ["/bookings", "/dashboard"]);
  assert.equal(notifications, 1);
  assert.equal((await decideReservation("pending", "Confirmed")).ok, false);
  assert.equal(await dashboard.getTotalRevenue("host-a"), 7710.5);
  assert.equal(notifications, 1);
});

test("denying a booking earns nothing and another host cannot confirm it", async (t) => {
  const { mocks, dashboard } = fixture(t);
  let hostId = "host-b";
  const { decideReservation } = loadTs("app/(app)/bookings/actions.ts", {
    ...mocks,
    "@/lib/auth": { verifyUser: async () => ({ id: hostId }) },
    "@/lib/push": { sendPushToProfile: async () => {} },
    "next/cache": { revalidatePath: () => {} },
  });
  assert.equal((await decideReservation("pending", "Confirmed")).ok, false);
  hostId = "host-a";
  assert.equal((await decideReservation("pending", "Denied")).ok, true);
  assert.equal(await dashboard.getTotalRevenue("host-a"), 1710.5);
});

test("the total and recent-event cards render confirmed revenue with centavos", async (t) => {
  const { mocks, dashboard } = fixture(t);
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const boundaries = {
    ...mocks,
    "@/lib/dashboard": dashboard,
    "@/lib/auth": { verifyUser: async () => ({ id: "host-a" }) },
    "@/lib/events": {
      getBookingStats: async () => ({ bookings: 4, guests: 4 }),
    },
    "next/server": { connection: async () => {} },
    "next/link": ({ href, children, ...props }) =>
      React.createElement("a", { ...props, href }, children),
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async () => ({
          error: null,
          data: [
            {
              event_id: "event-b",
              event_name: "Confirmed event",
              start_time: "2026-12-01T10:00:00Z",
              end_time: "2026-12-01T12:00:00Z",
              bookings: 2,
              guests: 2,
              total_earned: 888888,
            },
            {
              event_id: "event-empty",
              event_name: "Empty event",
              start_time: "2026-12-01T10:00:00Z",
              end_time: "2026-12-01T12:00:00Z",
              bookings: 0,
              guests: 0,
              total_earned: 555555,
            },
          ],
        }),
      }),
    },
  };
  const { SummaryTotal } = loadTs(
    "app/(app)/dashboard/summary-total.tsx",
    boundaries,
  );
  assert.ok(renderToStaticMarkup(await SummaryTotal()).includes("₱1,710.50"));
  const { RecentEvents } = loadTs(
    "app/(app)/dashboard/recent-events.tsx",
    boundaries,
  );
  const recent = renderToStaticMarkup(await RecentEvents());
  assert.ok(recent.includes("₱109.50"));
  assert.ok(recent.includes("₱0.00"));
  assert.ok(!recent.includes("888,888"));
});
