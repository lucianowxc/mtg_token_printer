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

const DEFAULT_QR_SIZE_MM = 120;

// Search for multiple card results with smart ranking
async function searchCards(searchName) {
  const isGenericToken = TOKEN_KEYWORDS.includes(searchName.toLowerCase().trim());
  let isTokenSearch = false;
  let results = [];

  try {
    // 1) Try token-focused search first for any term.
    // This keeps token workflows accurate for names like "pest", "spider", etc.
    const tokenQuery = `t:token ${searchName}`;
    const tokenRes = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(tokenQuery)}&order=released&dir=desc`,
      { headers: SCRYFALL_HEADERS }
    );

    if (tokenRes.ok) {
      const tokenJson = await tokenRes.json();
      const tokenResults = tokenJson.data || [];
      if (tokenResults.length > 0) {
        results = tokenResults;
        isTokenSearch = true;
      }
    }

    // 2) Fallback to previous behavior if token query returns nothing.
    if (results.length === 0 && isGenericToken) {
      const query = `t:token ${searchName}`;
      const res = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=released&dir=desc`,
        { headers: SCRYFALL_HEADERS }
      );
      if (res.ok) {
        const json = await res.json();
        results = json.data || [];
      }
    } else if (results.length === 0) {
      // Try exact match first
      const exactRes = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(searchName)}`,
        { headers: SCRYFALL_HEADERS }
      );
      
      if (exactRes.ok) {
        // Found exact match, but also search for similar cards
        results = [await exactRes.json()];
        
        // Try to get more results with fuzzy/search
        try {
          const searchRes = await fetch(
            `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchName)}&order=released&dir=desc`,
            { headers: SCRYFALL_HEADERS }
          );
          if (searchRes.ok) {
            const json = await searchRes.json();
            const otherResults = json.data || [];
            // Add other results if they're different from the exact match
            for (const card of otherResults) {
              if (card.name.toLowerCase() !== searchName.toLowerCase()) {
                results.push(card);
                if (results.length >= 5) break;
              }
            }
          }
        } catch (e2) {
          // Ignore search error, we have the exact match
        }
      } else {
        // No exact match, try search
        const searchRes = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchName)}&order=released&dir=desc`,
          { headers: SCRYFALL_HEADERS }
        );
        if (searchRes.ok) {
          const json = await searchRes.json();
          results = (json.data || []).slice(0, 5); // Top 5 results
        }
      }
    }
  } catch (e) {
    // Silently fail and return empty results
  }

  // For generic token searches, keep only functionally distinct variants.
  // This prevents many reprints of the same token from flooding the list.
  if ((isGenericToken || isTokenSearch) && results.length > 0) {
    const unique = [];
    const seen = new Set();

    for (const data of results) {
      const cardInfo = formatCardInfo(data, searchName);
      if (!cardInfo) continue;

      const signature = [
        (cardInfo.name || "").toLowerCase().trim(),
        (cardInfo.type_line || "").toLowerCase().trim(),
        (cardInfo.pt || "").toLowerCase().trim(),
        (cardInfo.rules_text || "").toLowerCase().trim(),
      ].join("|");

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(data);
      }

      if (unique.length >= 8) break;
    }

    results = unique;
  }

  return results;
}

// Autocomplete suggestions (lightweight, uses Scryfall autocomplete)
async function autocompleteCards(query) {
  if (!query || query.length < 2) return [];

  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}&include_extras=true`,
      { headers: SCRYFALL_HEADERS }
    );
    
    if (res.ok) {
      const json = await res.json();
      // Return first 10 suggestions
      return (json.data || []).slice(0, 10);
    }
  } catch (e) {
    // Silently fail
  }

  return [];
}

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

  return formatCardInfo(data, searchName);
}

async function fetchCardDataById(cardId) {
  if (!cardId) return null;

  const res = await fetch(
    `https://api.scryfall.com/cards/${encodeURIComponent(cardId)}`,
    { headers: SCRYFALL_HEADERS }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return formatCardInfo(data);
}

