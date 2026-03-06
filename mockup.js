import JSConfetti from "https://esm.sh/js-confetti@0.12.0";
import {
  isMilestone,
  getGridDataForRange,
  getDaysInMonth,
  getMilestonesForPolicy,
} from "./labeler/src/streak-logic.js";
import { MOCK_POLICIES, MOCK_CHECKINS } from "./labeler/src/mock-data.js";

const jsConfetti = new JSConfetti();
let lastCelebratedCount = -1;

function getPolicyForSubject(subject) {
  return MOCK_POLICIES[subject] || MOCK_POLICIES["Wordle"];
}

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

function renderStreakGrid(
  days,
  activeDays,
  freezeDays,
  graceDays = [],
  cols = 8,
) {
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
  const allMarked = [...activeDays, ...freezeDays, ...graceDays].sort(
    (a, b) => a - b,
  );

  if (allMarked.length > 0) {
    let rStartIdx = 0;
    while (rStartIdx < allMarked.length) {
      let rEndIdx = rStartIdx;
      while (
        rEndIdx + 1 < allMarked.length &&
        allMarked[rEndIdx + 1] === allMarked[rEndIdx] + 1
      ) {
        rEndIdx++;
      }

      const startValue = allMarked[rStartIdx];
      const endValue = allMarked[rEndIdx];
      const left = (startValue / cols) * 100;
      const width = ((endValue - startValue + 1) / cols) * 100;

      const bgPill = cloneTemplate("tpl-streak-pill-bg");
      bgPill.style.left = `${left}%`;
      bgPill.style.width = `${width}%`;
      elements.push(bgPill);

      rStartIdx = rEndIdx + 1;
    }

    const foregroundMarked = [...activeDays, ...freezeDays].sort(
      (a, b) => a - b,
    );
    let i = 0;
    while (i < foregroundMarked.length) {
      let startIdx = i;
      let endIdx = i;
      let isCurrentFrozen = freezeDays.includes(foregroundMarked[i]);

      while (
        endIdx + 1 < foregroundMarked.length &&
        foregroundMarked[endIdx + 1] === foregroundMarked[endIdx] + 1 &&
        freezeDays.includes(foregroundMarked[endIdx + 1]) === isCurrentFrozen
      ) {
        endIdx++;
      }

      const startValue = foregroundMarked[startIdx];
      const endValue = foregroundMarked[endIdx];
      const left = (startValue / cols) * 100;
      const width = ((endValue - startValue + 1) / cols) * 100;

      const pill = cloneTemplate("tpl-streak-pill");
      if (isCurrentFrozen) pill.classList.add("frozen");
      pill.style.left = `${left}%`;
      pill.style.width = `${width}%`;
      elements.push(pill);

      if (isCurrentFrozen) {
        const icon = cloneTemplate("tpl-freeze-icon");
        const centerLeft =
          ((startValue + (endValue - startValue) / 2 + 0.5) / cols) * 100;
        icon.style.left = `${centerLeft}%`;
        elements.push(icon);
      }

      i = endIdx + 1;
    }
  }

  elements.reverse().forEach((el) => container.prepend(el));
  return container;
}

function renderStreakRow(
  name,
  days,
  activeDays,
  freezeDays = [],
  graceDays = [],
  totalStreak = 0,
) {
  const row = cloneTemplate("tpl-streak-row");
  row.querySelector(".streak-name").textContent = name;
  row.querySelector(".streak-total").textContent = `${totalStreak}d`;
  row.insertBefore(
    renderStreakGrid(days, activeDays, freezeDays, graceDays, days.length),
    row.querySelector(".streak-total"),
  );
  return row;
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

  const { activeIndices, frozenIndices, graceIndices } = getGridDataForRange(
    MOCK_CHECKINS,
    primarySubject,
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0],
  );

  for (let i = 0; i < fullGridDays.length; i += 7) {
    const weekDays = fullGridDays.slice(i, i + 7);
    const weekActive = activeIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);
    const weekFrozen = frozenIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);
    const weekGrace = graceIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);

    const grid = renderStreakGrid(
      weekDays,
      weekActive,
      weekFrozen,
      weekGrace,
      7,
    );
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
    (a, b) => new Date(b.streakDate) - new Date(a.streakDate),
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
      (a, b) => new Date(b.streakDate) - new Date(a.streakDate),
    )[0];
    const { activeIndices, frozenIndices, graceIndices } = getGridDataForRange(
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
        graceIndices,
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
      confettiColors: ["#fb923c", "#f97316", "#38bdf8", "#0ea5e9", "#ffffff"],
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
        (a, b) => new Date(b.streakDate) - new Date(a.streakDate),
      )[0];
      const latestSequence = latestCheckin ? latestCheckin.streakSequence : 0;
      inputEl.value = latestSequence;
    }

    refreshUI();

    if (inputEl) {
      inputEl.addEventListener("input", refreshUI);
    }
  });
}
