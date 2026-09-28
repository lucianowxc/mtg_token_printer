/**
 * MTG Token Printer - Cloudflare Worker Backend
 *
 * Substitui o web_app.py (Flask) para poder rodar 100% na nuvem,
 * gratuito e via HTTPS, permitindo que o frontend fique no GitHub Pages.
 *
 * Endpoints:
 *   GET /api/preview?card=NAME   -> dados brutos do card (Scryfall)
 *   GET /api/search?card=NAME    -> JSON formatado para o app Thermer
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TOKEN_KEYWORDS = ["treasure", "clue", "food", "blood", "map", "incubator"];

const SCRYFALL_HEADERS = {
  "User-Agent": "MTGTokenPrinter/1.0 (+https://github.com/lucianowxc/mtg_token_printer)",
  "Accept": "application/json",
};

async function fetchCardData(searchName) {
  const isGenericToken = TOKEN_KEYWORDS.includes(searchName.toLowerCase().trim());
  let data;

  if (isGenericToken) {
    const query = `t:token ${searchName}`;
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`,
      { headers: SCRYFALL_HEADERS }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const results = json.data || [];
    if (results.length === 0) return null;
    data = results[0];
  } else {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(searchName)}`,
      { headers: SCRYFALL_HEADERS }
    );
    if (!res.ok) return null;
    data = await res.json();
  }

  const cardInfo = {
    name: data.name || "Unknown",
    type_line: data.type_line || "Token",
    rules_text: data.oracle_text || null,
    flavor_text: data.flavor_text || null,
    pt: null,
    mana_cost: data.mana_cost || null,
    mana_value: data.cmc !== undefined ? Math.trunc(data.cmc) : null,
    scryfall_uri: data.scryfall_uri || null,
  };

  if (data.power && data.toughness) {
    cardInfo.pt = `${data.power}/${data.toughness}`;
  }

  if (data.card_faces) {
    let targetFace = data.card_faces[0];
    if (isGenericToken) {
      const match = data.card_faces.find((f) =>
        (f.name || "").toLowerCase().includes(searchName.toLowerCase())
      );
      if (match) targetFace = match;
    }
    cardInfo.name = targetFace.name || cardInfo.name;
    cardInfo.type_line = targetFace.type_line || cardInfo.type_line;
    cardInfo.rules_text = targetFace.oracle_text || cardInfo.rules_text;
    cardInfo.flavor_text = targetFace.flavor_text || cardInfo.flavor_text;
    if (targetFace.mana_cost) cardInfo.mana_cost = targetFace.mana_cost;
    if (targetFace.power && targetFace.toughness) {
      cardInfo.pt = `${targetFace.power}/${targetFace.toughness}`;
    }
  }

  return cardInfo;
}

// Thermer's FREE plan only allows up to 5 entries per print job.
// We consolidate multiple lines into a single text entry using "<br />"
// (documented by Thermer as the way to do multi-line text in one entry),
// keeping the total entry count at 4 (1 spare under the limit).
function generateThermerJson(card) {
  const output = [];
  const divider = (char) => char.repeat(32);

  // Entry 1: header block (name, mana, type)
  const headerLines = [divider("="), `NAME: ${card.name.toUpperCase()}`];

  if (card.mana_cost || card.mana_value !== null) {
    const costString = card.mana_cost
      ? `${card.mana_cost} (MV: ${card.mana_value ?? 0})`
      : `MV: ${card.mana_value ?? 0}`;
    headerLines.push(`MANA: ${costString}`);
  }

  headerLines.push(`TYPE: ${card.type_line}`, divider("-"));

  output.push({
    type: 0,
    content: headerLines.join("<br />"),
    bold: 1,
    align: 0,
    format: 0,
  });

  // Entry 2: QR code (optional)
  if (card.scryfall_uri) {
    output.push({
      type: 3, // QR code
      value: card.scryfall_uri,
      size: 40,
      align: 2,
    });
  }

  // Entry 3: rules text + flavor text combined
  const bodyLines = [];
  if (card.rules_text) {
    bodyLines.push(card.rules_text);
  }
  if (card.flavor_text) {
    if (bodyLines.length) bodyLines.push(divider("-"));
    bodyLines.push(card.flavor_text);
  }
  if (bodyLines.length) {
    output.push({
      type: 0,
      content: bodyLines.join("<br />"),
      bold: 0,
      align: 0,
      format: 0,
    });
  }

  // Entry 4: footer (P/T + closing divider + feed)
  const footerLines = [divider("-")];
  if (card.pt) {
    footerLines.push(`[${card.pt}]`);
  }
  footerLines.push(divider("="), " ", " ");

  output.push({
    type: 0,
    content: footerLines.join("<br />"),
    bold: 1,
    align: card.pt ? 2 : 1,
    format: 0,
  });

  return output;
}

// Thermer's original PHP sample uses json_encode($a, JSON_FORCE_OBJECT),
// which converts the top-level array into a JSON object with numeric
// string keys (e.g. {"0": {...}, "1": {...}}) instead of a plain array.
// The app appears to require this exact shape ("Entry not found" otherwise).
//
// NOTE: we observed the entry at key "0" being silently dropped when
// printing (header block never appeared). Hypothesis: Thermer's parser
// is 1-indexed and skips/ignores key "0". We start numbering at 1 to
// test/work around this.
function toForcedObject(arr) {
  const obj = {};
  arr.forEach((item, index) => {
    obj[String(index + 1)] = item;
  });
  return obj;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const cardName = (url.searchParams.get("card") || "").trim();

    if (url.pathname === "/api/preview") {
      if (!cardName) return jsonResponse({ error: "Missing 'card' parameter" }, 400);
      const card = await fetchCardData(cardName);
      if (!card) return jsonResponse({ error: `Card not found: ${cardName}` }, 404);
      return jsonResponse(card);
    }

    if (url.pathname === "/api/search") {
      if (!cardName) return jsonResponse({ error: "Missing 'card' parameter" }, 400);
      const card = await fetchCardData(cardName);
      if (!card) return jsonResponse({ error: `Card not found: ${cardName}` }, 404);
      const thermerArray = generateThermerJson(card);
      return jsonResponse(toForcedObject(thermerArray));
    }

    return jsonResponse({
      status: "ok",
      app: "MTG Token Printer Worker",
      endpoints: ["/api/preview?card=NAME", "/api/search?card=NAME"],
    });
  },
};
