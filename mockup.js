import JSConfetti from "https://esm.sh/js-confetti@0.12.0";

const jsConfetti = new JSConfetti();
let lastCelebratedCount = -1;

const MOCK_POLICIES = {
  Wordle: {
    name: "Wordle",
    originService: "app.starrysky",
    milestones: [1, 3, 7, 10, 25, 50, 75, 100, 200, 300],
    recurringMilestoneInterval: 100,
    freezesGrantedAtMilestone: 1,
    intervalsToEarnFreeze: 0,
    includeFreezesInStreak: false,
    maxFreezes: 3,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
  },
  "Tiled Words": {
    name: "Tiled Words",
    originService: "app.starrysky",
    milestones: [5, 10, 25, 50],
    recurringMilestoneInterval: 50,
    freezesGrantedAtMilestone: 0,
    intervalsToEarnFreeze: 7,
    includeFreezesInStreak: true,
    maxFreezes: 5,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
  },
  Connections: {
    name: "Connections",
    originService: "app.starrysky",
    milestones: [7, 14, 21, 28],
    recurringMilestoneInterval: 28,
    freezesGrantedAtMilestone: 1,
    intervalsToEarnFreeze: 0,
    includeFreezesInStreak: false,
    maxFreezes: 2,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
  },
  Crossword: {
    name: "Crossword",
    originService: "app.starrysky",
    milestones: [1, 5, 10, 25, 50, 100],
    recurringMilestoneInterval: 100,
    freezesGrantedAtMilestone: 1,
    intervalsToEarnFreeze: 10,
    includeFreezesInStreak: false,
    maxFreezes: 3,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
  },
};

function getPolicyForSubject(subject) {
  return MOCK_POLICIES[subject] || MOCK_POLICIES["Wordle"];
}

function isMilestone(count, policy) {
  if (count <= 0) return false;
  if (policy.milestones && policy.milestones.includes(count)) return true;
  if (policy.recurringMilestoneInterval) {
    const lastExplicit = policy.milestones ? Math.max(...policy.milestones) : 0;
    if (count > lastExplicit) {
      return (count - lastExplicit) % policy.recurringMilestoneInterval === 0;
    }
  }
  return false;
}

