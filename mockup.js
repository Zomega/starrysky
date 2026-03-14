console.log("mockup.js loading...");
import i18next, { initI18n } from "./labeler/src/i18n.js";
import {
  isMilestone,
  getGridDataForRange,
  getDaysInMonth,
  getMilestonesForPolicy,
} from "./labeler/src/streak-logic.js";
import {
  MOCK_POLICIES,
  MOCK_CHECKINS,
  MOCK_INVENTORY,
} from "./labeler/src/mock-data.js";

// Handle JSConfetti conditionally for Node test environments
let JSConfetti;
if (typeof window !== "undefined") {
  try {
    const module = await import("js-confetti");
    JSConfetti = module.default;
  } catch (e) {
    console.warn("Failed to load JSConfetti from CDN, using mock.");
    JSConfetti = class {
      addConfetti() {}
    };
  }
} else {
  JSConfetti = class {
    addConfetti() {}
  };
}

const jsConfetti = new JSConfetti();
let lastCelebratedCount = -1;
let lastRenderedColCount = -1;

function getPolicyForSubject(subject) {
  const policy = MOCK_POLICIES[subject];
  if (!policy) {
    throw new Error(i18next.t("error.no_policy", { subject }));
  }
  return policy;
}

const subjects = [...new Set(MOCK_CHECKINS.map((c) => c.subject))];

if (subjects.length === 0) {
  throw new Error(i18next.t("error.no_subjects"));
}

let primarySubject = subjects[0];
let currentYear = 2026;
let currentMonth = 1; // February

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  if (!tpl) throw new Error(i18next.t("error.template_not_found", { id }));
  return tpl.content.cloneNode(true).firstElementChild;
}

function createStar(index) {
  const star = cloneTemplate("tpl-star");
  star.style.setProperty("--index", index);
  star.style.setProperty("--delay-multiplier", 0.01 * index);
  return star;
}

/**
 * Renders the background pill elements for a streak grid.
 */
function renderStreakBackgroundPills(
  allMarked,
  brokenDays,
  cols,
  templateId = "tpl-streak-pill-bg",
) {
  const elements = [];
  if (allMarked.length === 0) return elements;

  let rStartIdx = 0;
  while (rStartIdx < allMarked.length) {
    let rEndIdx = rStartIdx;
    while (
      rEndIdx + 1 < allMarked.length &&
      allMarked[rEndIdx + 1] === allMarked[rEndIdx] + 1 &&
      !brokenDays.includes(allMarked[rEndIdx])
    ) {
      rEndIdx++;
    }

    const startValue = allMarked[rStartIdx];
    const endValue = allMarked[rEndIdx];
    const left = (startValue / cols) * 100;
    const width = ((endValue - startValue + 1) / cols) * 100;

    const bgPill = cloneTemplate(templateId);
    bgPill.style.left = `${left}%`;
    bgPill.style.width = `${width}%`;
    elements.push(bgPill);

    rStartIdx = rEndIdx + 1;
  }
  return elements;
}

/**
 * Renders the foreground pill elements (active, frozen, broken) for a streak grid.
 */
function renderStreakForegroundPills(
  activeDays,
  freezeDays,
  brokenDays,
  cols,
  templateId = "tpl-streak-pill",
) {
  const elements = [];
  const foregroundMarked = [...activeDays, ...freezeDays, ...brokenDays].sort(
    (a, b) => a - b,
  );
  if (foregroundMarked.length === 0) return elements;

  let i = 0;
  while (i < foregroundMarked.length) {
    let startIdx = i;
    let endIdx = i;
    let type = activeDays.includes(foregroundMarked[i])
      ? "active"
      : freezeDays.includes(foregroundMarked[i])
        ? "frozen"
        : "broken";

    while (
      endIdx + 1 < foregroundMarked.length &&
      foregroundMarked[endIdx + 1] === foregroundMarked[endIdx] + 1 &&
      ((type === "active" &&
        activeDays.includes(foregroundMarked[endIdx + 1])) ||
        (type === "frozen" &&
          freezeDays.includes(foregroundMarked[endIdx + 1])) ||
        (type === "broken" && brokenDays.includes(foregroundMarked[endIdx + 1])))
    ) {
      endIdx++;
    }

    const startValue = foregroundMarked[startIdx];
    const endValue = foregroundMarked[endIdx];
    const left = (startValue / cols) * 100;
    const width = ((endValue - startValue + 1) / cols) * 100;

    const pill = cloneTemplate(templateId);
    if (type === "frozen") pill.classList.add("frozen");
    if (type === "broken") pill.classList.add("broken");

    pill.style.left = `${left}%`;
    pill.style.width = `${width}%`;
    elements.push(pill);

    if (type === "frozen" || type === "broken") {
      for (let k = startValue; k <= endValue; k++) {
        const icon = cloneTemplate(
          type === "frozen" ? "tpl-freeze-icon" : "tpl-broken-icon",
        );
        const centerLeft = ((k + 0.5) / cols) * 100;
        icon.style.left = `${centerLeft}%`;
        elements.push(icon);
      }
    }

    i = endIdx + 1;
  }
  return elements;
}

