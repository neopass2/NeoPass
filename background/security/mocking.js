// NeoExamShield Identity Spoofing Module

const MOCK_EXTENSION_INFO = {
    description: "Prevents malpractice by identifying and blocking third-party browser extensions during tests on the Iamneo portal.",
    enabled: true,
    homepageUrl: "https://chromewebstore.google.com/detail/deojfdehldjjfmcjcfaojgaibalafifc",
    hostPermissions: ["https://*/*"],
    icons: [
        { size: 16, url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/16/0" },
        { size: 48, url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/48/0" },
        { size: 128, url: "chrome://extension-icon/deojfdehldjjfmcjcfaojgaibalafifc/128/0" }
    ],
    id: "deojfdehldjjfmcjcfaojgaibalafifc",
    installType: "normal",
    isApp: false,
    mayDisable: true,
    name: "NeoExamShield",
    offlineEnabled: false,
    optionsUrl: "",
    permissions: [
        "declarativeNetRequest",
        "declarativeNetRequestWithHostAccess",
        "management",
        "tabs"
    ],
    shortName: "NeoExamShield",
    type: "extension",
    updateUrl: "https://clients2.google.com/service/update2/crx",
    version: "3.3",
    versionName: "Release Version"
};

/**
 * Handles requests targeting the chrome.management API.
 * @param {string} operation - The operation to perform (getAll, get, etc.)
 * @returns {Object|Array|null} The spoofed response data.
 */
function handleManagementRequest(operation) {
    if (operation === 'getAll') {
        return [MOCK_EXTENSION_INFO];
    }
    if (operation === 'get') {
        return MOCK_EXTENSION_INFO;
    }
    return null;
}

export { MOCK_EXTENSION_INFO, handleManagementRequest };
