import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { JSDOM } from "jsdom";

function loadHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  return new JSDOM(html).window.document;
}

function loadMomirWithScripts() {
  const html = fs.readFileSync("/home/wsl/thermal_printer_playground/mtg_token_printer/momir.html", "utf-8");
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://example.com",
    beforeParse(window) {
      const storage = {};
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key) => (key in storage ? storage[key] : null),
          setItem: (key, value) => {
            storage[key] = String(value);
          },
          removeItem: (key) => delete storage[key],
          clear: () => Object.keys(storage).forEach((key) => delete storage[key]),
        },
        configurable: true,
      });
      Object.defineProperty(window, "MTGI18n", {
        value: {
          create: () => ({
            t: (key) => key,
            applyTranslations: () => {},
            setupLanguageSelector: () => {},
          }),
        },
        configurable: true,
      });
      Object.defineProperty(window, "MTGCardNormalizer", {
        value: {
          normalizeMomirCard: (card) => ({
            imageUrl: "",
            name: card?.name || "Creature",
            typeLine: "Creature",
            manaValue: 0,
            colorsText: "Colorless",
            rulesText: "",
            scryfallUrl: "#",
          }),
        },
        configurable: true,
      });
      Object.defineProperty(window, "MTGPrint", {
        value: {
          resolveCardPrintEndpoint: () => "",
          launchThermerPrint: () => {},
        },
        configurable: true,
      });
    },
  });

  return dom.window.document;
}

describe("momir.html", () => {
  const document = loadHtml("/home/wsl/thermal_printer_playground/mtg_token_printer/momir.html");

  it("uses shared scripts and shared footer layout", () => {
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => s.getAttribute("src"));

    expect(scripts).toContain("shared-layout.js");
    expect(scripts).toContain("shared-print.js");
    expect(scripts).toContain("shared-i18n.js");
    expect(scripts).toContain("shared-card-normalizer.js");

    const footer = document.querySelector(".footer[data-shared-footer='true']");
    expect(footer).not.toBeNull();
    expect(footer?.getAttribute("data-product-name")).toBe("Momir Vig");
  });

  it("uses unified full-card preview image class", () => {
    const image = document.getElementById("creatureImage");
    expect(image).not.toBeNull();
    expect(image?.classList.contains("card-preview-image")).toBe(true);
    expect(image?.classList.contains("creature-image")).toBe(false);
  });

  it("includes the searchable set selector with bulk selection actions", () => {
    const searchInput = document.getElementById("momirSetSearch");
    const addBtn = document.getElementById("momirAddSetBtn");
    const selectAllBtn = document.getElementById("momirSelectAllSets");
    const clearBtn = document.getElementById("momirClearSets");
    const list = document.getElementById("momirSetSelectionList");
    const datalist = document.getElementById("momirSetSuggestions");

    expect(searchInput).not.toBeNull();
    expect(addBtn).not.toBeNull();
    expect(selectAllBtn).not.toBeNull();
    expect(clearBtn).not.toBeNull();
    expect(list).not.toBeNull();
    expect(datalist).not.toBeNull();
  });

  it("executes the Momir page scripts with mocked shared dependencies", () => {
    const documentWithScripts = loadMomirWithScripts();

    const cmcButtons = Array.from(documentWithScripts.querySelectorAll(".cmc-btn"));
    const generateBtn = documentWithScripts.getElementById("generateBtn");
    const summary = documentWithScripts.getElementById("activeFilters");

    expect(cmcButtons.length).toBeGreaterThan(0);
    expect(generateBtn).not.toBeNull();
    expect(summary).not.toBeNull();
    expect(summary?.textContent.trim()).toBe("Nenhum filtro ativo");
  });

  it("initializes a stable Momir state with CMC controls and empty summary", () => {
    const document = loadMomirWithScripts();

    const cmcButtons = Array.from(document.querySelectorAll(".cmc-btn"));
    const generateBtn = document.getElementById("generateBtn");
    const generateAndPrintBtn = document.getElementById("generateAndPrintBtn");
    const summary = document.getElementById("activeFilters");

    expect(cmcButtons.length).toBeGreaterThan(0);
    expect(cmcButtons[0].textContent.trim()).toBe("0");
    expect(generateBtn).not.toBeNull();
    expect(generateBtn?.disabled).toBe(true);
    expect(generateAndPrintBtn).not.toBeNull();
    expect(generateAndPrintBtn?.style.display).toBe("none");
    expect(summary?.textContent.trim()).toBe("Nenhum filtro ativo");
  });
});