const MOCK_CHECKINS = [
  // Wordle Streak - January 2026
  {
    subject: "Wordle",
    createdAt: "2026-01-01T12:00:00Z",
    streakSequence: 449,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-02T12:00:00Z",
    streakSequence: 450,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-03T12:00:00Z",
    streakSequence: 451,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-04T12:00:00Z",
    streakSequence: 452,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-05T12:00:00Z",
    streakSequence: 453,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-06T12:00:00Z",
    streakSequence: 454,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-07T12:00:00Z",
    streakSequence: 455,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-08T12:00:00Z",
    streakSequence: 456,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-09T12:00:00Z",
    streakSequence: 457,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-10T12:00:00Z",
    streakSequence: 458,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-11T12:00:00Z",
    streakSequence: 459,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-12T12:00:00Z",
    streakSequence: 460,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-13T12:00:00Z",
    streakSequence: 461,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-14T12:00:00Z",
    streakSequence: 462,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-15T12:00:00Z",
    streakSequence: 463,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-16T12:00:00Z",
    streakSequence: 464,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-17T12:00:00Z",
    streakSequence: 465,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-18T12:00:00Z",
    streakSequence: 466,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-19T12:00:00Z",
    streakSequence: 467,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-20T12:00:00Z",
    streakSequence: 468,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-23T12:00:00Z",
    streakSequence: 469,
    checkinsInInterval: 1,
    freezesClaimed: 2,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-24T12:00:00Z",
    streakSequence: 470,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-25T12:00:00Z",
    streakSequence: 471,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-26T12:00:00Z",
    streakSequence: 472,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-27T12:00:00Z",
    streakSequence: 473,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-28T12:00:00Z",
    streakSequence: 474,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-29T12:00:00Z",
    streakSequence: 475,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-30T12:00:00Z",
    streakSequence: 476,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-01-31T12:00:00Z",
    streakSequence: 477,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },

  // Wordle Streak - February 2026
  {
    subject: "Wordle",
    createdAt: "2026-02-01T12:00:00Z",
    streakSequence: 478,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-02T12:00:00Z",
    streakSequence: 479,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-03T12:00:00Z",
    streakSequence: 480,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-04T12:00:00Z",
    streakSequence: 481,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-05T12:00:00Z",
    streakSequence: 482,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-06T12:00:00Z",
    streakSequence: 483,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-07T12:00:00Z",
    streakSequence: 484,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-08T12:00:00Z",
    streakSequence: 485,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-09T12:00:00Z",
    streakSequence: 486,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-10T12:00:00Z",
    streakSequence: 487,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-11T12:00:00Z",
    streakSequence: 488,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-12T12:00:00Z",
    streakSequence: 489,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-13T12:00:00Z",
    streakSequence: 490,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-14T12:00:00Z",
    streakSequence: 491,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-15T12:00:00Z",
    streakSequence: 492,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-18T12:00:00Z",
    streakSequence: 493,
    checkinsInInterval: 1,
    freezesClaimed: 2,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-19T12:00:00Z",
    streakSequence: 494,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-20T12:00:00Z",
    streakSequence: 495,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-21T12:00:00Z",
    streakSequence: 496,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-22T12:00:00Z",
    streakSequence: 497,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-23T12:00:00Z",
    streakSequence: 498,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-25T12:00:00Z",
    streakSequence: 499,
    checkinsInInterval: 1,
    freezesClaimed: 1,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-26T12:00:00Z",
    streakSequence: 500,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-27T12:00:00Z",
    streakSequence: 501,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Wordle",
    createdAt: "2026-02-28T12:00:00Z",
    streakSequence: 502,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },

  // Tiled Words
  {
    subject: "Tiled Words",
    createdAt: "2026-02-22T12:00:00Z",
    streakSequence: 1,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Tiled Words",
    createdAt: "2026-02-23T12:00:00Z",
    streakSequence: 2,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Tiled Words",
    createdAt: "2026-02-24T12:00:00Z",
    streakSequence: 3,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Tiled Words",
    createdAt: "2026-02-26T12:00:00Z",
    streakSequence: 4,
    checkinsInInterval: 1,
    freezesClaimed: 1,
  },
  {
    subject: "Tiled Words",
    createdAt: "2026-02-27T12:00:00Z",
    streakSequence: 5,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Tiled Words",
    createdAt: "2026-02-28T12:00:00Z",
    streakSequence: 6,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },

  // Connections
  {
    subject: "Connections",
    createdAt: "2026-02-22T12:00:00Z",
    streakSequence: 1,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Connections",
    createdAt: "2026-02-23T12:00:00Z",
    streakSequence: 2,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Connections",
    createdAt: "2026-02-25T12:00:00Z",
    streakSequence: 3,
    checkinsInInterval: 1,
    freezesClaimed: 1,
  },
  {
    subject: "Connections",
    createdAt: "2026-02-26T12:00:00Z",
    streakSequence: 4,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Connections",
    createdAt: "2026-02-27T12:00:00Z",
    streakSequence: 5,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Connections",
    createdAt: "2026-02-28T12:00:00Z",
    streakSequence: 6,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },

  // Crossword
  {
    subject: "Crossword",
    createdAt: "2026-02-21T12:00:00Z",
    streakSequence: 1,
    checkinsInInterval: 1,
    freezesClaimed: 0,
  },
  {
    subject: "Crossword",
    createdAt: "2026-02-23T12:00:00Z",
    streakSequence: 2,
    checkinsInInterval: 1,
    freezesClaimed: 1,
  },
  {
    subject: "Crossword",
    createdAt: "2026-02-25T12:00:00Z",
    streakSequence: 3,
    checkinsInInterval: 1,
    freezesClaimed: 1,
  },
  {
    subject: "Crossword",
    createdAt: "2026-02-27T12:00:00Z",
    streakSequence: 4,
    checkinsInInterval: 1,
    freezesClaimed: 1,
  },
];

let currentYear = 2026;
let currentMonth = 1; // February
const primarySubject = "Wordle";

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

function createStar(index) {
  const star = cloneTemplate("tpl-star");
  star.style.setProperty("--index", index);
  star.style.setProperty("--delay-multiplier", 0.01 * index);
  return star;
}

