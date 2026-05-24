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
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            *, *::before, *::after {
                margin: 0; padding: 0; box-sizing: border-box;
                font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
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
            @keyframes accentPulse {
                0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.08); }
                50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.15); }
            }
            .np-root {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 3px;
                z-index: 2147483647;
                animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.65), 0 0 24px rgba(168, 85, 247, 0.1);
            }
            .np-container {
                position: relative;
                background: linear-gradient(180deg, #120020 0%, #08000F 100%);
                backdrop-filter: blur(20px);
                color: #F3E8FF;
                padding: 24px;
                border-radius: 3px;
                min-width: 480px;
                border: 1px solid rgba(168, 85, 247, 0.15);
                animation: accentPulse 4s ease-in-out infinite;
                overflow: hidden;
            }
            .np-container::before {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 2px;
                background: linear-gradient(90deg, #7C3AED, #A855F7);
            }
            .np-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 14px;
                border-bottom: 1px solid rgba(168, 85, 247, 0.12);
            }
            .np-title {
                font-size: 15px;
                font-weight: 600;
                color: #A855F7;
                letter-spacing: -0.01em;
                -webkit-text-fill-color: #A855F7;
            }
            .np-close {
                background: transparent;
                border: 1px solid transparent;
                color: rgba(243, 232, 255, 0.28);
                font-size: 20px;
                cursor: pointer;
                padding: 4px 6px;
                border-radius: 3px;
                transition: all 0.18s ease;
                line-height: 1;
                -webkit-text-fill-color: rgba(243, 232, 255, 0.28);
            }
            .np-close:hover {
                color: #F3E8FF;
                -webkit-text-fill-color: #F3E8FF;
                background: rgba(168, 85, 247, 0.08);
                border-color: rgba(168, 85, 247, 0.15);
            }
            .np-description {
                font-size: 12px;
                color: rgba(243, 232, 255, 0.55);
                -webkit-text-fill-color: rgba(243, 232, 255, 0.55);
                margin-bottom: 20px;
                background: rgba(168, 85, 247, 0.04);
                padding: 12px 14px;
                border-radius: 3px;
                border: 1px solid rgba(168, 85, 247, 0.1);
                border-left: 3px solid rgba(168, 85, 247, 0.4);
                line-height: 1.6;
            }
            .np-description span {
                color: #4ADE80;
                -webkit-text-fill-color: #4ADE80;
                font-weight: 600;
            }
            .np-btn-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
            }
            .np-btn-card {
                position: relative;
                border-radius: 3px;
                transition: all 0.18s ease;
            }
            .np-btn-card:hover { transform: translateY(-1px); }

            .np-btn {
                width: 100%;
                height: 100%;
                background: rgba(168, 85, 247, 0.06);
                border: 1px solid rgba(168, 85, 247, 0.15);
                border-radius: 3px;
                color: rgba(243, 232, 255, 0.55);
                -webkit-text-fill-color: rgba(243, 232, 255, 0.55);
                padding: 14px 10px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                transition: all 0.18s ease;
            }
            .np-btn:hover {
                background: rgba(168, 85, 247, 0.12);
                border-color: rgba(168, 85, 247, 0.4);
                color: #F3E8FF;
                -webkit-text-fill-color: #F3E8FF;
                box-shadow: 0 0 12px rgba(168, 85, 247, 0.15);
            }
            .np-btn:active {
                transform: scale(0.97);
            }
            .np-btn-primary {
                background: linear-gradient(135deg, #6D28D9 0%, #A855F7 100%);
                border: none;
                color: #ffffff;
                -webkit-text-fill-color: #ffffff;
            }
            .np-btn-primary:hover {
                box-shadow: 0 0 16px rgba(168, 85, 247, 0.3);
                background: linear-gradient(135deg, #7C3AED 0%, #B56EF8 100%);
            }
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
                    <div class="np-btn-card">
                        <button class="np-btn" id="mode-tab">Share Tab/Window</button>
                    </div>
                    <div class="np-btn-card">
                        <button class="np-btn np-btn-primary" id="mode-blank">Share Blank Screen</button>
                    </div>
                    <div class="np-btn-card">
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