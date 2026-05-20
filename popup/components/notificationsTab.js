// Notifications tab — fetches from API, marks as read when opened

const API_BASE_URL = CONFIG.BACKEND_BASE_URL;

function formatTime(value) {
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString();
    } catch (e) {
        return '';
    }
}

function getTypeLabel(type) {
    switch (type) {
        case 'CREDIT': return '◈ Credit';
        case 'CUSTOM': return '◆ Message';
        case 'GLOBAL': return '◉ Broadcast';
        default: return '';
    }
}

function renderNotifications(listEl, emptyEl, notifications) {
    if (!listEl || !emptyEl) return;

    if (!notifications || notifications.length === 0) {
        listEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        listEl.innerHTML = '';
        return;
    }

    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');

    listEl.innerHTML = notifications.map((item) => {
        const timeText = item.createdAt ? formatTime(item.createdAt) : '';
        const typeLabel = getTypeLabel(item.type);
        const unreadClass = item.read === false ? ' notification-unread' : '';
        return `
            <div class="notification-item${unreadClass}">
                ${typeLabel ? `<div class="notification-type">${typeLabel}</div>` : ''}
                <div class="notification-message">${item.message || ''}</div>
                ${timeText ? `<div class="notification-time">${timeText}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Fetch notifications from the API and render them.
 * Also marks unread notifications as read.
 */
async function fetchAndRenderNotifications() {
    const listEl = document.getElementById('notificationsList');
    const emptyEl = document.getElementById('notificationsEmpty');
    if (!listEl || !emptyEl) return;

    try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) {
            renderNotifications(listEl, emptyEl, []);
            return;
        }

        // Fetch notifications from API
        const response = await fetch(`${API_BASE_URL}/api/notifications?page=0&size=20`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            renderNotifications(listEl, emptyEl, []);
            return;
        }

        const data = await response.json();
        if (data.success && data.notifications) {
            renderNotifications(listEl, emptyEl, data.notifications);
        } else {
            renderNotifications(listEl, emptyEl, []);
        }

        // Mark all personal notifications as read
        await fetch(`${API_BASE_URL}/api/notifications/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // Clear the badge since user has now seen them
        const badge = document.getElementById('notifBadge');
        if (badge) badge.classList.add('hidden');

    } catch (error) {
        console.error('Error fetching notifications:', error);
        renderNotifications(listEl, emptyEl, []);
    }
}

/**
 * Initialize the notifications tab.
 * Sets up a listener so notifications are fetched when the tab is clicked.
 */
export function initNotificationsTab() {
    // Fetch when the notifications tab button is clicked
    const notifTabBtn = document.querySelector('[data-tab="notifications-tab"]');
    if (notifTabBtn) {
        notifTabBtn.addEventListener('click', () => {
            fetchAndRenderNotifications();
        });
    }
}
