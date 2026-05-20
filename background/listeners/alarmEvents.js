// Alarm event listeners

import { checkForUpdate, setupUpdateAlarm } from '../update/checkForUpdate.js';
import { checkAndHandleSessionExpiration } from '../session/expiration.js';

function registerAlarmListeners() {
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'updateCheck') { checkForUpdate(); }
        if (alarm.name === 'sessionExpirationCheck') { checkAndHandleSessionExpiration(); }
    });
}

export { registerAlarmListeners };
