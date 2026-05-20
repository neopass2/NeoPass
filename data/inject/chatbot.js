if (typeof chrome === "undefined") {}

if (typeof window.isMac === 'undefined') {
    window.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                   navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
}

(function() {
    chrome.storage.local.get(['stealth'], function(result) {
        if (window.chatOverlayInjected) {
            console.log("Chat overlay script already injected.");
            return;
        }
        window.chatOverlayInjected = true;
        
        // Helper to get elements from shadow DOM
        function getShadowRoot() {
            return document.getElementById("chat-overlay-shadow-host")?.shadowRoot;
        }

        function getShadowElement(id) {
            return getShadowRoot()?.getElementById(id);
        }

        function getChatButton() {
            return document.getElementById("chat-button-shadow-host")?.shadowRoot?.getElementById("chat-button");
        }

        // State variables
        let isOverlayVisible = false;
        let chatHistory = [];
        let isDragging = false;
        let isResizing = false;
        let markdownConverter = null; 
        let chatAboutQuestionEnabled = false; 
        let extractedQuestion = null; 
        let currentStreamingDiv = null;

        // Drag and resize state
        let dragOffsetX;
        let dragOffsetY;
        let initialWidth;
        let initialHeight;
        let resizeStartX;
        let resizeStartY;

        // SVG Constants
        const CHAT_ICON_SVG_URL = `url("data:image/svg+xml,%3Csvg height='30' width='35' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cdefs%3E%3Cfilter id='a' height='138.7%25' width='131.4%25' x='-15.7%25' y='-15.1%25'%3E%3CfeMorphology in='SourceAlpha' operator='dilate' radius='1' result='shadowSpreadOuter1'/%3E%3CfeOffset dy='1' in='shadowSpreadOuter1' result='shadowOffsetOuter1'/%3E%3CfeGaussianBlur in='shadowOffsetOuter1' result='shadowBlurOuter1' stdDeviation='1'/%3E%3CfeComposite in='shadowBlurOuter1' in2='SourceAlpha' operator='out' result='shadowBlurOuter1'/%3E%3CfeColorMatrix in='shadowBlurOuter1' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0'/%3E%3C/filter%3E%3Cpath id='b' d='M14.23 20.46l-9.65 1.1L3 5.12 30.07 2l1.58 16.46-9.37 1.07-3.5 5.72-4.55-4.8z'/%3E%3C/defs%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cuse fill='%23000' filter='url(%23a)' xlink:href='%23b'/%3E%3Cuse fill='%23fff' stroke='%23fff' stroke-width='2' xlink:href='%23b'/%3E%3C/g%3E%3C/svg%3E")`;

        function loadShowdown() {
            return new Promise((resolve, reject) => {
                if (typeof showdown !== 'undefined') {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('data/lib/showdown.min.js');
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        function loadPrism() {
            return new Promise((resolve) => {
                // Inline syntax highlighter to bypass CSP
                window.SimplePrism = {
                    highlightElement: function(codeElement) {
                        const code = codeElement.textContent;
                        const language = codeElement.className.replace('language-', '');
                        codeElement.innerHTML = this.simpleHighlight(code, language);
                    },
                    simpleHighlight: function(code, language) {
                        let highlighted = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        if (language === 'python') highlighted = this.highlightPython(highlighted);
                        else if (['javascript', 'js', 'typescript', 'ts'].includes(language)) highlighted = this.highlightJavaScript(highlighted);
                        else if (language === 'java') highlighted = this.highlightJava(highlighted);
                        else if (language === 'css') highlighted = this.highlightCSS(highlighted);
                        else if (language === 'html') highlighted = this.highlightHTML(highlighted);
                        else if (language === 'sql') highlighted = this.highlightSQL(highlighted);
                        else if (language === 'json') highlighted = this.highlightJSON(highlighted);
                        else highlighted = this.highlightJavaScript(highlighted);
                        return highlighted;
                    },
                    highlightPython: function(code) {
                        let tokens = [];
                        this.match(code, /#.*$/gm, 'comment', tokens);
                        this.match(code, /(['"])((?:\\.|(?!\1)[^\\])*?)\1/g, 'string', tokens);
                        this.match(code, /\b(def|class|if|elif|else|for|while|return|import|from|try|except|finally|with|as|and|or|not|in|is)\b/g, 'keyword', tokens);
                        this.match(code, /\b(True|False|None)\b/g, 'boolean', tokens);
                        this.match(code, /\b\d+(\.\d+)?\b/g, 'number', tokens);
                        return this.build(code, tokens);
                    },
                    highlightJavaScript: function(code) {
                        let tokens = [];
                        this.match(code, /\/\/.*$/gm, 'comment', tokens);
                        this.match(code, /\/\*[\s\S]*?\*\//g, 'comment', tokens);
                        this.match(code, /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, 'string', tokens);
                        this.match(code, /\b(function|const|let|var|if|else|for|while|return|import|export|class|extends|new|this|typeof|instanceof|async|await)\b/g, 'keyword', tokens);
                        this.match(code, /\b(true|false|null|undefined)\b/g, 'boolean', tokens);
                        this.match(code, /\b\d+(\.\d+)?\b/g, 'number', tokens);
                        return this.build(code, tokens);
                    },
                    highlightJava: function(code) {
                        let tokens = [];
                        this.match(code, /\/\/.*$/gm, 'comment', tokens);
                        this.match(code, /\/\*[\s\S]*?\*\//g, 'comment', tokens);
                        this.match(code, /(['"])((?:\\.|(?!\1)[^\\])*?)\1/g, 'string', tokens);
                        this.match(code, /\b(public|private|protected|static|final|class|interface|extends|implements|if|else|for|while|return|import|package|new|this|void)\b/g, 'keyword', tokens);
                        this.match(code, /\b(true|false|null)\b/g, 'boolean', tokens);
                        this.match(code, /\b\d+(\.\d+)?[fFdDlL]?\b/g, 'number', tokens);
                        return this.build(code, tokens);
                    },
                    highlightCSS: function(code) {
                        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
                        code = code.replace(/([.#][a-zA-Z][a-zA-Z0-9_-]*)/g, '<span class="selector">$1</span>');
                        code = code.replace(/([a-zA-Z-]+)(\s*:)/g, '<span class="property">$1</span>$2');
                        code = code.replace(/(#[0-9a-fA-F]+)/g, '<span class="value">$1</span>');
                        return code;
                    },
                    highlightHTML: function(code) {
                        code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>');
                        code = code.replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="tag">$1</span>');
                        return code;
                    },
                    highlightSQL: function(code) {
                        code = code.replace(/--.*$/gm, '<span class="comment">$&</span>');
                        code = code.replace(/'[^']*'/g, '<span class="string">$&</span>');
                        code = code.replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|PRIMARY|KEY|FOREIGN|NOT|NULL|DEFAULT|AND|OR|ORDER|BY|GROUP|HAVING|LIMIT)\b/gi, '<span class="keyword">$1</span>');
                        code = code.replace(/\b\d+(\.\d+)?\b/g, '<span class="number">$&</span>');
                        return code;
                    },
                    highlightJSON: function(code) {
                        code = code.replace(/"([^"]*)"(\s*:)/g, '<span class="property">"$1"</span>$2');
                        code = code.replace(/"([^"]*)"/g, '<span class="string">"$1"</span>');
                        code = code.replace(/\b(true|false|null)\b/g, '<span class="boolean">$1</span>');
                        code = code.replace(/\b\d+(\.\d+)?\b/g, '<span class="number">$&</span>');
                        return code;
                    },
                    match: function(code, regex, type, tokens) {
                        let match;
                        while ((match = regex.exec(code)) !== null) {
                            if (!tokens.some(t => match.index >= t.start && match.index < t.end)) {
                                tokens.push({ start: match.index, end: match.index + match[0].length, type: type, content: match[0] });
                            }
                        }
                    },
                    build: function(code, tokens) {
                        tokens.sort((a, b) => a.start - b.start);
                        let result = '', last = 0;
                        tokens.forEach(t => {
                            result += code.slice(last, t.start) + `<span class="${t.type}">${t.content}</span>`;
                            last = t.end;
                        });
                        return result + code.slice(last);
                    }
                };
                resolve();
            });
        }

        // Question extraction
        function detectPlatform() {
            if (document.querySelector('div[aria-labelledby="question-data"]')) return 'examly';
            if (document.querySelector('.QuestionDetails_container__AIu0X') || document.querySelector('.monaco-editor') || document.querySelector('.grouped-mcq__question') || document.querySelector('#main-splitpane-left')) return 'hackerrank';
            return null;
        }

        function extractExamlyQuestion() {
            const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
            if (!questionElement) return null;
            const questionText = questionElement.innerText.trim();
            const codingQuestionElement = document.querySelector('div[aria-labelledby="input-format"]');
            
            if (codingQuestionElement) {
                const lang = document.querySelector('span.inner-text')?.innerText.trim() || 'Unknown';
                const inputFmt = document.querySelector('div[aria-labelledby="input-format"]')?.innerText.trim() || '';
                const outputFmt = document.querySelector('div[aria-labelledby="output-format"]')?.innerText.trim() || '';
                let testCases = '';
                document.querySelectorAll('div[aria-labelledby="each-tc-card"]').forEach((tc, i) => {
                    const inp = tc.querySelector('div[aria-labelledby="each-tc-input-container"] pre')?.innerText.trim() || '';
                    const outp = tc.querySelector('div[aria-labelledby="each-tc-output-container"] pre')?.innerText.trim() || '';
                    testCases += `Sample TC ${i + 1}:\nInput:\n${inp}\nOutput:\n${outp}\n\n`;
                });

                // Whitelist and snippets
                let whitelistText = '';
                const instructionCards = document.querySelectorAll('div[aria-labelledby="instruction-card"]');
                instructionCards.forEach(card => {
                    const header = card.querySelector('[aria-labelledby="instruction-header"]');
                    if (header && header.textContent.trim().toLowerCase().includes('whitelist')) {
                        const sets = card.querySelectorAll('[aria-labelledby="list"]');
                        sets.forEach(set => {
                            const setHeader = set.querySelector('[aria-labelledby="set-header"]');
                            const values = set.querySelectorAll('[aria-labelledby="list-value-card"]');
                            const keywords = Array.from(values).map(v => v.textContent.trim()).filter(Boolean);
                            if (keywords.length > 0) {
                                const setName = setHeader ? setHeader.textContent.trim() : '';
                                whitelistText += (setName ? setName + ' ' : '') + keywords.join(', ') + '\n';
                            }
                        });
                    }
                });

                let headerSnippet = '', footerSnippet = '';
                const hEd = document.querySelector('[aria-labelledby="editor-question"][id*="ttHeaderEditor"]');
                const fEd = document.querySelector('[aria-labelledby="editor-question"][id*="ttFooterEditor"]');
                if (hEd) headerSnippet = Array.from(hEd.querySelectorAll('.ace_line')).map(l => l.textContent).join('\n').trim();
                if (fEd) footerSnippet = Array.from(fEd.querySelectorAll('.ace_line')).map(l => l.textContent).join('\n').trim();

                return { type: 'coding', language: lang, question: questionText, inputFormat: inputFmt, outputFormat: outputFmt, testCases: testCases, whitelist: whitelistText, headerSnippet, footerSnippet };
            } else {
                const code = Array.from(document.querySelectorAll('.ace_layer.ace_text-layer .ace_line')).map(l => l.innerText.trim()).join('\n') || null;
                const options = Array.from(document.querySelectorAll('div[aria-labelledby="each-option"]')).map((o, i) => `Option ${i + 1}: ${o.innerText.trim()}`).join('\n');
                return { type: 'mcq', question: questionText, code: code, options: options };
            }
        }

        function extractHackerRankQuestion() {
            const getCleanText = el => el?.innerText?.trim() || "";
            const monaco = document.querySelector('.monaco-editor, .hr-monaco-editor');
            if (monaco) {
                let lang = getCleanText(document.querySelector('.select-language .css-3d4y2u-singleValue, .select-language .css-x7738g')) || "Unknown";
                let title = "No Title", inst = "No Instructions", details = "";
                const container = document.querySelector('.QuestionDetails_container__AIu0X') || document.querySelector('#main-splitpane-left');
                if (container) {
                    title = getCleanText(container.querySelector('.qaas-block-question-title, h2, .question-view__title')).replace(/Bookmark question \d+/g, '').trim();
                    inst = getCleanText(container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5, .question-view__instruction'));
                    details = Array.from(container.querySelectorAll('details')).map(d => {
                        const s = getCleanText(d.querySelector('summary')), c = getCleanText(d.querySelector('.collapsable-details'));
                        return `\n${s}\n${'-'.repeat(s.length)}\n${c}`;
                    }).join('\n');
                }
                return { type: 'coding', language: lang, title: title, instruction: inst, details: details };
            } else {
                const container = document.querySelector('.QuestionDetails_container__AIu0X, .grouped-mcq__question');
                if (container) {
                    const title = getCleanText(container.querySelector('.qaas-block-question-title, h2, .question-view__title')).replace(/Bookmark question \d+/g, '').trim();
                    const inst = getCleanText(container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5, .question-view__instruction'));
                    let options = [];
                    container.querySelectorAll('[role="radio"], [role="checkbox"], .ui-radio').forEach((o, i) => {
                        const label = o.querySelector('.label') || (o.getAttribute('aria-labelledby') ? document.getElementById(o.getAttribute('aria-labelledby')) : o.closest('li')?.querySelector('label'));
                        if (label) options.push(`Option ${i + 1}: ${label.textContent.trim()}`);
                    });
                    return { type: 'mcq', title: title, instruction: inst, options: options.join('\n') };
                }
            }
            return null;
        }

        function extractCurrentQuestion() {
            const p = detectPlatform();
            if (p === 'examly') return extractExamlyQuestion();
            if (p === 'hackerrank') return extractHackerRankQuestion();
            return null;
        }

        function formatQuestionForChat(q) {
            if (!q) return null;
            let f = '';
            if (q.type === 'coding') {
                f += `[Coding Question - ${q.language}]\n\n`;
                if (q.title) f += `Title: ${q.title}\n\n`;
                if (q.question) f += `Question:\n${q.question}\n\n`;
                if (q.instruction) f += `Instruction:\n${q.instruction}\n\n`;
                if (q.inputFormat) f += `Input Format:\n${q.inputFormat}\n\n`;
                if (q.outputFormat) f += `Output Format:\n${q.outputFormat}\n\n`;
                if (q.testCases) f += `Test Cases:\n${q.testCases}\n\n`;
                if (q.whitelist) f += `Whitelisted Keywords:\n${q.whitelist}\n\n`;
                if (q.headerSnippet) f += `Header Snippet:\n${q.headerSnippet}\n\n`;
                if (q.footerSnippet) f += `Footer Snippet:\n${q.footerSnippet}\n\n`;
                if (q.details) f += `Details:${q.details}\n\n`;
            } else {
                f += `[MCQ Question]\n\n`;
                if (q.title) f += `Title: ${q.title}\n\n`;
                if (q.question) f += `Question:\n${q.question}\n\n`;
                if (q.instruction) f += `${q.instruction}\n\n`;
                if (q.code) f += `Code:\n${q.code}\n\n`;
                if (q.options) f += `Options:\n${q.options}\n`;
            }
            return f.trim();
        }

        function createChatOverlay() {
            if (document.getElementById("chat-overlay-shadow-host")) return;

            const shadowHost = document.createElement("div");
            shadowHost.id = "chat-overlay-shadow-host";
            shadowHost.style.cssText = "position: fixed; bottom: 0; right: 0; z-index: 2147483647; pointer-events: none;";
            const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

            const overlay = document.createElement("div");
            overlay.id = "chat-overlay";
            overlay.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; width: 380px; height: 500px;
                background-color: #fff; border: none; border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); flex-direction: column;
                font-family: 'Poppins', sans-serif; overflow: hidden;
                transition: opacity 0.3s ease; pointer-events: auto; display: none;
            `;

            const header = document.createElement("div");
            header.style.cssText = "padding: 16px 20px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; background-color: #fff; color: #333; cursor: move;";
            header.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; color: #3c5472; opacity: 0.85;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg> Chat
                    </span>
                    <span style="font-size: 12px; color: #777; margin-left: 30px;">${window.isMac ? 'Option+C' : 'Alt+C'} to toggle</span>
                </div>
                <div style="display: flex; gap: 14px; align-items: center;">
                    <span id="clear-chat" style="cursor: pointer; font-size: 14px; font-weight: 600; color: #dc3545;">Clear</span>
                    <span id="close-chat" style="cursor: pointer; font-size: 22px; color: #888;">×</span>
                </div>`;

            const sliderContainer = document.createElement("div");
            sliderContainer.style.cssText = "width: 100%; height: 2px; background: rgba(60,84,114,0.1); position: relative; z-index: 10; display: flex; align-items: center;";
            const slider = document.createElement("input");
            slider.type = "range"; slider.min = "15"; slider.max = "100"; slider.value = "100"; slider.id = "opacity-slider";
            sliderContainer.appendChild(slider);

            const messagesContainer = document.createElement("div");
            messagesContainer.id = "chat-messages";
            messagesContainer.style.cssText = "padding: 20px; flex: 1; overflow-y: auto; background: #fafafa; display: flex; flex-direction: column; gap: 12px;";

            const inputArea = document.createElement("div");
            inputArea.style.cssText = "padding: 12px 16px 16px; background: #fff; display: flex; flex-direction: column; gap: 8px; z-index: 10;";
            
            const checkboxContainer = document.createElement("div");
            checkboxContainer.id = "chat-about-question-container";
            checkboxContainer.style.cssText = "display: none; align-items: center; gap: 8px; padding: 4px 0;";
            checkboxContainer.innerHTML = `<input type="checkbox" id="chat-about-question-checkbox" style="width: 16px; height: 16px; accent-color: #3c5472;">
                <label for="chat-about-question-checkbox" style="font-size: 13px; color: #666; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span>Chat about question</span>
                </label>`;

            const pill = document.createElement("div");
            pill.style.cssText = "display: flex; align-items: stretch; background: #f4f6f8; border: 1px solid rgba(0,0,0,0.08); border-radius: 24px; overflow: hidden; min-height: 44px;";
            
            const input = document.createElement("div");
            input.contentEditable = "plaintext-only"; input.placeholder = "Message...";
            input.style.cssText = "flex: 1; padding: 12px 16px; outline: none; font-size: 14px; max-height: 66px; overflow-y: auto; white-space: pre-wrap;";
            
            const sendBtn = document.createElement("button");
            sendBtn.id = "send-button"; sendBtn.innerText = "Send";
            sendBtn.style.cssText = "padding: 0 20px; background: #3c5472; color: #fff; font-weight: 500; font-size: 14px;";

            pill.appendChild(input); pill.appendChild(sendBtn);
            inputArea.appendChild(checkboxContainer); inputArea.appendChild(pill);
            
            const resizer = document.createElement("div");
            resizer.style.cssText = "position: absolute; top: 0; left: 0; width: 12px; height: 12px; background: #3c5472; cursor: nw-resize; border-radius: 12px 0; opacity: 0.8;";

            const style = document.createElement('style');
            style.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                * { box-sizing: border-box; font-family: 'Poppins', sans-serif; }
                
                #chat-overlay {
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    background-color: rgba(255, 255, 255, 0.75);
                    border: 1px solid rgba(209, 213, 219, 0.3);
                }

                #opacity-slider { -webkit-appearance: none; width: 100%; height: 2px; background: transparent; outline: none; }
                #opacity-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 8px; border-radius: 4px; background: #3c5472; cursor: pointer; }
                
                #chat-messages::-webkit-scrollbar { width: 6px; }
                #chat-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
                
                /* Syntax Highlighting Colors */
                .keyword { color: #d73a49; font-weight: 600; }
                .string { color: #032f62; }
                .comment { color: #6a737d; font-style: italic; }
                .number { color: #005cc5; }
                .boolean { color: #d73a49; font-weight: 600; }
                .property { color: #6f42c1; }
                .selector { color: #22863a; }
                .tag { color: #22863a; }
                .function { color: #6f42c1; }
                
                @keyframes typing { 
                    0%, 20% { transform: translateY(0); opacity: .5; } 
                    50% { transform: translateY(-4px); opacity: 1; } 
                    80%, 100% { transform: translateY(0); opacity: .5; } 
                }

                pre {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0,0,0,0.1) transparent;
                }
                pre::-webkit-scrollbar { height: 4px; }
                pre::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
            `;

            shadowRoot.appendChild(style);
            overlay.appendChild(header); overlay.appendChild(sliderContainer); overlay.appendChild(messagesContainer); overlay.appendChild(inputArea); overlay.appendChild(resizer);
            shadowRoot.appendChild(overlay);
            document.body.appendChild(shadowHost);

            // Listeners
            header.addEventListener("mousedown", (e) => { isDragging = true; dragOffsetX = e.clientX - overlay.getBoundingClientRect().left; dragOffsetY = e.clientY - overlay.getBoundingClientRect().top; });
            resizer.addEventListener("mousedown", (e) => { isResizing = true; resizeStartX = e.clientX; resizeStartY = e.clientY; initialWidth = overlay.offsetWidth; initialHeight = overlay.offsetHeight; e.stopPropagation(); });
            
            slider.addEventListener("input", (e) => { overlay.style.opacity = e.target.value / 100; });
            slider.addEventListener("change", (e) => {
                const val = parseInt(e.target.value);
                chrome.storage.local.set({ stealth: val < 100, stealthOpacity: val });
            });

            const checkboxEl = shadowRoot.querySelector("#chat-about-question-checkbox");
            checkboxEl.addEventListener('change', function() {
                chatAboutQuestionEnabled = this.checked;
                if (this.checked) {
                    const qData = extractCurrentQuestion();
                    if (qData) { extractedQuestion = formatQuestionForChat(qData); shadowRoot.querySelector('label[for="chat-about-question-checkbox"]').style.color = '#3c5472'; }
                    else { this.checked = false; chatAboutQuestionEnabled = false; addNotificationMessage("No question detected."); }
                } else { shadowRoot.querySelector('label[for="chat-about-question-checkbox"]').style.color = '#666'; }
            });

            header.querySelector("#close-chat").onclick = () => { isOverlayVisible = false; overlay.style.display = "none"; };
            header.querySelector("#clear-chat").onclick = () => clearChatHistoryAndUI('manual');

            sendBtn.onclick = async () => {
                const msg = input.innerText.trim();
                if (!msg) return;
                const finalMsg = chatAboutQuestionEnabled && extractedQuestion ? `Context:\n${extractedQuestion}\n\n---\n\nQuestion: ${msg}` : msg;
                chatHistory.push({ role: "user", content: msg });
                addMessageToChat(msg, "user");
                input.innerText = "";
                const loading = addLoadingIndicator();
                messagesContainer.appendChild(loading);

                chrome.runtime.sendMessage({ action: "processChatMessage", message: finalMsg, context: chatHistory.filter(h => h.role !== 'error') });
            };

            input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } };

            setInterval(() => {
                const p = detectPlatform();
                checkboxContainer.style.display = p ? 'flex' : 'none';
            }, 2000);

            return overlay;
        }

        function createChatButton() {
            if (document.getElementById("chat-button-shadow-host")) return;
            const host = document.createElement("div");
            host.id = "chat-button-shadow-host";
            host.style.cssText = "position: fixed; bottom: 0; right: 0; z-index: 2147483647; pointer-events: none;";
            const root = host.attachShadow({ mode: 'open' });
            
            const btn = document.createElement("button");
            btn.id = "chat-button";
            btn.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; width: 54px; height: 54px;
                background-color: #3c5472; border-radius: 50%; border: none; cursor: pointer;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1); pointer-events: auto; display: flex; align-items: center; justify-content: center;
            `;
            btn.innerHTML = `<span style="width:30px; height:30px; display:block; background-image:${CHAT_ICON_SVG_URL}; background-size:contain; background-repeat:no-repeat;"></span>`;
            
            root.appendChild(btn);
            document.body.appendChild(host);

            let dx, dy, ix, iy, dragging = false, moved = false;
            btn.onmousedown = (e) => { dragging = true; moved = false; dx = e.clientX; dy = e.clientY; ix = btn.offsetLeft; iy = btn.offsetTop; };
            document.addEventListener("mousemove", (e) => {
                if (!dragging) return;
                const dX = e.clientX - dx, dY = e.clientY - dy;
                if (Math.abs(dX) > 5 || Math.abs(dY) > 5) moved = true;
                btn.style.left = Math.min(Math.max(0, ix + dX), window.innerWidth - 54) + "px";
                btn.style.top = Math.min(Math.max(0, iy + dY), window.innerHeight - 54) + "px";
                btn.style.bottom = btn.style.right = "auto";
            });
            document.addEventListener("mouseup", () => { if (dragging) { dragging = false; if (!moved) toggleChatOverlay(); } });

            return btn;
        }

        function addMessageToChat(msg, role) {
            const container = getShadowElement("chat-messages");
            if (!container) return;
            const div = document.createElement("div");
            div.style.cssText = `
                margin-bottom: 12px; padding: 12px 16px; border-radius: 16px; max-width: 85%;
                word-wrap: break-word; font-size: 14px; line-height: 1.5;
                ${role === "user" ? "background:#3c5472; color:#fff; align-self:flex-end; border-bottom-right-radius:4px;" : "background:#fff; color:#333; align-self:flex-start; border:1px solid #eaeaea; border-bottom-left-radius:4px;"}
            `;
            container.appendChild(div);
            renderChatContent(div, msg);
            container.scrollTop = container.scrollHeight;
            return div;
        }

        function renderChatContent(div, content) {
            if (typeof showdown !== 'undefined') {
                if (!markdownConverter) markdownConverter = new showdown.Converter();
                div.innerHTML = markdownConverter.makeHtml(content);
                div.querySelectorAll("pre code").forEach(block => {
                    let lang = block.className.replace('language-', '') || detectLanguage(block.textContent);
                    block.className = `language-${lang}`;
                    if (window.SimplePrism) window.SimplePrism.highlightElement(block);
                    
                    const pre = block.parentNode;
                    pre.style.cssText = "background:#f8f9fa; border:1px solid #e1e4e8; border-radius:6px; margin:15px 0; padding:12px; position:relative; overflow-x:auto;";
                    
                    const copy = document.createElement("button");
                    copy.innerText = "Copy"; copy.style.cssText = "position:absolute; right:8px; top:8px; background:#3c5472; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; opacity:0; transition:opacity .2s;";
                    pre.onmouseenter = () => copy.style.opacity = "1";
                    pre.onmouseleave = () => copy.style.opacity = "0";
                    copy.onclick = () => { navigator.clipboard.writeText(block.innerText).then(() => { copy.innerText = "Copied"; setTimeout(() => copy.innerText = "Copy", 2000); }); };
                    pre.appendChild(copy);
                });
            } else { div.textContent = content; }
        }

        function addLoadingIndicator() {
            const div = document.createElement("div");
            div.id = "loading-message";
            div.style.cssText = "margin-bottom:16px; padding:14px 16px; border-radius:14px; background:#fff; align-self:flex-start; border:1px solid rgba(0,0,0,0.08); display:flex; align-items:center; gap:8px; font-size:14px; color:rgba(0,0,0,0.6);";
            div.innerHTML = 'Thinking <div style="display:flex; gap:4px;"><div style="width:6px; height:6px; background:rgba(0,0,0,.4); border-radius:50%; animation:typing 1.4s infinite"></div><div style="width:6px; height:6px; background:rgba(0,0,0,.4); border-radius:50%; animation:typing 1.4s infinite .2s"></div><div style="width:6px; height:6px; background:rgba(0,0,0,.4); border-radius:50%; animation:typing 1.4s infinite .4s"></div></div>';
            return div;
        }

        function addNotificationMessage(msg) {
            const container = getShadowElement("chat-messages");
            if (!container) return;
            const div = document.createElement("div");
            div.textContent = msg;
            div.style.cssText = "margin:12px auto; padding:6px 12px; background:rgba(60,84,114,0.08); border-radius:12px; color:#3c5472; font-size:11px; text-align:center; font-weight:500; width:fit-content;";
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function toggleChatOverlay() {
            isOverlayVisible = !isOverlayVisible;
            let overlay = getShadowElement("chat-overlay");
            if (!overlay) overlay = createChatOverlay();
            if (overlay) {
                overlay.style.display = isOverlayVisible ? "flex" : "none";
                if (isOverlayVisible) {
                    chrome.storage.local.get(['stealth', 'stealthOpacity'], result => {
                        overlay.style.opacity = result.stealth ? (result.stealthOpacity / 100) : 1;
                        setTimeout(() => getShadowRoot()?.querySelector('[contenteditable]')?.focus(), 100);
                    });
                }
            }
        }

        function clearChatHistoryAndUI(reason) {
            const container = getShadowElement("chat-messages");
            if (container) { chatHistory = []; container.innerHTML = ""; chrome.runtime.sendMessage({ action: "resetContext" }); addNotificationMessage("Chat history cleared."); }
        }

        function detectLanguage(code) {
            const c = code.toLowerCase();
            if (c.includes('def ') || c.includes('import ') || c.includes('print(')) return 'python';
            if (c.includes('public class') || c.includes('system.out.println')) return 'java';
            if (c.includes('#include') || c.includes('int main')) return 'cpp';
            return 'javascript';
        }

        function clearErrorState() {}

        // Global events
        document.addEventListener("mousemove", (e) => {
            const overlay = getShadowElement("chat-overlay");
            if (isDragging && overlay) {
                const nL = Math.min(Math.max(0, e.clientX - dragOffsetX), window.innerWidth - overlay.offsetWidth);
                const nT = Math.min(Math.max(0, e.clientY - dragOffsetY), window.innerHeight - overlay.offsetHeight);
                overlay.style.left = nL + "px"; overlay.style.top = nT + "px";
                overlay.style.bottom = overlay.style.right = "auto";
            }
            if (isResizing && overlay) {
                const nW = Math.min(Math.max(250, initialWidth + (resizeStartX - e.clientX)), window.innerWidth - 40);
                const nH = Math.min(Math.max(200, initialHeight + (resizeStartY - e.clientY)), window.innerHeight - 40);
                const r = overlay.getBoundingClientRect();
                const nLeft = r.right - nW, nTop = r.bottom - nH;
                if (nLeft >= 0 && nTop >= 0) { overlay.style.width = nW + "px"; overlay.style.height = nH + "px"; overlay.style.left = nLeft + "px"; overlay.style.top = nTop + "px"; }
            }
        });

        document.addEventListener("mouseup", () => { isDragging = isResizing = false; });
        document.addEventListener("keydown", (e) => {
            if (e.altKey && e.code === "KeyC") { e.preventDefault(); toggleChatOverlay(); }
            if (e.key === "Escape" && isOverlayVisible) toggleChatOverlay();
        });

        async function init() {
            await Promise.all([loadShowdown(), loadPrism()]);
            createChatButton();
            chrome.storage.local.get(['stealth'], result => {
                const btn = getChatButton();
                if (result.stealth && btn) btn.style.opacity = "0";
            });
        }
        init();

        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === "updateChatHistory") {
                getShadowElement("loading-message")?.remove();
                if (message.role === "assistant") {
                    if (message.isStreaming) {
                        if (!currentStreamingDiv) currentStreamingDiv = addMessageToChat("", "assistant");
                        renderChatContent(currentStreamingDiv, message.content);
                    } else {
                        if (currentStreamingDiv) { renderChatContent(currentStreamingDiv, message.content); currentStreamingDiv = null; }
                        else addMessageToChat(message.content, "assistant");
                        chatHistory.push({ role: "assistant", content: message.content });
                    }
                } else if (message.role === "error") {
                    addMessageToChat(message.content, "error");
                }
            }
        });
    });
})();