function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true).firstElementChild;
}

function createStar(index) {
  const star = cloneTemplate("tpl-star");
  star.style.setProperty("--index", index);
  star.style.setProperty("--delay-multiplier", 0.01 * index);
  return star;
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

  // Logic to find continuous segments of active/frozen days for pills
  const elements = [];
  const allMarked = [...activeDays, ...freezeDays].sort((a, b) => a - b);

  if (allMarked.length > 0) {
    let start = allMarked[0];
    let end = allMarked[0];
    let isCurrentFrozen = freezeDays.includes(start);

    for (let i = 1; i <= allMarked.length; i++) {
      const current = allMarked[i];
      const isNextFrozen = freezeDays.includes(current);

      if (
        i < allMarked.length &&
        current === end + 1 &&
        isNextFrozen === isCurrentFrozen
      ) {
        end = current;
      } else {
        // End of a segment
        const left = (start / cols) * 100;
        const width = ((end - start + 1) / cols) * 100;

        const pill = cloneTemplate("tpl-streak-pill");
        if (isCurrentFrozen) pill.classList.add("frozen");
        pill.style.left = `${left}%`;
        pill.style.width = `${width}%`;
        elements.push(pill);

        if (isCurrentFrozen) {
          const icon = cloneTemplate("tpl-freeze-icon");
          const centerLeft = ((start + (end - start) / 2 + 0.5) / cols) * 100;
          icon.style.left = `${centerLeft}%`;
          elements.push(icon);
        }

        if (i < allMarked.length) {
          start = current;
          end = current;
          isCurrentFrozen = isNextFrozen;
        }
      }
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
    renderStreakGrid(days, activeDays, freezeDays, 8),
    row.querySelector(".streak-total"),
  );
  return row;
}

function renderStreakCards(count) {
  const fragment = document.createDocumentFragment();
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
  fancyCard.querySelector(".streak-association").textContent = "Wordle";
  fancyCard.querySelector(".streak-title").textContent = `${count} day streak!`;
  fragment.appendChild(fancyCard);

  // 2. Freeze Card
  const freezeCard = cloneTemplate("tpl-freeze-card");
  freezeCard.querySelector(".freeze-count-text").textContent =
    "You only have 1/2 Streak Freezes!";
  fragment.appendChild(freezeCard);

  // 3. Calendar Card
  const calCard = cloneTemplate("tpl-calendar-card");
  calCard.querySelector(".calendar-month-title").textContent = "February 2026";
  const calWeeks = calCard.querySelector(".calendar-weeks");
  const calDays = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28,
  ];
  const calActive = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21, 22,
    24, 25, 26, 27,
  ];
  const calFrozen = [15, 16, 23];

  for (let i = 0; i < calDays.length; i += 7) {
    const weekDays = calDays.slice(i, i + 7);
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
  multiGrid.appendChild(
    renderStreakRow(
      "Wordle",
      [31, 1, 2, 3, 4, 5, 6, 7],
      [0, 1, 2, 4, 5, 6, 7],
      [3],
      500,
    ),
  );
  multiGrid.appendChild(
    renderStreakRow(
      "Tiled Words",
      [31, 1, 2, 3, 4, 5, 6, 7],
      [1, 2, 3, 5, 6, 7],
      [4],
      6,
    ),
  );
  multiGrid.appendChild(
    renderStreakRow(
      "Connections",
      [31, 1, 2, 3, 4, 5, 6, 7],
      [1, 2, 4, 5, 6, 7],
      [],
      4,
    ),
  );
  multiGrid.appendChild(
    renderStreakRow(
      "Crossword",
      [31, 1, 2, 3, 4, 5, 6, 7],
      [1, 3, 5, 7],
      [2, 4, 6],
      4,
    ),
  );
  fragment.appendChild(multiCard);

  // 5. Goal Card
  const goalCard = cloneTemplate("tpl-goal-card");
  goalCard.querySelector(".progress-fill").style.width = "75%";
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

window.addEventListener("DOMContentLoaded", (event) => {
  const cardContainer = document.querySelector(".card-container");
  cardContainer.innerHTML = "";
  cardContainer.appendChild(renderStreakCards(1));

  document.querySelector(".theme-toggle").addEventListener("click", () => {
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
    else if (isDark) document.documentElement.classList.add("force-light-mode");
    else if (prefersDark)
      document.documentElement.classList.add("force-light-mode");
    else document.documentElement.classList.add("force-dark-mode");
  });

  document.querySelector("input").addEventListener("input", (e) => {
    cardContainer.innerHTML = "";
    cardContainer.appendChild(renderStreakCards(parseInt(e.target.value) || 0));
  });
});
