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
  sqlite.function("cardinality", (value) => value === null ? null : JSON.parse(value).length);
  sqlite.function("timezone", (zone, timestamp) => {
    assert.equal(zone, "Asia/Manila");
    return new Date(Date.parse(timestamp) + 8 * 60 * 60 * 1000).toISOString();
  });
  sqlite.function("to_char", (timestamp, format) => {
    assert.equal(format, "YYYY-MM");
    return timestamp.slice(0, 7);
  });
  sqlite.exec(`
    create table event (event_id text primary key, host_id text, total_earned numeric, created_at text);
    create table event_ticket (ticket_id text primary key, event_id text, ticket_price numeric);
    create table event_table (table_id text primary key, event_id text, table_price numeric, capacity integer);
    create table reservation (reservation_id text primary key, attendee_id text, status text, reserved_at text);
    create table reservation_item (reservation_item_id text primary key, reservation_id text, ticket_id text, table_id text, item_type text, unit_price numeric);
    create table table_reservation_guests (reservation_item_id text primary key, names text);
    create table payment_proof (proof_id text primary key, reservation_item_id text, status text);
    insert into event (event_id, host_id, total_earned) values ('event-a','host-a',999999), ('event-b','host-a',888888), ('event-other','host-b',777777), ('event-empty','host-a',555555);
    insert into event_ticket values ('ticket-a','event-a',999), ('ticket-b','event-b',999), ('ticket-other','event-other',999), ('ticket-free','event-a',0);
    insert into event_table values ('table-a','event-a',9000,20);
    insert into reservation (reservation_id, attendee_id, status) values ('confirmed','guest-a','Confirmed'), ('multiple','guest-a','Confirmed'), ('pending','guest-b','Pending'), ('denied','guest-c','Denied'), ('free','guest-d','Confirmed'), ('other','guest-e','Confirmed'), ('shared','guest-f','Confirmed');
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
    insert into table_reservation_guests values
      ('item-2','["Guest 1","Guest 2","Guest 3"]'),
      ('item-6','["Declined guest"]');
    insert into payment_proof values ('proof-1','item-1','succeeded'), ('proof-2','item-1','pending'), ('proof-3','item-5','succeeded');
  `);
  // Execute Drizzle's actual generated SELECT/UPDATE SQL against isolated rows.
  // Register PostgreSQL-specific functions above for this SQLite fixture.
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

test("empty hosts and events with no confirmed bookings return no event totals", async (t) => {
  const { dashboard } = fixture(t);
  assert.equal(await dashboard.getTotalRevenue("no-events"), 0);
  assert.deepEqual(await dashboard.getEventBookingTotals("host-a", []), []);
  assert.deepEqual(
    await dashboard.getEventBookingTotals("host-a", ["event-empty"]),
    [],
  );
});

test("the guest total adds each confirmed table's saved guests to distinct buyers for the host", async (t) => {
  const { sqlite, mocks } = fixture(t);
  sqlite.exec(`
    insert into event_table values ('table-b','event-b',0,3), ('table-other','event-other',0,8);
    insert into reservation_item values
      ('item-11','multiple',null,'table-b','table',0),
      ('item-12','other',null,'table-other','table',0);
    insert into table_reservation_guests values
      ('item-11','["Guest 4","Guest 5","Guest 6"]'),
      ('item-12','["Other guest"]');
  `);
  const { getBookingStats } = loadTs("lib/events.ts", mocks);
  assert.deepEqual(await getBookingStats("host-a"), { bookings: 4, guests: 9 });
  assert.deepEqual(await getBookingStats("host-b"), { bookings: 2, guests: 3 });
  assert.deepEqual(await getBookingStats("no-events"), { bookings: 0, guests: 0 });
});

test("per-event totals count confirmed tickets and table buyers plus saved guests for the host", async (t) => {
  const { sqlite, dashboard } = fixture(t);
  sqlite.exec(`
    insert into event_table values ('table-b','event-b',0,20);
    insert into reservation_item values ('item-11','multiple',null,'table-b','table',0);
  `);
  const rows = await dashboard.getEventBookingTotals("host-a", [
    "event-a",
    "event-b",
    "event-other",
  ]);
  assert.deepEqual(
    new Map(rows.map((row) => [row.eventId, row])),
    new Map([
      ["event-a", { eventId: "event-a", revenue: 1601, guests: 7 }],
      ["event-b", { eventId: "event-b", revenue: 109.5, guests: 3 }],
    ]),
  );
});

