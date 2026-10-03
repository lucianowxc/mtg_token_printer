(function () {
    function create(options) {
        const messages = options?.messages || {};
        const defaultLang = options?.defaultLang || "pt-BR";
        const storageKey = options?.storageKey || "mtg-lang";
        const enablePlaceholders = Boolean(options?.enablePlaceholders);

        let currentLang = localStorage.getItem(storageKey) || defaultLang;

        function t(key) {
            return messages[currentLang]?.[key] ?? messages[defaultLang]?.[key] ?? key;
        }

        function applyTranslations() {
            document.querySelectorAll("[data-i18n]").forEach((el) => {
                const key = el.dataset.i18n;
                const value = t(key);
                if (value) el.textContent = value;
            });

            if (enablePlaceholders) {
                document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
                    const key = el.dataset.i18nPlaceholder;
                    const value = t(key);
                    if (value) el.setAttribute("placeholder", value);
                });
            }
        }

        function setupLanguageSelector(selectId = "languageSelect", onChange) {
            const select = document.getElementById(selectId);
            if (!select) return;

            select.value = currentLang;
            select.addEventListener("change", (e) => {
                currentLang = e.target.value;
                localStorage.setItem(storageKey, currentLang);
                applyTranslations();
                if (typeof onChange === "function") onChange(currentLang);
            });
        }

        function getLanguage() {
            return currentLang;
        }

        return {
            t,
            applyTranslations,
            setupLanguageSelector,
            getLanguage,
        };
    }

    window.MTGI18n = { create };
})();