export function getGridDataForRange(
  checkins,
  subject,
  startDateStr,
  endDateStr,
) {
  const activeIndices = [];
  const frozenIndices = [];
  const dayMs = 24 * 60 * 60 * 1000;

  const start = new Date(startDateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setUTCHours(0, 0, 0, 0);

  const relevantCheckins = checkins.filter((c) => c.subject === subject);
  const dayMap = new Map();

  relevantCheckins.forEach((c) => {
    const checkinDate = new Date(c.createdAt);
    checkinDate.setUTCHours(0, 0, 0, 0);
    const ts = checkinDate.getTime();

    if (ts >= start.getTime() && ts <= end.getTime()) {
      dayMap.set(ts, "active");
    }

    if (c.freezesClaimed > 0) {
      for (let i = 1; i <= c.freezesClaimed; i++) {
        const frozenTs = ts - i * dayMs;
        if (frozenTs >= start.getTime() && frozenTs <= end.getTime()) {
          if (dayMap.get(frozenTs) !== "active") {
            dayMap.set(frozenTs, "frozen");
          }
        }
      }
    }
  });

  let currTs = start.getTime();
  let idx = 0;
  while (currTs <= end.getTime()) {
    const status = dayMap.get(currTs);
    if (status === "active") activeIndices.push(idx);
    else if (status === "frozen") frozenIndices.push(idx);

    currTs += dayMs;
    idx++;
  }

  return { activeIndices, frozenIndices };
}

function renderStreakGrid(days, activeDays, freezeDays, cols = 8) {
  const container = cloneTemplate("tpl-streak-grid");
  container.style.setProperty("--grid-cols", cols);

  days.forEach((day, index) => {
    const cell = cloneTemplate("tpl-day-cell");
    const isActive = activeDays.includes(index);
    const isFrozen = freezeDays.includes(index);

    if (isActive) cell.classList.add("active");
    if (isFrozen) {
      cell.classList.add("frozen");
      cell.appendChild(cloneTemplate("tpl-freeze-icon"));
    }

    cell.textContent = day;
    container.appendChild(cell);
  });

  const elements = [];
  const allMarked = [...activeDays, ...freezeDays].sort((a, b) => a - b);

  if (allMarked.length > 0) {
    let i = 0;
    while (i < allMarked.length) {
      let startIdx = allMarked[i];
      let endIdx = startIdx;
      let isCurrentFrozen = freezeDays.includes(startIdx);

      let j = i + 1;
      while (
        j < allMarked.length &&
        allMarked[j] === endIdx + 1 &&
        freezeDays.includes(allMarked[j]) === isCurrentFrozen
      ) {
        endIdx = allMarked[j];
        j++;
      }

      const left = (startIdx / cols) * 100;
      const width = ((endIdx - startIdx + 1) / cols) * 100;

      const pill = cloneTemplate("tpl-streak-pill");
      if (isCurrentFrozen) pill.classList.add("frozen");
      pill.style.left = `${left}%`;
      pill.style.width = `${width}%`;
      elements.push(pill);

      if (isCurrentFrozen) {
        const icon = cloneTemplate("tpl-freeze-icon");
        const centerLeft =
          ((startIdx + (endIdx - startIdx) / 2 + 0.5) / cols) * 100;
        icon.style.left = `${centerLeft}%`;
        elements.push(icon);
      }

      i = j;
    }
  }

  elements.forEach((el) => container.appendChild(el));
  return container;
}

function renderStreakRow(
  name,
  days,
  activeDays,
  freezeDays = [],
  totalStreak = 0,
) {
  const row = cloneTemplate("tpl-streak-row");
  row.querySelector(".streak-name").textContent = name;
  row.querySelector(".streak-total").textContent = `${totalStreak}d`;
  row.insertBefore(
    renderStreakGrid(days, activeDays, freezeDays, days.length),
    row.querySelector(".streak-total"),
  );
  return row;
}

export function getDaysInMonth(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const days = [];
  while (date.getUTCMonth() === month) {
    days.push(date.getUTCDate());
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

function renderCalendarCard() {
  const calCard = cloneTemplate("tpl-calendar-card");
  calCard.querySelector(".streak-association").textContent = primarySubject;

  const monthName = new Date(
    Date.UTC(currentYear, currentMonth, 1),
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  calCard.querySelector(".calendar-month-title").textContent = monthName;

  const calWeeks = calCard.querySelector(".calendar-weeks");
  const monthDays = getDaysInMonth(currentYear, currentMonth);

  const firstDay = new Date(Date.UTC(currentYear, currentMonth, 1)).getUTCDay();
  const prevMonthLastDate = new Date(
    Date.UTC(currentYear, currentMonth, 0),
  ).getUTCDate();

  const fullGridDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    fullGridDays.push(prevMonthLastDate - i);
  }
  monthDays.forEach((d) => fullGridDays.push(d));
  let nextDay = 1;
  while (fullGridDays.length % 7 !== 0) {
    fullGridDays.push(nextDay++);
  }

  const startDate = new Date(Date.UTC(currentYear, currentMonth, 1 - firstDay));
  const endDate = new Date(
    Date.UTC(currentYear, currentMonth, 1 - firstDay + fullGridDays.length - 1),
  );

  const { activeIndices, frozenIndices } = getGridDataForRange(
    MOCK_CHECKINS,
    primarySubject,
    startDate.toISOString(),
    endDate.toISOString(),
  );

  for (let i = 0; i < fullGridDays.length; i += 7) {
    const weekDays = fullGridDays.slice(i, i + 7);
    const weekActive = activeIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);
    const weekFrozen = frozenIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);

    const grid = renderStreakGrid(weekDays, weekActive, weekFrozen, 7);
    const cells = grid.querySelectorAll(".day-cell");
    weekDays.forEach((day, idx) => {
      const isActualMonth =
        i + idx >= firstDay && i + idx < firstDay + monthDays.length;
      if (!isActualMonth) cells[idx].classList.add("prev-month");
    });

    calWeeks.appendChild(grid);
  }

  calCard
    .querySelector(".nav-arrow:first-child")
    .addEventListener("click", () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      refreshUI();
    });
  calCard
    .querySelector(".nav-arrow:last-child")
    .addEventListener("click", () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      refreshUI();
    });

  return calCard;
}

