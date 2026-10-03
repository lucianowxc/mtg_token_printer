(function () {
  function resolveCardPrintEndpoint(options) {
    const {
      apiBase,
      cardId,
      cardName,
      includeImage = false,
      imageOnly = false,
    } = options || {};

    if (!apiBase) throw new Error("Missing apiBase");
    if (!cardId && !cardName) throw new Error("Missing cardId/cardName");

    const encodedId = cardId ? encodeURIComponent(cardId) : null;
    const encodedName = cardName ? encodeURIComponent(cardName) : null;

    if (imageOnly) {
      return encodedId
        ? `${apiBase}/api/search/image/by-id?id=${encodedId}`
        : `${apiBase}/api/search/print?card=${encodedName}`;
    }

    if (includeImage) {
      return encodedId
        ? `${apiBase}/api/search/print/by-id?id=${encodedId}`
        : `${apiBase}/api/search/print?card=${encodedName}`;
    }

    return encodedId
      ? `${apiBase}/api/search/by-id?id=${encodedId}`
      : `${apiBase}/api/search?card=${encodedName}`;
  }

  function launchThermerPrint(options) {
    const { endpoint, androidHintElementId } = options || {};
    if (!endpoint) throw new Error("Missing endpoint");

    window.location.href = `bprint://${endpoint}`;

    const isAndroid = /Android/i.test(navigator.userAgent || "");
    if (isAndroid && androidHintElementId) {
      const hint = document.getElementById(androidHintElementId);
      setTimeout(() => {
        if (hint) hint.classList.add("active");
      }, 1400);
    }
  }

  function clearAndroidHint(hintId) {
    if (!hintId) return;
    const hint = document.getElementById(hintId);
    if (hint) hint.classList.remove("active");
  }

  window.MTGPrint = {
    resolveCardPrintEndpoint,
    launchThermerPrint,
    clearAndroidHint,
  };
})();
