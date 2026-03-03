// Mock Data Structure based on app.starrysky.streak.checkin lexicon
const MOCK_CHECKINS = [
  // Wordle Streak
  { subject: "Wordle", createdAt: "2026-02-01T12:00:00Z", sequence: 480, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-02T12:00:00Z", sequence: 481, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-03T12:00:00Z", sequence: 482, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-04T12:00:00Z", sequence: 483, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-05T12:00:00Z", sequence: 484, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-06T12:00:00Z", sequence: 485, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-07T12:00:00Z", sequence: 486, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-08T12:00:00Z", sequence: 487, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-09T12:00:00Z", sequence: 488, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-10T12:00:00Z", sequence: 489, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-11T12:00:00Z", sequence: 490, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-12T12:00:00Z", sequence: 491, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-13T12:00:00Z", sequence: 492, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-14T12:00:00Z", sequence: 493, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-15T12:00:00Z", sequence: 494, freezesClaimed: 0 },
  // Gap on 16, 17 - bridged by freezes in the 18th checkin
  { subject: "Wordle", createdAt: "2026-02-18T12:00:00Z", sequence: 497, freezesClaimed: 2 },
  { subject: "Wordle", createdAt: "2026-02-19T12:00:00Z", sequence: 498, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-20T12:00:00Z", sequence: 499, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-21T12:00:00Z", sequence: 500, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-22T12:00:00Z", sequence: 501, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-23T12:00:00Z", sequence: 502, freezesClaimed: 0 },
  // Gap on 24 - bridged by freeze in the 25th checkin
  { subject: "Wordle", createdAt: "2026-02-25T12:00:00Z", sequence: 504, freezesClaimed: 1 },
  { subject: "Wordle", createdAt: "2026-02-26T12:00:00Z", sequence: 505, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-27T12:00:00Z", sequence: 506, freezesClaimed: 0 },
  { subject: "Wordle", createdAt: "2026-02-28T12:00:00Z", sequence: 507, freezesClaimed: 0 },

  // Tiled Words
  { subject: "Tiled Words", createdAt: "2026-02-22T12:00:00Z", sequence: 1, freezesClaimed: 0 },
  { subject: "Tiled Words", createdAt: "2026-02-23T12:00:00Z", sequence: 2, freezesClaimed: 0 },
  { subject: "Tiled Words", createdAt: "2026-02-24T12:00:00Z", sequence: 3, freezesClaimed: 0 },
  // Gap on 25 - bridged by 1 freeze
  { subject: "Tiled Words", createdAt: "2026-02-26T12:00:00Z", sequence: 5, freezesClaimed: 1 },
  { subject: "Tiled Words", createdAt: "2026-02-27T12:00:00Z", sequence: 6, freezesClaimed: 0 },
  { subject: "Tiled Words", createdAt: "2026-02-28T12:00:00Z", sequence: 7, freezesClaimed: 0 },

  // Connections
  { subject: "Connections", createdAt: "2026-02-22T12:00:00Z", sequence: 1, freezesClaimed: 0 },
  { subject: "Connections", createdAt: "2026-02-23T12:00:00Z", sequence: 2, freezesClaimed: 0 },
  { subject: "Connections", createdAt: "2026-02-25T12:00:00Z", sequence: 4, freezesClaimed: 1 },
  { subject: "Connections", createdAt: "2026-02-26T12:00:00Z", sequence: 5, freezesClaimed: 0 },
  { subject: "Connections", createdAt: "2026-02-27T12:00:00Z", sequence: 6, freezesClaimed: 0 },
  { subject: "Connections", createdAt: "2026-02-28T12:00:00Z", sequence: 7, freezesClaimed: 0 },

  // Crossword
  { subject: "Crossword", createdAt: "2026-02-21T12:00:00Z", sequence: 1, freezesClaimed: 0 },
  { subject: "Crossword", createdAt: "2026-02-23T12:00:00Z", sequence: 3, freezesClaimed: 1 },
  { subject: "Crossword", createdAt: "2026-02-25T12:00:00Z", sequence: 5, freezesClaimed: 1 },
  { subject: "Crossword", createdAt: "2026-02-27T12:00:00Z", sequence: 7, freezesClaimed: 1 },
];

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

function createStar(index) {
  const star = cloneTemplate("tpl-star");
  star.style.setProperty("--index", index);
  star.style.setProperty("--delay-multiplier", 0.01 * index);
  return star;
}

/**
 * Processes checkin records to extract grid indices for a specific date range.
 * Strictly uses UTC to avoid timezone-related day shifts.
 */
function getGridDataForRange(checkins, subject, startDateStr, endDateStr) {
  const activeIndices = [];
  const frozenIndices = [];
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Normalize range to UTC midnights
  const start = new Date(startDateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setUTCHours(0, 0, 0, 0);

  const relevantCheckins = checkins.filter(c => c.subject === subject);
  const dayMap = new Map(); // timestamp -> 'active' | 'frozen'

  relevantCheckins.forEach(c => {
    const checkinDate = new Date(c.createdAt);
    checkinDate.setUTCHours(0, 0, 0, 0);
    const ts = checkinDate.getTime();
    
    if (ts >= start.getTime() && ts <= end.getTime()) {
      dayMap.set(ts, 'active');
    }
    
    // If there were freezes, mark preceding days
    if (c.freezesClaimed > 0) {
      for (let i = 1; i <= c.freezesClaimed; i++) {
        const frozenTs = ts - i * dayMs;
        if (frozenTs >= start.getTime() && frozenTs <= end.getTime()) {
          // Don't overwrite an active day with a frozen mark
          if (dayMap.get(frozenTs) !== 'active') {
            dayMap.set(frozenTs, 'frozen');
          }
        }
      }
    }
  });

  // Convert map to indices based on the range
  let currTs = start.getTime();
  let idx = 0;
  while (currTs <= end.getTime()) {
    const status = dayMap.get(currTs);
    if (status === 'active') activeIndices.push(idx);
    else if (status === 'frozen') frozenIndices.push(idx);
    
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
    const isPrevMonth = day > 20 && index < 2;

    if (isActive) cell.classList.add("active");
    if (isFrozen) {
      cell.classList.add("frozen");
      cell.appendChild(cloneTemplate("tpl-freeze-icon"));
    }
    if (isPrevMonth) cell.classList.add("prev-month");

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
      while (j < allMarked.length && 
             allMarked[j] === endIdx + 1 && 
             freezeDays.includes(allMarked[j]) === isCurrentFrozen) {
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
        const centerLeft = ((startIdx + (endIdx - startIdx) / 2 + 0.5) / cols) * 100;
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

function getDaysInMonth(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const days = [];
  while (date.getUTCMonth() === month) {
    days.push(date.getUTCDate());
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

function renderStreakCards(countOverride = null) {
  const fragment = document.createDocumentFragment();
  
  const primarySubject = "Wordle";
  const primaryCheckins = MOCK_CHECKINS.filter(c => c.subject === primarySubject);
  const latestCheckin = primaryCheckins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const count = countOverride !== null ? countOverride : (latestCheckin ? latestCheckin.sequence : 0);
  
  const variantClasses = getVariantClasses(count);

  // 1. Fancy Streak Card
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

  // 2. Freeze Card
  const freezeCard = cloneTemplate("tpl-freeze-card");
  freezeCard.querySelector(".freeze-count-text").textContent =
    "You only have 1/2 Streak Freezes!";
  fragment.appendChild(freezeCard);

  // 3. Calendar Card (February 2026)
  const calCard = cloneTemplate("tpl-calendar-card");
  calCard.querySelector(".calendar-month-title").textContent = "February 2026";
  const calWeeks = calCard.querySelector(".calendar-weeks");
  
  const febDays = getDaysInMonth(2026, 1); 
  const { activeIndices: calActive, frozenIndices: calFrozen } = getGridDataForRange(
    MOCK_CHECKINS, 
    primarySubject, 
    "2026-02-01", 
    "2026-02-28"
  );

  for (let i = 0; i < febDays.length; i += 7) {
    const weekDays = febDays.slice(i, i + 7);
    const weekActive = calActive
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);
    const weekFrozen = calFrozen
      .filter((idx) => idx >= i && idx < i + 7)
      .map((idx) => idx - i);
    calWeeks.appendChild(renderStreakGrid(weekDays, weekActive, weekFrozen, 7));
  }
  fragment.appendChild(calCard);

  // 4. Multi-streak Card
  const multiCard = cloneTemplate("tpl-multi-streak-card");
  const multiGrid = multiCard.querySelector(".multi-streak-grid");
  const monthLabelsEl = multiCard.querySelector(".month-labels");
  const dayLabelsEl = multiCard.querySelector(".day-labels");
  
  const windowStart = new Date("2026-02-21T12:00:00Z");
  const windowEnd = new Date("2026-02-28T12:00:00Z");
  const windowDaysNum = [];
  const windowColCount = 8;
  
  multiCard.style.setProperty("--grid-cols", windowColCount);
  
  const months = []; // { name, span }
  let currentMonth = "";
  let currentSpan = 0;

  for (let i = 0; i < windowColCount; i++) {
    const d = new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000);
    windowDaysNum.push(d.getUTCDate());
    
    // Day labels
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).substring(0, 2);
    const daySpan = document.createElement("span");
    daySpan.textContent = dayName;
    dayLabelsEl.appendChild(daySpan);
    
    // Month labels logic
    const monthName = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    if (monthName !== currentMonth) {
      if (currentMonth !== "") {
        months.push({ name: currentMonth, span: currentSpan });
      }
      currentMonth = monthName;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
  }
  months.push({ name: currentMonth, span: currentSpan });
  
  months.forEach(m => {
    const mSpan = document.createElement("div");
    mSpan.className = "month-label";
    mSpan.style.setProperty("--span", m.span);
    mSpan.textContent = m.name;
    monthLabelsEl.appendChild(mSpan);
  });

  const subjects = [...new Set(MOCK_CHECKINS.map(c => c.subject))];
  subjects.forEach(sub => {
    const subCheckins = MOCK_CHECKINS.filter(c => c.subject === sub);
    const subLatest = subCheckins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const { activeIndices, frozenIndices } = getGridDataForRange(MOCK_CHECKINS, sub, "2026-02-21", "2026-02-28");
    
    multiGrid.appendChild(
      renderStreakRow(
        sub,
        windowDaysNum,
        activeIndices,
        frozenIndices,
        subLatest ? subLatest.sequence : 0
      )
    );
  });
  
  fragment.appendChild(multiCard);

  // 5. Goal Card
  const goalCard = cloneTemplate("tpl-goal-card");
  goalCard.querySelector(".progress-fill").style.width = `${Math.min((count / 300) * 100, 100)}%`;
  goalCard.querySelector(".goal-badge").textContent = "300";
  goalCard.querySelector(".goal-text").textContent = `${count}/300 days`;
  fragment.appendChild(goalCard);

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

if (typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", (event) => {
    const cardContainer = document.querySelector(".card-container");
    if (!cardContainer) return;
    
    cardContainer.innerHTML = "";
    cardContainer.appendChild(renderStreakCards());

    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const isLight = document.documentElement.classList.contains("force-light-mode");
        const isDark = document.documentElement.classList.contains("force-dark-mode");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.remove("force-light-mode", "force-dark-mode");
        if (isLight) document.documentElement.classList.add("force-dark-mode");
        else if (isDark) document.documentElement.classList.add("force-light-mode");
        else if (prefersDark) document.documentElement.classList.add("force-light-mode");
        else document.documentElement.classList.add("force-dark-mode");
      });
    }

    const inputEl = document.querySelector("input");
    if (inputEl) {
      inputEl.addEventListener("input", (e) => {
        cardContainer.innerHTML = "";
        cardContainer.appendChild(renderStreakCards(parseInt(e.target.value) || 0));
      });
    }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getGridDataForRange, getDaysInMonth };
}