function renderStreakGrid(
  days,
  activeDays,
  freezeDays,
  graceDays = [],
  brokenDays = [],
  perfectWeekIndices = [],
  customIconMap = new Map(),
  cols = 8,
) {
  const container = cloneTemplate("tpl-streak-grid");
  container.style.setProperty("--grid-cols", cols);

  days.forEach((day, index) => {
    const cell = cloneTemplate("tpl-day-cell");
    const isActive = activeDays.includes(index);
    const isFrozen = freezeDays.includes(index);
    const isBroken = brokenDays.includes(index);

    if (isActive) cell.classList.add("active");
    if (isFrozen) {
      cell.classList.add("frozen");
      cell.appendChild(cloneTemplate("tpl-freeze-icon"));
    }
    if (isBroken) {
      cell.classList.add("broken");
      cell.appendChild(cloneTemplate("tpl-broken-icon"));
    }

    cell.textContent = day;
    container.appendChild(cell);
  });

  const allMarked = [
    ...activeDays,
    ...freezeDays,
    ...graceDays,
    ...brokenDays,
  ].sort((a, b) => a - b);

  const backgroundPills = renderStreakBackgroundPills(
    allMarked,
    brokenDays,
    cols,
  );
  const foregroundPills = renderStreakForegroundPills(
    activeDays,
    freezeDays,
    brokenDays,
    cols,
  );

  const elements = [...backgroundPills, ...foregroundPills];

  // Add achievement diamonds in the middle of their day
  perfectWeekIndices.forEach((idx) => {
    const icon = cloneTemplate("tpl-achievement-icon");
    const centerLeft = ((idx + 0.5) / cols) * 100;
    icon.style.left = `${centerLeft}%`;
    elements.push(icon);
  });

  // Add custom check-in icons (only the first one for now)
  customIconMap.forEach((icons, idx) => {
    if (icons && icons.length > 0) {
      const iconName = icons[0];
      const iconEl = cloneTemplate("tpl-checkin-custom-icon");
      iconEl.textContent = iconName;
      const centerLeft = ((idx + 0.5) / cols) * 100;
      iconEl.style.left = `${centerLeft}%`;
      elements.push(iconEl);
    }
  });

  elements.reverse().forEach((el) => container.prepend(el));
  return container;
}

function renderStreakRow(
  name,
  days,
  activeDays,
  freezeDays = [],
  graceDays = [],
  brokenDays = [],
  perfectWeekIndices = [],
  customIconMap = new Map(),
  totalStreak = 0,
) {
  const row = cloneTemplate("tpl-streak-row");
  row.querySelector(".streak-name").textContent = name;
  row.querySelector(".streak-total").textContent = `${totalStreak}d`;
  row.insertBefore(
    renderStreakGrid(
      days,
      activeDays,
      freezeDays,
      graceDays,
      brokenDays,
      perfectWeekIndices,
      customIconMap,
      days.length,
    ),
    row.querySelector(".streak-total"),
  );
  return row;
}

