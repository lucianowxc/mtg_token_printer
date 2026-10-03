import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../../worker/src/index.js";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJson(response) {
  const text = await response.text();
  return JSON.parse(text);
}

describe("Worker API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for /api/preview without card", async () => {
    const request = new Request("https://example.com/api/preview");

    const response = await worker.fetch(request);
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch("Missing 'card' parameter");
  });

  it("returns worker status payload on root path", async () => {
    const request = new Request("https://example.com/");

    const response = await worker.fetch(request);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.endpoints).toContain("/api/search/by-id?id=CARD_ID");
  });

  it("builds Thermer object payload for /api/search", async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes("/cards/named?fuzzy=")) {
        return jsonResponse({
          id: "card-1",
          name: "Goblin Test",
          type_line: "Token Creature — Goblin",
          oracle_text: "When this creature dies—draw a card.",
          power: "1",
          toughness: "1",
          cmc: 1,
          mana_cost: "{R}",
          scryfall_uri: "https://scryfall.com/card/test/1",
        });
      }

      return jsonResponse({ object: "error" }, 404);
    });

    const request = new Request("https://example.com/api/search?card=Goblin");
    const response = await worker.fetch(request);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(Object.keys(body)[0]).toBe("1");
    expect(JSON.stringify(body)).toContain("draw a card.");
  });

  it("deduplicates functionally equivalent token variants on /api/search/list", async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes("/cards/search?q=t%3Atoken%20Treasure")) {
        return jsonResponse({
          data: [
            {
              id: "t1",
              name: "Treasure",
              type_line: "Token Artifact — Treasure",
              oracle_text: "{T}, Sacrifice this artifact: Add one mana of any color.",
              power: null,
              toughness: null,
              cmc: 0,
              mana_cost: null,
              scryfall_uri: "https://scryfall.com/card/t1",
            },
            {
              id: "t2",
              name: "Treasure",
              type_line: "Token Artifact — Treasure",
              oracle_text: "{T}, Sacrifice this artifact: Add one mana of any color.",
              power: null,
              toughness: null,
              cmc: 0,
              mana_cost: null,
              scryfall_uri: "https://scryfall.com/card/t2",
            },
            {
              id: "c1",
              name: "Clue",
              type_line: "Token Artifact — Clue",
              oracle_text: "{2}, Sacrifice this artifact: Draw a card.",
              power: null,
              toughness: null,
              cmc: 0,
              mana_cost: null,
              scryfall_uri: "https://scryfall.com/card/c1",
            },
          ],
        });
      }

      return jsonResponse({ object: "error" }, 404);
    });

    const request = new Request("https://example.com/api/search/list?card=Treasure");
    const response = await worker.fetch(request);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(2);
    expect(body.results.map((r) => r.name)).toEqual(["Treasure", "Clue"]);
  });

  it("returns 400 for /api/search/by-id without id", async () => {
    const request = new Request("https://example.com/api/search/by-id");

    const response = await worker.fetch(request);
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toMatch("Missing 'id' parameter");
  });
});
