/**
 * Screenshare Spoofing Module (MAIN World)
 * Overrides getDisplayMedia to provide multi-mode spoofing (Tab, Blank, Frozen).
 * Login requirement removed per user request.
 */
(function() {
    // Mac detection
    let isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                 navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

    /**
     * Overrides navigator.mediaDevices.getDisplayMedia
     */
    function spoofScreenRecording() {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        
        // Store original method reference if not already stored
        if (!navigator.mediaDevices.__originalGetDisplayMedia) {
            navigator.mediaDevices.__originalGetDisplayMedia = originalGetDisplayMedia;
        }
        
        navigator.mediaDevices.getDisplayMedia = async function(constraints) {
            return new Promise((resolve, reject) => {
                showSelectionPopup(resolve, reject, constraints, originalGetDisplayMedia);
            });
        };
    }

    /**
     * Shows the premium Shadow DOM selection popup.
     */
    function showSelectionPopup(resolve, reject, constraints, originalGetDisplayMedia) {
        const host = document.createElement('div');
        host.id = 'np-screenshare-ui-host';
        host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'closed' });

        const styles = document.createElement('style');
        styles.textContent = `
            *, *::before, *::after {
                margin: 0; padding: 0; box-sizing: border-box;
                font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
                line-height: 1.5;
                -webkit-text-fill-color: currentColor;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -45%); }
                to   { opacity: 1; transform: translate(-50%, -50%); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translate(-50%, -50%); }
                to   { opacity: 0; transform: translate(-50%, -45%); }
            }
            .np-root {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                padding: 1px;
                background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
                border-radius: 8px;
                z-index: 2147483647;
                animation: fadeIn 0.3s ease-in;
            }
            .np-container {
                position: relative;
                background-color: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(16px);
                color: #ffffff;
                padding: 24px;
                border-radius: 7px;
                min-width: 500px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .np-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            .np-title {
                font-size: 18px;
                font-weight: 700;
                background: linear-gradient(to right, #60a5fa, #a78bfa, #f472b6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .np-close {
                background: none;
                border: none;
                color: #9ca3af;
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
            }
            .np-close:hover { color: #ffffff; }
            .np-description {
                font-size: 14px;
                color: #d1d5db;
                margin-bottom: 24px;
                background: rgba(255, 255, 255, 0.05);
                padding: 12px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .np-description span { color: #34d399; font-weight: 600; }
            .np-btn-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
            }
            .np-btn-card {
                position: relative;
                padding: 1px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                transition: transform 0.2s;
            }
            .np-btn-card:hover { transform: translateY(-2px); }
            .np-btn-card.orange:hover { background: linear-gradient(to bottom right, #f97316, #ef4444); }
            .np-btn-card.green:hover { background: linear-gradient(to bottom right, #22c55e, #10b981); }
            .np-btn-card.purple:hover { background: linear-gradient(to bottom right, #8b5cf6, #ec4899); }
            
            .np-btn {
                width: 100%;
                height: 100%;
                background: #000000;
                border: none;
                border-radius: 7px;
                color: #ffffff;
                padding: 12px 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            .np-btn:hover { background: #111111; }
        `;
        shadow.appendChild(styles);

        const root = document.createElement('div');
        root.className = 'np-root';
        root.innerHTML = `
            <div class="np-container">
                <div class="np-header">
                    <div class="np-title">NeoPass Screenshare</div>
                    <button class="np-close">&times;</button>
                </div>
                <div class="np-description">
                    Mode: <span>Stealth Protocol Active</span><br>
                    Redirection: Selected source will be reported as "Full Monitor" to the website.
                </div>
                <div class="np-btn-grid">
                    <div class="np-btn-card orange">
                        <button class="np-btn" id="mode-tab">Share Tab/Window</button>
                    </div>
                    <div class="np-btn-card green">
                        <button class="np-btn" id="mode-blank">Share Blank Screen</button>
                    </div>
                    <div class="np-btn-card purple">
                        <button class="np-btn" id="mode-freeze">Share Frozen Screen</button>
                    </div>
                </div>
            </div>
        `;
        shadow.appendChild(root);

        const cleanup = () => {
            root.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => host.remove(), 280);
        };

        // Event Listeners
        root.querySelector('.np-close').onclick = () => {
            cleanup();
            reject(new Error('Screenshare cancelled by user'));
        };

        root.querySelector('#mode-tab').onclick = async () => {
            cleanup();
            try {
                let ssConstraints;
                if (isMac) {
                    ssConstraints = {
                        video: { displaySurface: "browser", logicalSurface: true, cursor: "always" },
                        audio: false,
                        selfBrowserSurface: "include",
                        surfaceSwitching: "include"
                    };
                } else {
                    ssConstraints = {
                        selfBrowserSurface: "include",
                        monitorTypeSurfaces: "exclude",
                        video: { displaySurface: "window" }
                    };
                }

                const stream = await originalGetDisplayMedia.call(navigator.mediaDevices, ssConstraints);
                const videoTrack = stream.getVideoTracks()[0];
                
                // Spoof the settings to report as 'monitor'
                const originalGetSettings = videoTrack.getSettings.bind(videoTrack);
                videoTrack.getSettings = function() {
                    const settings = originalGetSettings();
                    settings.displaySurface = 'monitor';
                    return settings;
                };
                resolve(stream);
            } catch (err) { reject(err); }
        };

        root.querySelector('#mode-blank').onclick = () => {
            cleanup();
            const canvas = document.createElement('canvas');
            canvas.width = 1920; canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const stream = canvas.captureStream(30);
            const videoTrack = stream.getVideoTracks()[0];

            const originalGetSettings = videoTrack.getSettings.bind(videoTrack);
            videoTrack.getSettings = function() {
                const settings = originalGetSettings();
                settings.displaySurface = 'monitor';
                settings.width = 1920; settings.height = 1080;
                settings.frameRate = 30;
                return settings;
            };

            Object.defineProperty(videoTrack, 'label', {
                get: () => 'screen:0:0',
                configurable: true
            });

            resolve(stream);
        };

        root.querySelector('#mode-freeze').onclick = async () => {
            cleanup();
            try {
                // Temporarily hide the UI if it's visible in the capture
                const stream = await originalGetDisplayMedia.call(navigator.mediaDevices, { video: { displaySurface: "monitor" } });
                const videoTrack = stream.getVideoTracks()[0];
                const { width, height } = videoTrack.getSettings();

                const canvas = document.createElement('canvas');
                canvas.width = width || 1920; canvas.height = height || 1080;
                const ctx = canvas.getContext('2d');

                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                await video.play();

                // Wait a moment for the capture to stabilize
                await new Promise(r => setTimeout(r, 500));
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Stop the real stream
                stream.getTracks().forEach(t => t.stop());
                video.srcObject = null;

                // Return the frozen canvas stream
                const frozenStream = canvas.captureStream(30);
                const frozenTrack = frozenStream.getVideoTracks()[0];

                const originalGetSettings = frozenTrack.getSettings.bind(frozenTrack);
                frozenTrack.getSettings = function() {
                    const settings = originalGetSettings();
                    settings.displaySurface = 'monitor';
                    settings.width = canvas.width;
                    settings.height = canvas.height;
                    settings.frameRate = 30;
                    return settings;
                };

                Object.defineProperty(frozenTrack, 'label', {
                    get: () => 'screen:0:0',
                    configurable: true
                });

                resolve(frozenStream);
            } catch (err) { reject(err); }
        };
    }

    // Initialize
    spoofScreenRecording();
})();