function getMilestonesForPolicy(currentCount, policy) {
  let milestones = [0, ...(policy.milestones || [])];

  const lastExplicit = policy.milestones ? Math.max(...policy.milestones) : 0;
  if (policy.recurringMilestoneInterval) {
    let nextRecur = lastExplicit + policy.recurringMilestoneInterval;
    while (nextRecur <= currentCount + policy.recurringMilestoneInterval) {
      milestones.push(nextRecur);
      nextRecur += policy.recurringMilestoneInterval;
    }
  }

  const nextGoalIdx = milestones.findIndex((m) => m > currentCount);
  const startIndex = Math.max(0, nextGoalIdx - 3);
  return milestones.slice(startIndex, nextGoalIdx + 1);
}

function renderGoalCard(count) {
  const goalCard = cloneTemplate("tpl-goal-card");
  const policy = getPolicyForSubject(primarySubject);
  goalCard.querySelector(".streak-association").textContent = primarySubject;

  const visualContainer = goalCard.querySelector(".goal-visual-container");
  const milestones = getMilestonesForPolicy(count, policy);
  const nextGoal = milestones[milestones.length - 1];

  milestones.forEach((m, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "goal-checkpoint-wrap";

    const node = document.createElement("div");
    node.className = "goal-checkpoint";
    if (m === nextGoal) node.classList.add("is-goal");
    if (count >= m) {
      node.classList.add("reached");
      node.innerHTML = '<span class="material-symbols-outlined">check</span>';
    } else {
      node.textContent = m;
    }
    wrap.appendChild(node);

    if (m !== nextGoal) {
      const label = document.createElement("div");
      label.className = "goal-checkpoint-label";
      label.textContent = m;
      wrap.appendChild(label);
    }

    visualContainer.appendChild(wrap);

    if (idx < milestones.length - 1) {
      const nextM = milestones[idx + 1];
      const segment = document.createElement("div");
      segment.className = "goal-segment";

      const fill = document.createElement("div");
      fill.className = "goal-segment-fill";

      let progress = 0;
      if (count >= nextM) {
        progress = 100;
      } else if (count > m) {
        progress = ((count - m) / (nextM - m)) * 100;
      }
      fill.style.setProperty("--progress", `${progress}%`);

      segment.appendChild(fill);
      visualContainer.appendChild(segment);
    }
  });

  goalCard.querySelector(".goal-text").textContent =
    `${count} / ${nextGoal} days`;
  return goalCard;
}