test("the trend route returns the signed-in host's booking and guest totals by Manila month", async (t) => {
  const { sqlite, mocks, dashboard } = fixture(t);
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-12-31T16:01:00.000Z") });
  sqlite.exec(`
    update reservation set reserved_at = '2026-12-31T16:00:00.000Z';
    update reservation set reserved_at = '2026-10-31T16:00:00.000Z' where reservation_id = 'multiple';
    update reservation set reserved_at = '2026-10-31T15:59:59.999Z' where reservation_id = 'free';
    update reservation set reserved_at = '2026-12-31T15:59:59.999Z' where reservation_id = 'shared';
    insert into reservation values ('future', 'guest-a', 'Confirmed', '2026-12-31T16:01:00.001Z');
    insert into reservation_item values ('future-item', 'future', 'ticket-a', null, 'ticket', 0);
  `);
  let profile = { id: "host-a" };
  const { GET } = loadTs("app/api/analytics/bookings-guests/route.ts", {
    ...mocks,
    "@/lib/auth": { getProfile: async () => profile },
    "@/lib/dashboard": dashboard,
  });
  const request = (query) =>
    new Request(`https://example.test/api/analytics/bookings-guests${query}`);

  const threeMonths = await GET(request("?range=3&hostId=host-b"));
  assert.equal(threeMonths.status, 200);
  assert.equal(threeMonths.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await threeMonths.json(), {
    range: 3,
    data: [
      { month: "Nov", bookings: 1, guests: 2 },
      { month: "Dec", bookings: 1, guests: 1 },
      { month: "Jan", bookings: 1, guests: 5 },
    ],
  });

  const sixMonths = await GET(request("?range=6"));
  const { data: sixMonthData } = await sixMonths.json();
  assert.deepEqual(sixMonthData.slice(0, 3), [
    { month: "Aug", bookings: 0, guests: 0 },
    { month: "Sep", bookings: 0, guests: 0 },
    { month: "Oct", bookings: 1, guests: 1 },
  ]);
  assert.equal(sixMonthData.length, 6);

  const defaultRange = await GET(request(""));
  const { range, data } = await defaultRange.json();
  assert.equal(range, 12);
  assert.equal(data.length, 12);
  assert.equal((await GET(request("?range=4"))).status, 400);

  profile = null;
  assert.equal((await GET(request("?range=3"))).status, 401);
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

test("summary cards compare Manila months and display up, down, flat, and new activity", async (t) => {
  const { sqlite, mocks, dashboard } = fixture(t);
  const { renderToStaticMarkup } = require("react-dom/server");
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-12-31T16:01:00.000Z") });
  sqlite.exec(`
    update event set created_at = '2026-11-30T15:59:59.999Z';
    update event set created_at = '2026-12-31T16:00:00.000Z' where event_id = 'event-a';
    update event set created_at = '2026-12-31T16:01:00.001Z' where event_id = 'event-empty';
    update event set created_at = '2026-12-31T15:59:59.999Z' where event_id = 'event-other';
    update reservation set reserved_at = '2026-12-31T16:00:00.000Z';
    update reservation set reserved_at = '2026-11-30T16:00:00.000Z' where reservation_id = 'confirmed';
    update reservation set reserved_at = '2026-12-31T15:59:59.999Z' where reservation_id = 'shared';
    insert into reservation values
      ('older', 'old-guest', 'Confirmed', '2026-11-30T15:59:59.999Z'),
      ('future', 'future-guest', 'Confirmed', '2026-12-31T16:01:00.001Z');
    insert into reservation_item values
      ('older-item', 'older', 'ticket-a', null, 'ticket', 25),
      ('future-item', 'future', 'ticket-a', null, 'ticket', 30);
    update reservation_item set unit_price = 90 where reservation_item_id = 'item-1';
    update reservation_item set unit_price = 500 where reservation_item_id = 'item-2';
    update reservation_item set unit_price = 1100 where reservation_item_id = 'item-3';
    update reservation_item set unit_price = 100 where reservation_item_id = 'item-4';
  `);

  assert.deepEqual(await dashboard.getMonthlySummaryChanges("host-a"), {
    events: null,
    bookings: 0,
    guests: -0.6,
    revenue: 1,
  });
  assert.deepEqual(await dashboard.getMonthlySummaryChanges("no-events"), {
    events: 0,
    bookings: 0,
    guests: 0,
    revenue: 0,
  });

  const { SummaryTotal } = loadTs("app/(app)/dashboard/summary-total.tsx", {
    ...mocks,
    "@/lib/dashboard": dashboard,
    "@/lib/auth": { verifyUser: async () => ({ id: "host-a" }) },
    "next/server": { connection: async () => {} },
  });
  const summary = renderToStaticMarkup(await SummaryTotal());
  const card = (title) =>
    summary.match(new RegExp(`>${title}</h2>[\\s\\S]*?</span></div>`))?.[0] ?? "";
  assert.match(card("Total Events"), />New<\/span><span[^>]*>this month<\/span>/);
  assert.match(card("Total Bookings"), />0%<\/span>/);
  assert.doesNotMatch(card("Total Bookings"), /lucide-arrow/);
  assert.match(card("Total Guests"), /lucide-arrow-down-right[\s\S]*>-60%<\/span>/);
  assert.match(card("Total Revenue"), /lucide-arrow-up-right[\s\S]*>\+100%<\/span>/);
});

test("dashboard cards render actual guest totals and confirmed revenue with centavos", async (t) => {
  const { mocks, dashboard } = fixture(t);
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const boundaries = {
    ...mocks,
    "@/lib/dashboard": dashboard,
    "@/lib/auth": { verifyUser: async () => ({ id: "host-a" }) },
    "next/server": { connection: async () => {} },
    "next/link": ({ href, children, ...props }) =>
      React.createElement("a", { ...props, href }, children),
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async () => ({
          error: null,
          data: [
            {
              event_id: "event-a",
              event_name: "Confirmed event",
              start_time: "2026-12-01T10:00:00Z",
              end_time: "2026-12-01T12:00:00Z",
              bookings: 3,
              guests: 23,
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
  const summary = renderToStaticMarkup(await SummaryTotal());
  assert.ok(summary.includes("₱1,710.50"));
  assert.match(summary, /Total Guests<\/h2><p\b[^>]*>6<\/p>/);
  const { RecentEvents } = loadTs(
    "app/(app)/dashboard/recent-events.tsx",
    boundaries,
  );
  const recent = renderToStaticMarkup(await RecentEvents());
  const confirmedRow = recent.match(/Confirmed event<\/span>[\s\S]*?<\/tr>/)?.[0] ?? "";
  assert.match(confirmedRow, />3<\/td><td\b[^>]*>7<\/td>/);
  assert.ok(confirmedRow.includes("₱1,601.00"));
  assert.ok(recent.includes("₱0.00"));
  assert.ok(!recent.includes("888,888"));
});
