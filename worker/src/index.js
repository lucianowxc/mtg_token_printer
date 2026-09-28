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

function generateThermerJson(card) {
  const output = [];
  const divider = (char) => ({
    type: 0,
    content: char.repeat(32),
    bold: 0,
    align: 1,
    format: 0,
  });

  output.push(divider("="));

  if (card.scryfall_uri) {
    output.push({
      type: 3, // QR code
      value: card.scryfall_uri,
      size: 40,
      align: 2,
    });
  }

  output.push({
    type: 0,
    content: `NAME: ${card.name.toUpperCase()}`,
    bold: 1,
    align: 0,
    format: 0,
  });

  if (card.mana_cost || card.mana_value !== null) {
    const costString = card.mana_cost
      ? `${card.mana_cost} (MV: ${card.mana_value ?? 0})`
      : `MV: ${card.mana_value ?? 0}`;
    output.push({
      type: 0,
      content: `MANA: ${costString}`,
      bold: 1,
      align: 0,
      format: 0,
    });
  }

  output.push({
    type: 0,
    content: `TYPE: ${card.type_line}`,
    bold: 1,
    align: 0,
    format: 0,
  });

  output.push(divider("-"));

  if (card.rules_text) {
    output.push({
      type: 0,
      content: card.rules_text,
      bold: 0,
      align: 0,
      format: 0,
    });
    output.push(divider("-"));
  }

  if (card.flavor_text) {
    output.push({
      type: 0,
      content: card.flavor_text,
      bold: 0,
      align: 1,
      format: 4,
    });
    output.push(divider("-"));
  }

  if (card.pt) {
    output.push({
      type: 0,
      content: `[${card.pt}]`,
      bold: 1,
      align: 2,
      format: 3,
    });
  }

  output.push(divider("="));
  output.push({ type: 0, content: " ", bold: 0, align: 0, format: 0 });
  output.push({ type: 0, content: " ", bold: 0, align: 0, format: 0 });

  return output;
}

// Thermer's original PHP sample uses json_encode($a, JSON_FORCE_OBJECT),
// which converts the top-level array into a JSON object with numeric
// string keys (e.g. {"0": {...}, "1": {...}}) instead of a plain array.
// The app appears to require this exact shape ("Entry not found" otherwise).
function toForcedObject(arr) {
  const obj = {};
  arr.forEach((item, index) => {
    obj[String(index)] = item;
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
