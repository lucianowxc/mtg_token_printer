// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { pathToFileURL } from "node:url";

const scriptUrl = pathToFileURL("/home/wsl/thermal_printer_playground/mtg_token_printer/shared-print.js").href;

async function loadScriptFresh() {
  await import(`${scriptUrl}?v=${Date.now()}-${Math.random()}`);
}

describe("shared-print", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves endpoint by id and image mode", async () => {
    await loadScriptFresh();

    const endpoint = window.MTGPrint.resolveCardPrintEndpoint({
      apiBase: "https://api.example.com",
      cardId: "abc-123",
      includeImage: true,
    });

    expect(endpoint).toBe("https://api.example.com/api/search/print/by-id?id=abc-123");
  });

  it("resolves endpoint by name and default mode", async () => {
    await loadScriptFresh();

    const endpoint = window.MTGPrint.resolveCardPrintEndpoint({
      apiBase: "https://api.example.com",
      cardName: "Goblin Guide",
    });

    expect(endpoint).toBe("https://api.example.com/api/search?card=Goblin%20Guide");
  });

  it("removes active class from android hint", async () => {
    await loadScriptFresh();

    document.body.innerHTML = '<div id="androidHint" class="android-hint active"></div>';
    window.MTGPrint.clearAndroidHint("androidHint");

    expect(document.getElementById("androidHint")?.classList.contains("active")).toBe(false);
  });
});
