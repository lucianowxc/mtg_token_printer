import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { JSDOM } from "jsdom";

function loadHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  return new JSDOM(html).window.document;
}

describe("index.html", () => {
  const document = loadHtml("/home/wsl/thermal_printer_playground/mtg_token_printer/index.html");

  it("uses shared scripts and shared footer layout", () => {
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => s.getAttribute("src"));

    expect(scripts).toContain("shared-layout.js");
    expect(scripts).toContain("shared-print.js");
    expect(scripts).toContain("shared-i18n.js");
  expect(scripts).toContain("shared-card-normalizer.js");

    const footer = document.querySelector(".footer[data-shared-footer='true']");
    expect(footer).not.toBeNull();
    expect(footer?.getAttribute("data-product-name")).toBe("MTG Token Printer");
  });

  it("renders unified card preview image and print options", () => {
    const previewImage = document.getElementById("preview-image");
    expect(previewImage).not.toBeNull();
    expect(previewImage?.classList.contains("card-preview-image")).toBe(true);

    expect(document.getElementById("includeImageCheckbox")).not.toBeNull();
    expect(document.getElementById("imageOnlyCheckbox")).not.toBeNull();
    expect(document.getElementById("preview-section")).not.toBeNull();
  });
});
