import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { JSDOM } from "jsdom";

function loadHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  return new JSDOM(html).window.document;
}

describe("momir.html", () => {
  const document = loadHtml("/home/wsl/thermal_printer_playground/mtg_token_printer/momir.html");

  it("uses shared scripts and shared footer layout", () => {
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => s.getAttribute("src"));

    expect(scripts).toContain("shared-layout.js");
    expect(scripts).toContain("shared-print.js");
    expect(scripts).toContain("shared-i18n.js");

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
});
