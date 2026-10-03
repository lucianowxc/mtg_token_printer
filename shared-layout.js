(function () {
    const AUTHOR_URL = "https://github.com/lucianowxc";
    const AUTHOR_NAME = "Luciano Cejnog";
    const GITHUB_REPO_URL = "https://github.com/lucianowxc/mtg_token_printer";
    const SCRYFALL_URL = "https://scryfall.com";
    const THERMER_URL = "https://www.thermerapp.com/";
    const KNUP_URL = "https://knup.com.br/produto/kp-1025/";

    function renderFooter(footerEl) {
        const productIcon = footerEl.dataset.productIcon || "🎴";
        const productName = footerEl.dataset.productName || "MTG Token Printer";

        footerEl.innerHTML = `
            <p>${productIcon} <strong>${productName}</strong> • Implementação por <a href="${AUTHOR_URL}" target="_blank">${AUTHOR_NAME}</a></p>
            <p>Powered by <a href="${SCRYFALL_URL}" target="_blank">Scryfall</a>, <a href="${THERMER_URL}" target="_blank">Thermer</a> & <a href="${KNUP_URL}" target="_blank">KNup KP-1025</a></p>
            <p style="margin-top: 8px; opacity: 0.6;"><a href="${GITHUB_REPO_URL}" target="_blank">View on GitHub</a> • Licensed under MIT</p>
        `;
    }

    function initSharedFooters() {
        document.querySelectorAll(".footer[data-shared-footer='true']").forEach(renderFooter);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSharedFooters);
    } else {
        initSharedFooters();
    }

    window.MTGLayout = {
        initSharedFooters,
    };
})();
