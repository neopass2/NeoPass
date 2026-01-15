const CONFIG = {
    BACKEND_BASE_URL: 'https://api.neopassfree.tech',
    FRONTEND_URL: 'https://neopassfree.tech',
    
    // API Endpoints (relative to BACKEND_BASE_URL)
    ENDPOINTS: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        REFRESH_TOKEN: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout',
        ACCOUNT: '/api/account',
        MCQ_TEXT: '/api/mcq-text',
        CODING_TEXT: '/api/coding-text',
        HEALTH: '/api/health'
    },
    
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    REQUEST_TIMEOUT: 15000, // 15 seconds timeout for blocking requests
    LOGIN_COOLDOWN: 2000 // 2 seconds between login attempts
};
Object.freeze(CONFIG);
Object.freeze(CONFIG.ENDPOINTS);

