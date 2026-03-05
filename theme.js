/**
 * Shared theme management logic for Starrysky.
 */

function updateTheme() {
  const isLight =
    document.documentElement.classList.contains("force-light-mode");
  const isDark = document.documentElement.classList.contains("force-dark-mode");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  document.documentElement.classList.remove(
    "force-light-mode",
    "force-dark-mode",
  );

  if (isLight) {
    document.documentElement.classList.add("force-dark-mode");
    localStorage.setItem("theme", "dark");
  } else if (isDark) {
    document.documentElement.classList.add("force-light-mode");
    localStorage.setItem("theme", "light");
  } else if (prefersDark) {
    document.documentElement.classList.add("force-light-mode");
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.classList.add("force-dark-mode");
    localStorage.setItem("theme", "dark");
  }
}

function applyStoredTheme() {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light") {
    document.documentElement.classList.add("force-light-mode");
  } else if (storedTheme === "dark") {
    document.documentElement.classList.add("force-dark-mode");
  }
}

// Initial application to prevent flash
applyStoredTheme();

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.querySelector(".theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", updateTheme);
  }
});
