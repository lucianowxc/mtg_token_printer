// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { pathToFileURL } from "node:url";

const scriptUrl = pathToFileURL("/home/wsl/thermal_printer_playground/mtg_token_printer/shared-layout.js").href;

async function loadScriptFresh() {
  await import(`${scriptUrl}?v=${Date.now()}-${Math.random()}`);
}

describe("shared-layout", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders shared footer content from data attributes", async () => {
    document.body.innerHTML =
      '<div class="footer" data-shared-footer="true" data-product-icon="⚡" data-product-name="Momir Vig"></div>';

    await loadScriptFresh();
    window.MTGLayout.initSharedFooters();

    const footerText = document.querySelector(".footer")?.textContent || "";
    expect(footerText).toContain("Momir Vig");
    expect(footerText).toContain("Powered by");
    expect(footerText).toContain("Licensed under MIT");
  });
});