// Convert Scryfall card data to our standard format
function formatCardInfo(data, searchName = null) {
  if (!data) return null;

  const cardInfo = {
    id: data.id || null,
    name: data.name || "Unknown",
    type_line: data.type_line || "Token",
    rules_text: data.oracle_text || null,
    flavor_text: data.flavor_text || null,
    pt: null,
    mana_cost: data.mana_cost || null,
    mana_value: data.cmc !== undefined ? Math.trunc(data.cmc) : null,
    scryfall_uri: data.scryfall_uri || null,
    image_uris: data.image_uris || null,
  };

  if (data.power && data.toughness) {
    cardInfo.pt = `${data.power}/${data.toughness}`;
  }

  // Handle card faces
  if (data.card_faces) {
    let targetFace = data.card_faces[0];
    if (searchName) {
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

// Scryfall text often contains Unicode punctuation (em/en dashes, curly
// quotes, bullet points) that the Thermer app / thermal printer's limited
// charset seems to choke on — we observed the entry containing "—" being
// silently dropped entirely while pure-ASCII entries printed fine.
// Sanitize to ASCII-safe equivalents before building any entry content.
function toAscii(str) {
  if (!str) return str;
  return str
    .replace(/[\u2014\u2013]/g, "-") // em dash, en dash -> hyphen
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes -> straight
    .replace(/[\u201c\u201d]/g, '"') // curly double quotes -> straight
    .replace(/\u2022/g, "*") // bullet -> asterisk
    .replace(/\u2026/g, "...") // ellipsis -> three dots
    .replace(/[^\x00-\x7F]/g, "?"); // any remaining non-ASCII -> ?
}

// Thermer's FREE plan only allows up to 5 entries per print job.
// We consolidate multiple lines into a single text entry using "<br />"
// (documented by Thermer as the way to do multi-line text in one entry),
// keeping the total entry count at 4 (1 spare under the limit).
function generateThermerJson(card) {
  const output = [];
  const divider = (char) => char.repeat(32);
  const name = toAscii(card.name);
  const typeLine = toAscii(card.type_line);
  const manaCost = toAscii(card.mana_cost);
  const rulesText = toAscii(card.rules_text);
  const flavorText = toAscii(card.flavor_text);
  const pt = toAscii(card.pt);

  // Entry 1: header block (name, mana, type)
  const headerLines = [divider("="), `NAME: ${name.toUpperCase()}`];

  if (manaCost || card.mana_value !== null) {
    const costString = manaCost
      ? `${manaCost} (MV: ${card.mana_value ?? 0})`
      : `MV: ${card.mana_value ?? 0}`;
    headerLines.push(`MANA: ${costString}`);
  }

  headerLines.push(`TYPE: ${typeLine}`, divider("-"));

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
      size: DEFAULT_QR_SIZE_MM,
      align: 2,
    });
  }

  // Entry 3: rules text + flavor text combined
  const bodyLines = [];
  if (rulesText) {
    bodyLines.push(rulesText);
  }
  if (flavorText) {
    if (bodyLines.length) bodyLines.push(divider("-"));
    bodyLines.push(flavorText);
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
  if (pt) {
    footerLines.push(`[${pt}]`);
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

function generateThermerImageOnlyJson(card) {
  const output = [];

  if (card.image_uris?.normal) {
    output.push({
      type: 1,
      path: card.image_uris.normal,
      align: 1,
    });
  }

  if (card.scryfall_uri) {
    output.push({
      type: 3,
      value: card.scryfall_uri,
      size: DEFAULT_QR_SIZE_MM,
      align: 2,
    });
  }

  output.push({
    type: 0,
    content: " <br /> ",
    bold: 0,
    align: 1,
    format: 0,
  });

  return output;
}

// Generate Thermer JSON with card image included as first entry
function generateThermerJsonWithImage(card) {
  const output = [];
  const divider = (char) => char.repeat(32);
  const name = toAscii(card.name);
  const typeLine = toAscii(card.type_line);
  const manaCost = toAscii(card.mana_cost);
  const rulesText = toAscii(card.rules_text);
  const flavorText = toAscii(card.flavor_text);
  const pt = toAscii(card.pt);

  // Entry 1: Image (if available)
  if (card.image_uris?.normal) {
    output.push({
      type: 1,
      path: card.image_uris.normal,
      align: 1,
    });
  }

  // Entry 2: header block (name, mana, type) + P/T consolidated
  const headerLines = [divider("="), `NAME: ${name.toUpperCase()}`];

  if (manaCost || card.mana_value !== null) {
    const costString = manaCost
      ? `${manaCost} (MV: ${card.mana_value ?? 0})`
      : `MV: ${card.mana_value ?? 0}`;
    headerLines.push(`MANA: ${costString}`);
  }

  headerLines.push(`TYPE: ${typeLine}`);
  
  // Add P/T to header if available
  if (pt) {
    headerLines.push(`P/T: ${pt}`);
  }
  
  headerLines.push(divider("-"));

  output.push({
    type: 0,
    content: headerLines.join("<br />"),
    bold: 1,
    align: 0,
    format: 0,
  });

  // Entry 3: QR code (optional)
  if (card.scryfall_uri) {
    output.push({
      type: 3, // QR code
      value: card.scryfall_uri,
      size: DEFAULT_QR_SIZE_MM,
      align: 2,
    });
  }

  // Entry 4: rules text + flavor text combined
  const bodyLines = [];
  if (rulesText) {
    bodyLines.push(rulesText);
  }
  if (flavorText) {
    if (bodyLines.length) bodyLines.push(divider("-"));
    bodyLines.push(flavorText);
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

  // Entry 5: closing divider + feed
  output.push({
    type: 0,
    content: `${divider("=")} `,
    bold: 1,
    align: 1,
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

async function fetchRandomCreatureByCMC(cmc) {
  const cmcValue = parseInt(cmc, 10);
  if (isNaN(cmcValue) || cmcValue < 0 || cmcValue > 20) {
    return null;
  }

  const query = `type:creature cmc:${cmcValue}`;
  const res = await fetch(
    `https://api.scryfall.com/cards/random?q=${encodeURIComponent(query)}`,
    { headers: SCRYFALL_HEADERS }
  );

  if (!res.ok) return null;
  return res.json();
}

// Generate Thermer JSON specifically for Momir creatures (includes image)
function generateMomirThermerJson(creature) {
  const output = [];
  const divider = (char) => char.repeat(32);
  const name = toAscii(creature.name);
  const typeLine = toAscii(creature.type_line);
  const cmcValue = creature.cmc || 0;
  const rulesText = toAscii(creature.oracle_text);
  const pt = creature.power && creature.toughness 
    ? `${creature.power}/${creature.toughness}` 
    : null;
  
  // Entry 1: Image (if available)
  if (creature.image_uris?.normal) {
    output.push({
      type: 1, // image
      path: creature.image_uris.normal,
      align: 1, // center
    });
  }

  // Entry 2: header block (name, cmc, type) + P/T consolidated
  const headerLines = [divider("="), `NAME: ${name.toUpperCase()}`];
  headerLines.push(`MANA: MV: ${cmcValue}`);
  headerLines.push(`TYPE: ${typeLine}`);
  
  // Add P/T to header if available
  if (pt) {
    headerLines.push(`P/T: ${pt}`);
  }
  
  headerLines.push(divider("-"));

  output.push({
    type: 0,
    content: headerLines.join("<br />"),
    bold: 1,
    align: 0,
    format: 0,
  });

  // Entry 3: QR code (optional)
  if (creature.scryfall_uri) {
    output.push({
      type: 3, // QR code
      value: creature.scryfall_uri,
      size: DEFAULT_QR_SIZE_MM,
      align: 2,
    });
  }

  // Entry 4: rules text + closing divider
  if (rulesText) {
    output.push({
      type: 0,
      content: `${divider("-")}<br />${rulesText}<br />${divider("=")}`,
      bold: 0,
      align: 0,
      format: 0,
    });
  } else {
    // If no rules text, add closing divider separately
    output.push({
      type: 0,
      content: divider("="),
      bold: 1,
      align: 1,
      format: 0,
    });
  }

  return output;
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
  const cardId = (url.searchParams.get("id") || "").trim();
    const query = (url.searchParams.get("q") || "").trim();

    if (url.pathname === "/api/autocomplete") {
      if (!query) return jsonResponse({ error: "Missing 'q' parameter" }, 400);
      const suggestions = await autocompleteCards(query);
      const resp = jsonResponse({ suggestions });
      resp.headers.set("Cache-Control", "public, max-age=3600");
      return resp;
    }

    if (url.pathname === "/api/preview") {
      if (!cardName) return jsonResponse({ error: "Missing 'card' parameter" }, 400);
      const card = await fetchCardData(cardName);
      if (!card) return jsonResponse({ error: `Card not found: ${cardName}` }, 404);
      return jsonResponse(card);
    }

    if (url.pathname === "/api/preview/by-id") {
      if (!cardId) return jsonResponse({ error: "Missing 'id' parameter" }, 400);
      const card = await fetchCardDataById(cardId);
      if (!card) return jsonResponse({ error: `Card not found: ${cardId}` }, 404);
      return jsonResponse(card);
    }

    if (url.pathname === "/api/search") {
      if (!cardName) return jsonResponse({ error: "Missing 'card' parameter" }, 400);
      const card = await fetchCardData(cardName);
      if (!card) return jsonResponse({ error: `Card not found: ${cardName}` }, 404);
      const thermerArray = generateThermerJson(card);
      return jsonResponse(toForcedObject(thermerArray));
    }

    if (url.pathname === "/api/search/list") {
      if (!cardName) return jsonResponse({ error: "Missing 'card' parameter" }, 400);
      const results = await searchCards(cardName);
      if (results.length === 0) return jsonResponse({ error: `Card not found: ${cardName}` }, 404);
      
      // Format results
      const formattedResults = results.map((data, index) => {
        const cardInfo = formatCardInfo(data, cardName);
        return {
          id: index,
          card_id: cardInfo.id,
          name: cardInfo.name,
          type_line: cardInfo.type_line,
          pt: cardInfo.pt,
          mana_cost: cardInfo.mana_cost,
          mana_value: cardInfo.mana_value,
          rules_text: cardInfo.rules_text,
          scryfall_uri: cardInfo.scryfall_uri,
        };
      });
      
      return jsonResponse({ results: formattedResults });
    }

    if (url.pathname === "/api/search/print") {
      if (!cardName) return jsonResponse({ error: "Missing 'card' parameter" }, 400);
      const card = await fetchCardData(cardName);
      if (!card) return jsonResponse({ error: `Card not found: ${cardName}` }, 404);
      const thermerArray = generateThermerJsonWithImage(card);
      return jsonResponse(toForcedObject(thermerArray));
    }

    if (url.pathname === "/api/search/by-id") {
      if (!cardId) return jsonResponse({ error: "Missing 'id' parameter" }, 400);
      const card = await fetchCardDataById(cardId);
      if (!card) return jsonResponse({ error: `Card not found: ${cardId}` }, 404);
      const thermerArray = generateThermerJson(card);
      return jsonResponse(toForcedObject(thermerArray));
    }

    if (url.pathname === "/api/search/print/by-id") {
      if (!cardId) return jsonResponse({ error: "Missing 'id' parameter" }, 400);
      const card = await fetchCardDataById(cardId);
      if (!card) return jsonResponse({ error: `Card not found: ${cardId}` }, 404);
      const thermerArray = generateThermerJsonWithImage(card);
      return jsonResponse(toForcedObject(thermerArray));
    }

    if (url.pathname === "/api/search/image/by-id") {
      if (!cardId) return jsonResponse({ error: "Missing 'id' parameter" }, 400);
      const card = await fetchCardDataById(cardId);
      if (!card) return jsonResponse({ error: `Card not found: ${cardId}` }, 404);
      const thermerArray = generateThermerImageOnlyJson(card);
      return jsonResponse(toForcedObject(thermerArray));
    }

    if (url.pathname === "/api/momir") {
      const cmc = url.searchParams.get("cmc");
      if (!cmc) return jsonResponse({ error: "Missing 'cmc' parameter" }, 400);
      const creature = await fetchRandomCreatureByCMC(cmc);
      if (!creature) return jsonResponse({ error: `No creature found with CMC ${cmc}` }, 404);
      return jsonResponse(creature);
    }

    if (url.pathname === "/api/momir/print") {
      const cmc = url.searchParams.get("cmc");
      if (!cmc) return jsonResponse({ error: "Missing 'cmc' parameter" }, 400);
      const creature = await fetchRandomCreatureByCMC(cmc);
      if (!creature) return jsonResponse({ error: `No creature found with CMC ${cmc}` }, 404);
      const thermerArray = generateMomirThermerJson(creature);
      return jsonResponse(toForcedObject(thermerArray));
    }

    return jsonResponse({
      status: "ok",
      app: "MTG Token Printer Worker",
      endpoints: [
        "/api/autocomplete?q=QUERY",
        "/api/preview?card=NAME",
        "/api/preview/by-id?id=CARD_ID",
        "/api/search?card=NAME",
        "/api/search/list?card=NAME",
        "/api/search/by-id?id=CARD_ID",
        "/api/search/print?card=NAME",
        "/api/search/print/by-id?id=CARD_ID",
        "/api/search/image/by-id?id=CARD_ID",
        "/api/momir?cmc=X",
        "/api/momir/print?cmc=X"
      ],
    });
  },
};
