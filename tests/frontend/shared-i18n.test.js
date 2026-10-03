// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { pathToFileURL } from "node:url";

const scriptUrl = pathToFileURL("/home/wsl/thermal_printer_playground/mtg_token_printer/shared-i18n.js").href;

async function loadScriptFresh() {
  await import(`${scriptUrl}?v=${Date.now()}-${Math.random()}`);
}

describe("shared-i18n", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("translates text and placeholder", async () => {
    await loadScriptFresh();

    document.body.innerHTML = `
      <select id="languageSelect">
        <option value="pt-BR">Português</option>
        <option value="en">English</option>
      </select>
      <p data-i18n="hello"></p>
      <input data-i18n-placeholder="searchPlaceholder" />
    `;

    const i18n = window.MTGI18n.create({
      messages: {
        "pt-BR": { hello: "Olá", searchPlaceholder: "Digite" },
        en: { hello: "Hello", searchPlaceholder: "Type" },
      },
      defaultLang: "pt-BR",
      storageKey: "mtg-lang",
      enablePlaceholders: true,
    });

    i18n.setupLanguageSelector();
    i18n.applyTranslations();

    expect(document.querySelector("[data-i18n='hello']")?.textContent).toBe("Olá");
    expect(document.querySelector("input")?.getAttribute("placeholder")).toBe("Digite");
  });

  it("persists language change and reapplies translations", async () => {
    await loadScriptFresh();

    document.body.innerHTML = `
      <select id="languageSelect">
        <option value="pt-BR">Português</option>
        <option value="en">English</option>
      </select>
      <span data-i18n="status"></span>
    `;

    const i18n = window.MTGI18n.create({
      messages: {
        "pt-BR": { status: "Pronto" },
        en: { status: "Ready" },
      },
      defaultLang: "pt-BR",
      storageKey: "mtg-lang",
    });

    i18n.setupLanguageSelector();
    i18n.applyTranslations();

    const select = document.getElementById("languageSelect");
    select.value = "en";
    select.dispatchEvent(new Event("change"));

    expect(localStorage.getItem("mtg-lang")).toBe("en");
    expect(document.querySelector("[data-i18n='status']")?.textContent).toBe("Ready");
  });
});
