(function () {
  function buildManaText(manaCost, manaValue) {
    const hasManaValue = manaValue !== null && manaValue !== undefined;
    if (manaCost && hasManaValue) return `${manaCost} (MV: ${manaValue})`;
    if (manaCost) return manaCost;
    if (hasManaValue) return `MV: ${manaValue}`;
    return null;
  }

  function resolveImageUrl(cardLike) {
    if (!cardLike) return "";

    const imageUris = cardLike.image_uris || null;
    if (imageUris?.normal) return imageUris.normal;
    if (imageUris?.large) return imageUris.large;
    if (imageUris?.small) return imageUris.small;

    const firstFaceImage = cardLike.card_faces?.find((face) => face.image_uris)?.image_uris;
    if (firstFaceImage?.normal) return firstFaceImage.normal;
    if (firstFaceImage?.large) return firstFaceImage.large;
    if (firstFaceImage?.small) return firstFaceImage.small;

    if (cardLike.id) {
      return `https://api.scryfall.com/cards/${encodeURIComponent(cardLike.id)}?format=image&version=normal`;
    }

    return "";
  }

  function normalizeIndexCard(card, options = {}) {
    const notAvailable = options.notAvailableLabel || "N/A";

    return {
      id: card?.id || null,
      name: card?.name || "Unknown",
      typeLine: card?.type_line || notAvailable,
      manaText: buildManaText(card?.mana_cost || null, card?.mana_value),
      manaValue: card?.mana_value ?? null,
      rulesText: card?.rules_text || null,
      flavorText: card?.flavor_text || null,
      pt: card?.pt || null,
      colorsText: null,
      imageUrl: resolveImageUrl(card),
      scryfallUrl: card?.scryfall_uri || null,
    };
  }

  function normalizeMomirCard(creature, options = {}) {
    const notAvailable = options.notAvailableLabel || "N/A";
    const colorless = options.colorlessLabel || "Colorless";
    const colorsText = (creature?.colors || []).join(", ") || colorless;

    return {
      id: creature?.id || null,
      name: creature?.name || "Unknown",
      typeLine: creature?.type_line || notAvailable,
      manaText: buildManaText(creature?.mana_cost || null, creature?.cmc),
      manaValue: creature?.cmc ?? null,
      rulesText: creature?.oracle_text || null,
      flavorText: creature?.flavor_text || null,
      pt: creature?.power && creature?.toughness ? `${creature.power}/${creature.toughness}` : null,
      colorsText,
      imageUrl: resolveImageUrl(creature),
      scryfallUrl: creature?.scryfall_uri || null,
    };
  }

  function normalizeCardViewModel(data, source, options = {}) {
    if (source === "momir") return normalizeMomirCard(data, options);
    return normalizeIndexCard(data, options);
  }

  window.MTGCardNormalizer = {
    buildManaText,
    resolveImageUrl,
    normalizeIndexCard,
    normalizeMomirCard,
    normalizeCardViewModel,
  };
})();