function renderCalendarCard() {
  const calCard = cloneTemplate("tpl-calendar-card");
  calCard.querySelector(".streak-association").textContent = primarySubject;
  calCard.querySelector("h2:not(.streak-association)").textContent =
    i18next.t("ui.streak_calendar");

  const monthName = new Date(
    Date.UTC(currentYear, currentMonth, 1),
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  calCard.querySelector(".calendar-month-title").textContent = monthName;

  const daysHeader = calCard.querySelector(".calendar-days-header");
  daysHeader.innerHTML = "";
  ["su", "mo", "tu", "we", "th", "fr", "sa"].forEach((d) => {
    const span = document.createElement("span");
    span.textContent = i18next.t(`calendar.days.${d}`);
    daysHeader.appendChild(span);
  });

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

  const {
    activeIndices,
    frozenIndices,
    graceIndices,
    brokenIndices,
    perfectWeekIndices,
    customIconMap,
  } = getGridDataForRange(
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
    const weekBroken = brokenIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);
    const weekPerfect = perfectWeekIndices
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);

    const weekCustomIcons = new Map();
    customIconMap.forEach((icons, idx) => {
      if (idx >= i && idx < i + 7) {
        weekCustomIcons.set(idx - i, icons);
      }
    });

    const grid = renderStreakGrid(
      weekDays,
      weekActive,
      weekFrozen,
      weekGrace,
      weekBroken,
      weekPerfect,
      weekCustomIcons,
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
  goalCard.querySelector("h2:not(.streak-association)").textContent =
    i18next.t("ui.streak_goal");

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

  goalCard.querySelector(".goal-text").textContent = i18next.t(
    "streak.goal_progress",
    { count, nextGoal },
  );
  return goalCard;
}

function getColCountForWidth(width) {
  const cols = Math.floor(width / 55);
  return Math.max(4, Math.min(cols, 14));
}

function renderMultiStreakCard(width) {
  const multiCard = cloneTemplate("tpl-multi-streak-card");
  multiCard.id = "multi-streak-card"; // Add ID for easier selection in tests
  multiCard.querySelector("h2").textContent = i18next.t("ui.multiple_streaks");
  const multiGrid = multiCard.querySelector(".multi-streak-grid");
  const monthLabelsEl = multiCard.querySelector(".month-labels");
  const dayLabelsEl = multiCard.querySelector(".day-labels");

  const windowColCount = getColCountForWidth(width);
  lastRenderedColCount = windowColCount;
  multiCard.style.setProperty("--grid-cols", windowColCount);

  const windowEnd = new Date("2026-02-28T12:00:00Z");
  const windowStartTs =
    windowEnd.getTime() - (windowColCount - 1) * 24 * 60 * 60 * 1000;
  const windowStart = new Date(windowStartTs);

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

  const uniqueSubjectsInMocks = [
    ...new Set(MOCK_CHECKINS.map((c) => c.subject)),
  ];
  uniqueSubjectsInMocks.forEach((sub) => {
    const subCheckins = MOCK_CHECKINS.filter((c) => c.subject === sub);
    const subLatest = subCheckins.sort(
      (a, b) => new Date(b.streakDate) - new Date(a.streakDate),
    )[0];

    const startStr = windowStart.toISOString().split("T")[0];
    const endStr = windowEnd.toISOString().split("T")[0];

    const {
      activeIndices,
      frozenIndices,
      graceIndices,
      brokenIndices,
      perfectWeekIndices,
      customIconMap,
    } = getGridDataForRange(MOCK_CHECKINS, sub, startStr, endStr);
    multiGrid.appendChild(
      renderStreakRow(
        sub,
        windowDaysNum,
        activeIndices,
        frozenIndices,
        graceIndices,
        brokenIndices,
        perfectWeekIndices,
        customIconMap,
        subLatest ? subLatest.streakSequence : 0,
      ),
    );
  });
  return multiCard;
}

/**
 * Creates and attaches the animation logic to a fancy card.
 * Exported separately to allow binding listeners in Node environments if needed.
 */
export function attachAnimationLogic(fancyCard, display, displayCount) {
  let isAnimating = false;
  const startAnimation = () => {
    if (isAnimating) return;
    isAnimating = true;
    fancyCard.style.cursor = "default";
    display.innerHTML = "";
    for (let i = 0; i < displayCount; i++) {
      const star = createStar(i);
      if (i === displayCount - 1) {
        const onAnimationEnd = (e) => {
          if (e.animationName.includes("star-move")) {
            isAnimating = false;
            fancyCard.style.cursor = "pointer";
            star.removeEventListener("animationend", onAnimationEnd);
          }
        };
        star.addEventListener("animationend", onAnimationEnd);
      }
      display.appendChild(star);
    }
    if (displayCount === 0) {
      isAnimating = false;
      fancyCard.style.cursor = "pointer";
    }
  };

  fancyCard.addEventListener("click", startAnimation);
  startAnimation();
  return startAnimation;
}

function renderFancyStreakCard(countOverride = null) {
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

  attachAnimationLogic(fancyCard, display, displayCount);

  fancyCard.querySelector(".streak-association").textContent = primarySubject;
  fancyCard.querySelector(".streak-title").textContent = i18next.t(
    "streak.count_display",
    { count },
  );
  fancyCard.querySelector("p").textContent = i18next.t("streak.come_back");
  return fancyCard;
}

function renderFreezeCard() {
  const policy = getPolicyForSubject(primarySubject);
  const inventory = MOCK_INVENTORY[primarySubject] || { balance: 0 };
  const freezeCard = cloneTemplate("tpl-freeze-card");
  freezeCard.querySelector(".freeze-count-text").textContent = i18next.t(
    "streak.inventory_balance",
    {
      balance: inventory.balance,
      max: policy.maxFreezes,
    },
  );
  freezeCard.querySelector("a").textContent = i18next.t("ui.get_more");
  return policy.maxFreezes > 0 ? freezeCard : null;
}

const multiCardObserver =
  typeof ResizeObserver !== "undefined"
    ? new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const newColCount = getColCountForWidth(width);
          if (newColCount !== lastRenderedColCount) {
            console.log(
              "Card width changed enough to require re-render:",
              newColCount,
            );
            const newCard = renderMultiStreakCard(width);
            entry.target.replaceWith(newCard);
            multiCardObserver.observe(newCard);
          }
        }
      })
    : null;

