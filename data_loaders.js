// Data loading utilities
const DataLoaders = (function() {
    async function loadCourtAddresses() {
        const response = await fetch(chrome.runtime.getURL("court_addresses.json"));
        return await response.json();
    }

    async function loadSearchReplaceTables() {
        const response = await fetch(chrome.runtime.getURL("doc_search_replace_tables.json"));
        return await response.json();
    }

    // Return public methods
    return {
        loadCourtAddresses,
        loadSearchReplaceTables
    };
})();

// Make DataLoaders available globally
window.DataLoaders = DataLoaders;