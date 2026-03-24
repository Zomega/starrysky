import { test, describe, before } from "node:test";
import assert from "node:assert";
import { MockDataProvider } from "../service/src/core/providers/mock.ts";
import { AppViewDataProvider } from "../service/src/core/providers/appview.ts";
import { PdsDataProvider } from "../service/src/core/providers/pds.ts";

// Mock fetch for AppView and PDS tests
global.fetch = async (url) => {
  if (url.includes("getProfileStreaks")) {
    return {
      ok: true,
      json: async () => ({
        streaks: [
          {
            subject: "Wordle",
            streakSequence: 5,
            lastCheckinDate: "2026-02-28",
            balance: 2,
          },
        ],
      }),
    };
  }
  if (url.includes("getStreakStatus")) {
    return {
      ok: true,
      json: async () => ({
        subject: "Wordle",
        streakSequence: 5,
        lastCheckinDate: "2026-02-28",
        balance: 2,
      }),
    };
  }
  if (url.includes("listRecords")) {
    return {
      ok: true,
      json: async () => ({
        records: [
          {
            uri: "at://did:example:alice/app.starrysky.streak.checkin/rkey",
            cid: "cid",
            value: {
              subject: "Wordle",
              streakSequence: 5,
              streakDate: "2026-02-28",
              createdAt: "2026-02-28T12:00:00Z",
            },
          },
        ],
      }),
    };
  }
  return { ok: false };
};

describe("Data Providers Consistency", () => {
  const providers = [
    { name: "Mock", instance: new MockDataProvider() },
    { name: "AppView", instance: new AppViewDataProvider("http://mock") },
    { name: "PDS", instance: new PdsDataProvider("http://mock") },
  ];

  for (const { name, instance } of providers) {
    test(`${name} provider should return a valid profile summary`, async () => {
      const summary = await instance.getProfileStreaks("did:example:alice");
      assert.ok(Array.isArray(summary), `${name} summary should be an array`);
      assert.ok(summary.length > 0, `${name} summary should not be empty`);
      assert.strictEqual(typeof summary[0].subject, "string");
      assert.strictEqual(typeof summary[0].streakSequence, "number");
    });

    test(`${name} provider should return a valid streak status`, async () => {
      const status = await instance.getStreakStatus(
        "did:example:alice",
        "Wordle",
      );
      assert.strictEqual(status.subject, "Wordle");
      assert.strictEqual(typeof status.streakSequence, "number");
    });
  }
});
