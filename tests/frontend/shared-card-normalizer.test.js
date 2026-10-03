// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { pathToFileURL } from "node:url";

const scriptUrl = pathToFileURL("/home/wsl/thermal_printer_playground/mtg_token_printer/shared-card-normalizer.js").href;

async function loadScriptFresh() {
  await import(`${scriptUrl}?v=${Date.now()}-${Math.random()}`);
}

describe("shared-card-normalizer", () => {
  it("normalizes index card with mana text and image url", async () => {
    await loadScriptFresh();

    const model = window.MTGCardNormalizer.normalizeIndexCard({
      id: "abc",
      name: "Goblin Token",
      type_line: "Token Creature — Goblin",
      mana_cost: "{R}",
      mana_value: 1,
      rules_text: "Haste",
      image_uris: { normal: "https://cards.scryfall.io/normal/test.jpg" },
      scryfall_uri: "https://scryfall.com/card/test/1",
    });

    expect(model.name).toBe("Goblin Token");
    expect(model.typeLine).toBe("Token Creature — Goblin");
    expect(model.manaText).toBe("{R} (MV: 1)");
    expect(model.imageUrl).toBe("https://cards.scryfall.io/normal/test.jpg");
  });

  it("falls back to Scryfall image endpoint when image_uris is missing", async () => {
    await loadScriptFresh();

    const imageUrl = window.MTGCardNormalizer.resolveImageUrl({
      id: "face-card-1",
      image_uris: null,
      card_faces: [],
    });

    expect(imageUrl).toBe("https://api.scryfall.com/cards/face-card-1?format=image&version=normal");
  });

  it("uses card_faces image when top-level image_uris is absent", async () => {
    await loadScriptFresh();

    const imageUrl = window.MTGCardNormalizer.resolveImageUrl({
      id: "face-card-2",
      image_uris: null,
      card_faces: [
        {
          image_uris: {
            normal: "https://cards.scryfall.io/normal/front/face-card-2.jpg",
          },
        },
      ],
    });

    expect(imageUrl).toBe("https://cards.scryfall.io/normal/front/face-card-2.jpg");
  });

  it("normalizes momir card with colorless and notAvailable labels", async () => {
    await loadScriptFresh();

    const model = window.MTGCardNormalizer.normalizeMomirCard(
      {
        id: "momir-1",
        name: "Mystery Creature",
        type_line: "",
        cmc: 4,
        colors: [],
        oracle_text: "Flying",
      },
      {
        colorlessLabel: "Incolor",
        notAvailableLabel: "N/D",
      }
    );

    expect(model.typeLine).toBe("N/D");
    expect(model.colorsText).toBe("Incolor");
    expect(model.manaText).toBe("MV: 4");
  });
});