function renderStreakCards(countOverride = null) {
  const fragment = document.createDocumentFragment();

  const primaryCheckins = MOCK_CHECKINS.filter(
    (c) => c.subject === primarySubject,
  );
  const latestCheckin = primaryCheckins.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )[0];
  const count =
    countOverride !== null
      ? countOverride
      : latestCheckin
        ? latestCheckin.streakSequence
        : 0;

  const variantClasses = getVariantClasses(count);

  const fancyCard = cloneTemplate("tpl-fancy-streak-card");
  const display = fancyCard.querySelector(".star-display");
  const displayCount = Math.min(count, 100);
  display.className = `star-display ${variantClasses.join(" ")} count-${count}`;
  display.style.setProperty("--count", displayCount);
  for (let i = 0; i < displayCount; i++) {
    display.appendChild(createStar(i));
  }
  fancyCard.querySelector(".streak-association").textContent = primarySubject;
  fancyCard.querySelector(".streak-title").textContent = `${count} day streak!`;
  fragment.appendChild(fancyCard);

  const freezeCard = cloneTemplate("tpl-freeze-card");
  freezeCard.querySelector(".freeze-count-text").textContent =
    "You only have 1/2 Streak Freezes!";
  fragment.appendChild(freezeCard);

  fragment.appendChild(renderCalendarCard());

  const multiCard = cloneTemplate("tpl-multi-streak-card");
  const multiGrid = multiCard.querySelector(".multi-streak-grid");
  const monthLabelsEl = multiCard.querySelector(".month-labels");
  const dayLabelsEl = multiCard.querySelector(".day-labels");

  const windowStart = new Date("2026-02-21T12:00:00Z");
  const windowColCount = 8;
  multiCard.style.setProperty("--grid-cols", windowColCount);

  const months = [];
  let curM = "";
  let currentSpan = 0;
  const windowDaysNum = [];

  for (let i = 0; i < windowColCount; i++) {
    const d = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
    windowDaysNum.push(d.getUTCDate());
    const dayName = d
      .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
      .substring(0, 2);
    const daySpan = document.createElement("span");
    daySpan.textContent = dayName;
    dayLabelsEl.appendChild(daySpan);

    const mName = d.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    if (mName !== curM) {
      if (curM !== "") months.push({ name: curM, span: currentSpan });
      curM = mName;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
  }
  months.push({ name: curM, span: currentSpan });
  months.forEach((m) => {
    const mSpan = document.createElement("div");
    mSpan.className = "month-label";
    mSpan.style.setProperty("--span", m.span);
    mSpan.textContent = m.name;
    monthLabelsEl.appendChild(mSpan);
  });

  const subjects = [...new Set(MOCK_CHECKINS.map((c) => c.subject))];
  subjects.forEach((sub) => {
    const subCheckins = MOCK_CHECKINS.filter((c) => c.subject === sub);
    const subLatest = subCheckins.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];
    const { activeIndices, frozenIndices } = getGridDataForRange(
      MOCK_CHECKINS,
      sub,
      "2026-02-21",
      "2026-02-28",
    );
    multiGrid.appendChild(
      renderStreakRow(
        sub,
        windowDaysNum,
        activeIndices,
        frozenIndices,
        subLatest ? subLatest.streakSequence : 0,
      ),
    );
  });
  fragment.appendChild(multiCard);

  fragment.appendChild(renderGoalCard(count));

  return fragment;
}

function getVariantClasses(count) {
  if (count === 1) return ["single"];
  if (count === 2) return ["double"];
  const classes = [];
  if (count > 5) classes.push("over-five");
  if (count <= 10) classes.push("circle");
  else classes.push("confetti-blaster");
  return classes;
}

function celebrateGoal(count) {
  const policy = getPolicyForSubject(primarySubject);
  if (isMilestone(count, policy) && count > lastCelebratedCount) {
    jsConfetti.addConfetti({
      confettiColors: [
        "#fb923c",
        "#f97316", // Oranges
        "#38bdf8",
        "#0ea5e9", // Blues
        "#ffffff", // White for sparkle
      ],
      confettiNumber: 100,
    });
    lastCelebratedCount = count;
  }
}

function refreshUI() {
  const cardContainer = document.querySelector(".card-container");
  if (!cardContainer) return;
  const inputEl = document.querySelector("input");

  const overrideCount = inputEl ? parseInt(inputEl.value) : 0;

  cardContainer.innerHTML = "";
  cardContainer.appendChild(renderStreakCards(overrideCount));

  if (overrideCount > 0) {
    celebrateGoal(overrideCount);
  }
}

if (typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    const inputEl = document.querySelector("input");
    if (inputEl) {
      const primaryCheckins = MOCK_CHECKINS.filter(
        (c) => c.subject === primarySubject,
      );
      const latestCheckin = primaryCheckins.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )[0];
      const latestSequence = latestCheckin ? latestCheckin.streakSequence : 0;
      inputEl.value = latestSequence;
    }

    refreshUI();

    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const isLight =
          document.documentElement.classList.contains("force-light-mode");
        const isDark =
          document.documentElement.classList.contains("force-dark-mode");
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        document.documentElement.classList.remove(
          "force-light-mode",
          "force-dark-mode",
        );
        if (isLight) document.documentElement.classList.add("force-dark-mode");
        else if (isDark)
          document.documentElement.classList.add("force-light-mode");
        else if (prefersDark)
          document.documentElement.classList.add("force-light-mode");
        else document.documentElement.classList.add("force-dark-mode");
      });
    }

    if (inputEl) {
      inputEl.addEventListener("input", refreshUI);
    }
  });
}