export function refreshUI(full = true) {
  const cardContainer = document.querySelector(".card-container");
  if (!cardContainer) return;
  const inputEl = document.querySelector("input");
  const overrideCount = inputEl ? parseInt(inputEl.value) : 0;

  const overrideLabel = document.querySelector(".controls-card label span");
  if (overrideLabel) overrideLabel.textContent = i18next.t("ui.override_label");

  if (full) {
    cardContainer.innerHTML = "";
    try {
      cardContainer.appendChild(renderFancyStreakCard(overrideCount));
      const fr = renderFreezeCard();
      if (fr) cardContainer.appendChild(fr);
      cardContainer.appendChild(renderCalendarCard());

      const initialWidth = cardContainer.offsetWidth || 500;
      const multi = renderMultiStreakCard(initialWidth);
      cardContainer.appendChild(multi);
      if (multiCardObserver) {
        multiCardObserver.disconnect();
        multiCardObserver.observe(multi);
      }

      cardContainer.appendChild(renderGoalCard(overrideCount));
      if (overrideCount > 0) celebrateGoal(overrideCount);
    } catch (e) {
      console.error("UI Render Error:", e);
      cardContainer.innerHTML = `<div class="card" style="border-color: var(--orange-500); color: var(--orange-500); padding: 2rem; font-weight: bold; text-align: center;">${i18next.t("error.render_failed", { message: e.message })}</div>`;
    }
  }
}

export function renderTabs() {
  const tabsContainer = document.getElementById("subject-tabs");
  if (!tabsContainer) return;
  tabsContainer.innerHTML = "";
  subjects.forEach((sub) => {
    const btn = document.createElement("button");
    btn.className = `tab-button ${sub === primarySubject ? "active" : ""}`;
    btn.textContent = sub;
    btn.addEventListener("click", (e) => {
      // Use currentTarget to ensure we always get the button even if nested elements exist
      const clickedSub = e.currentTarget.textContent;
      primarySubject = clickedSub;
      const subCheckins = MOCK_CHECKINS.filter(
        (c) => c.subject === primarySubject,
      );
      const subLatest = subCheckins.sort(
        (a, b) => new Date(b.streakDate) - new Date(a.streakDate),
      )[0];
      const inputEl = document.querySelector("input");
      if (inputEl && subLatest) inputEl.value = subLatest.streakSequence;
      lastCelebratedCount = -1;
      renderTabs();
      refreshUI(true);
    });
    tabsContainer.appendChild(btn);
  });
}

export function setPrimarySubject(sub) {
  primarySubject = sub;
}

export function getPrimarySubject() {
  return primarySubject;
}

// Export internal rendering functions for testing
export {
  renderStreakBackgroundPills,
  renderStreakForegroundPills,
  renderStreakGrid,
  renderStreakRow,
  renderCalendarCard,
  renderGoalCard,
  renderFancyStreakCard,
  renderMultiStreakCard,
  renderFreezeCard,
  getColCountForWidth,
  getVariantClasses,
};

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

if (typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded - Initializing Mockup");
    await initI18n();

    const inputEl = document.querySelector("input");
    if (inputEl) {
      const subCheckins = MOCK_CHECKINS.filter(
        (c) => c.subject === primarySubject,
      );
      const latestCheckin = subCheckins.sort(
        (a, b) => new Date(b.streakDate) - new Date(a.streakDate),
      )[0];
      inputEl.value = latestCheckin ? latestCheckin.streakSequence : 0;
    }
    renderTabs();
    refreshUI(true);
    if (inputEl) inputEl.addEventListener("input", () => refreshUI(true));
  });
}
console.log("mockup.js loaded.");
