import i18next from "i18next";
export async function initI18n(lng = "en") {
  let translation;
  if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
  ) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    let filePath = path.resolve("locales", lng, "translation.json");
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve("..", "locales", lng, "translation.json");
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.resolve("labeler", "locales", lng, "translation.json");
    }
    translation = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else if (
    typeof window !== "undefined" &&
    typeof window.fetch === "function"
  ) {
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
