/**
 * Internationalization configuration using i18next.
 * Loads resources from external JSON files.
 */
import i18next from "i18next";

export async function initI18n(lng = "en") {
  let translation;

  // Prioritize Node.js filesystem check for tests and environments with 'fs'
  if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
  ) {
    // Node.js environment
    const fs = await import("node:fs");
    const path = await import("node:path");
    // Handle both root and labeler/src execution contexts for tests
    let filePath = path.resolve("locales", lng, "translation.json");
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve("..", "locales", lng, "translation.json");
    }
    // @ts-ignore
    if (!fs.existsSync(filePath)) {
      // Last resort fallback for certain test runners
      filePath = path.resolve("labeler", "locales", lng, "translation.json");
    }

    // @ts-ignore
    translation = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else if (
    typeof window !== "undefined" &&
    typeof window.fetch === "function"
  ) {
    // Browser environment
    const response = await fetch(`./locales/${lng}/translation.json`);
    translation = await response.json();
  } else {
    throw new Error("Unsupported environment for i18n initialization");
  }

  await i18next.init({
    lng,
    fallbackLng: "en",
    debug: false,
    resources: {
      [lng]: {
        translation,
      },
    },
  });

  return i18next;
}

export default i18next;
