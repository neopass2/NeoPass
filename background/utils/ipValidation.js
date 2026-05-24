// IP address validation and domain resolution utilities

// Array to store allowed IP addresses
let allowedIPs = [];

// Fetch allowed IPs from manifest metadata
const getIPs = async () => {
    try {
        const response = await fetch(chrome.runtime.getURL("metadata.json"));
        const data = await response.json();
        allowedIPs = Array.isArray(data.ip) ? data.ip : [];
        return allowedIPs;
    } catch (error) {
        console.error("Failed to load metadata:", error);
        allowedIPs = [];
        return allowedIPs;
    }
};

// Fetch IP address for a given domain
const fetchDomainIp = async (url) => {
    try {
        await getIPs();
        let hostname = new URL(url).hostname;

        // Special case for specific domain
        if (hostname.includes("pscollege841.examly")) {
            return "34.171.215.232";
        }
        // Query Google DNS API
        let response = await fetch(`https://dns.google/resolve?name=${hostname}`);
        let data = await response.json();

        let ip = data.Answer?.find(record => record.type === 1)?.data || null;
        return ip || null;
    } catch (error) {
        throw error;
    }
};

export { allowedIPs, getIPs, fetchDomainIp };
