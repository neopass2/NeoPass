// NeoPass Background Worker — Bootstrap
// All logic lives in background/ modules. This file only imports and initializes.

// ─── State & Utilities ───
import './background/state/requestGate.js';
import './background/utils/formatting.js';
import './background/utils/ipValidation.js';

// ─── API Layer ───
import './background/api/auth.js';
import './background/api/request.js';
import './background/api/queryRequest.js';

// ─── UI Layer ───
import { initOpacityFromStorage } from './background/ui/toastOpacity.js';
import './background/ui/toasts.js';
import './background/ui/specializedToasts.js';
import { setupContextMenus, handleContextMenuClick } from './background/ui/contextMenus.js';
import { registerShortcutListener } from './background/ui/shortcuts.js';

// ─── Features ───
import './background/features/ai/selectedText.js';
import './background/features/ai/fullPageSolve.js';
import { registerBatchSolveListener } from './background/features/batchSolve.js';
import { registerChatListener } from './background/features/chat.js';
import { loadNptelDataset } from './background/features/nptel.js';
import { registerSnippetsListener } from './background/features/snippets.js';
import { registerCodingQuestionListener } from './background/features/codingQuestion.js';
import { registerNetacadSolverListener } from './background/features/netacadSolver.js';

// ─── Listeners ───
import { registerExternalMessageListener } from './background/listeners/externalMessages.js';
import { registerInternalMessageListeners } from './background/listeners/internalMessages.js';
import { registerTabEventListeners } from './background/listeners/tabEvents.js';
import { registerAlarmListeners } from './background/listeners/alarmEvents.js';

// ─── Security ───
import { startExtensionMonitor, registerExtensionMonitorListeners } from './background/security/extensionMonitor.js';
import { registerTabSecurityListeners } from './background/security/tabSecurity.js';

// ─── Session ───
import { checkAndHandleSessionExpiration, setupSessionAlarm } from './background/session/expiration.js';

// ─── Updates ───
import { checkForUpdate, setupUpdateAlarm } from './background/update/checkForUpdate.js';

// ════════════════════════════════════════════════════════════════
// Initialization
// ════════════════════════════════════════════════════════════════

// Register all message listeners
registerExternalMessageListener();
registerInternalMessageListeners();
registerBatchSolveListener();
registerChatListener();
registerSnippetsListener();
registerCodingQuestionListener();
registerNetacadSolverListener();

// Register event listeners
registerTabEventListeners();
registerAlarmListeners();
registerShortcutListener();

// Context menus
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Security & monitoring
startExtensionMonitor();
registerExtensionMonitorListeners();
registerTabSecurityListeners();

// Session & update alarms
setupSessionAlarm();

// Startup & install events
chrome.runtime.onStartup.addListener(() => {
    initOpacityFromStorage();
    setupUpdateAlarm();
    checkForUpdate();
    checkAndHandleSessionExpiration();
});

chrome.runtime.onInstalled.addListener((details) => {
    setupContextMenus();
    setupUpdateAlarm();
    checkAndHandleSessionExpiration();
    if (details.reason === 'update' || details.reason === 'install') {
        checkForUpdate();
    }
});

// Load NPTEL dataset
loadNptelDataset();

// Expose for debugging
self.checkForUpdate = checkForUpdate;