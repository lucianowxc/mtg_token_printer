import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { JSDOM } from "jsdom";

function loadHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  return new JSDOM(html).window.document;
}

describe("token-designer.html", () => {
  const document = loadHtml("/home/wsl/thermal_printer_playground/mtg_token_printer/token-designer.html");

  it("includes direct Thermer print controls", () => {
    expect(document.getElementById("printQuantity")).not.toBeNull();
    expect(document.getElementById("printThermerBtn")).not.toBeNull();
    expect(document.getElementById("thresholdBtn")).not.toBeNull();
    expect(document.getElementById("androidThermerHint")).not.toBeNull();
  });

  it("loads shared print integration and local designer script", () => {
    const scripts = Array.from(document.querySelectorAll("script[src]")).map((script) =>
      script.getAttribute("src")
    );

    expect(scripts).toContain("shared-print.js");
    expect(scripts).toContain("token-designer.js");
  });
});
