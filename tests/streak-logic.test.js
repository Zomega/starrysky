const assert = require("assert");
// Mock document since mockup.js uses it at top level or in some functions
global.document = {
  getElementById: () => ({
    content: { cloneNode: () => ({ firstElementChild: {} }) },
  }),
  querySelector: () => ({ addEventListener: () => {} }),
  addEventListener: () => {},
};
global.window = { addEventListener: () => {} };

const { getGridDataForRange, getDaysInMonth } = require("../mockup.js");

function testGetDaysInMonth() {
  console.log("Testing getDaysInMonth...");
  const feb2026 = getDaysInMonth(2026, 1); // Feb is 1
  assert.strictEqual(feb2026.length, 28);
  assert.strictEqual(feb2026[0], 1);
  assert.strictEqual(feb2026[27], 28);

  const leapFeb = getDaysInMonth(2024, 1);
  assert.strictEqual(leapFeb.length, 29);
  console.log("✅ getDaysInMonth passed");
}

function testGetGridDataForRange() {
  console.log("Testing getGridDataForRange...");

  const checkins = [
    {
      subject: "Test",
      createdAt: "2026-02-01T12:00:00Z",
      sequence: 1,
      freezesClaimed: 0,
    },
    {
      subject: "Test",
      createdAt: "2026-02-02T12:00:00Z",
      sequence: 2,
      freezesClaimed: 0,
    },
    // Gap on 03, 04
    {
      subject: "Test",
      createdAt: "2026-02-05T12:00:00Z",
      sequence: 5,
      freezesClaimed: 2,
    },
  ];

  const result = getGridDataForRange(
    checkins,
    "Test",
    "2026-02-01",
    "2026-02-05",
  );

  // Indices: 0: Feb 1, 1: Feb 2, 2: Feb 3, 3: Feb 4, 4: Feb 5
  // Active: Feb 1, Feb 2, Feb 5 -> [0, 1, 4]
  // Frozen: Feb 3, Feb 4 -> [2, 3]

  assert.deepStrictEqual(result.activeIndices, [0, 1, 4]);
  assert.deepStrictEqual(result.frozenIndices, [2, 3]);

  // Test range outside checkins
  const result2 = getGridDataForRange(
    checkins,
    "Test",
    "2026-01-31",
    "2026-02-02",
  );
  // 0: Jan 31, 1: Feb 1, 2: Feb 2
  assert.deepStrictEqual(result2.activeIndices, [1, 2]);
  assert.deepStrictEqual(result2.frozenIndices, []);

  console.log("✅ getGridDataForRange passed");
}

try {
  testGetDaysInMonth();
  testGetGridDataForRange();
  console.log("\nAll tests passed successfully! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
