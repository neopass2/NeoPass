// Full page AI solve feature

import { queryRequest } from '../../api/queryRequest.js';
import { showToast } from '../../ui/toasts.js';
import { extractJsonArrayFromText } from '../../utils/formatting.js';

// These functions run in page context via chrome.scripting.executeScript
function scrapeGenericPage() {
    const allText = document.body.innerText.trim();
    let tempIdCounter = 0;
    const selector = ['input','button','textarea','select','label','[role="radio"]','[role="checkbox"]','[role="button"]','[role="option"]','[contenteditable="true"]'].join(', ');
    const interactiveElements = Array.from(document.querySelectorAll(selector))
        .filter(el => { const rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden'; })
        .map(el => {
            const existingId = el.id && el.id.trim();
            const elementId = existingId || `neopass-temp-${++tempIdCounter}`;
            if (!existingId) { el.setAttribute('data-neopass-temp-id', elementId); }
            let labelText = '';
            if (el.tagName === 'LABEL') { labelText = el.innerText || el.textContent || ''; }
            else if (elementId) { const label = document.querySelector(`label[for='${elementId}']`); if (label) { labelText = label.innerText || label.textContent || ''; } }
            if (!labelText) { labelText = el.closest('label')?.innerText || el.innerText || el.value || el.name || el.getAttribute('aria-label') || ''; }
            return {
                id: elementId, tagName: el.tagName, type: el.type || null, name: el.name || null,
                value: el.value || null, checked: typeof el.checked === 'boolean' ? el.checked : null,
                disabled: !!el.disabled, role: el.getAttribute('role') || null,
                ariaLabel: el.getAttribute('aria-label') || null, placeholder: el.getAttribute('placeholder') || null,
                isContentEditable: el.isContentEditable, labelText: labelText.trim(),
                text: (el.innerText || el.textContent || '').trim().slice(0, 200)
            };
        });
    return { text: allText, interactiveElements };
}

function performGenericActions(decisions) {
    let actionsTaken = 0; let highlightedOnly = false;
    const resolveElement = (d) => { if(!d||!d.elementId)return null; return document.getElementById(d.elementId)||document.querySelector(`[data-neopass-temp-id="${CSS.escape(d.elementId)}"]`); };
    const markElement = (element, color) => { if(!element)return; element.style.outline=`3px solid ${color}`; element.style.outlineOffset='2px'; element.style.boxShadow=`0 0 0 2px ${color}33`; element.scrollIntoView({behavior:'smooth',block:'center',inline:'center'}); };
    const isSubmitLike = (element, decision) => {
        if(!element)return false;
        const tagName=element.tagName?element.tagName.toUpperCase():''; const type=(element.type||'').toLowerCase(); const role=(element.getAttribute('role')||'').toLowerCase();
        const labelText=(element.innerText||element.textContent||element.value||element.getAttribute('aria-label')||element.getAttribute('title')||'').toLowerCase();
        const submitKeywords=['submit','finish','final submit','save','next','end test','end exam','confirm'];
        const isSubmitText=submitKeywords.some(kw=>labelText.includes(kw));
        if(type==='submit')return true; if(tagName==='BUTTON'&&isSubmitText)return true; if(role==='button'&&isSubmitText)return true;
        if((decision?.action||'').toLowerCase()==='click'&&isSubmitText)return true; return false;
    };
    const interactWithElement = (element, decision) => {
        if(!element)return false;
        const tagName=element.tagName?element.tagName.toUpperCase():''; const action=(decision.action||'click').toLowerCase();
        try {
            if(isSubmitLike(element,decision)){markElement(element,'#ef4444');return false;}
            if(action==='type'){
                const value=decision.answerText??'';
                if(tagName==='INPUT'||tagName==='TEXTAREA'){element.focus();element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));markElement(element,'#34A853');return true;}
                if(element.isContentEditable){element.focus();element.textContent=value;element.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));markElement(element,'#34A853');return true;}
            }
            if(action==='select'&&tagName==='SELECT'){
                const targetValue=decision.answerText??''; const option=Array.from(element.options).find(opt=>opt.value===targetValue||opt.textContent.trim()===targetValue);
                if(option){element.value=option.value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));markElement(element,'#34A853');return true;}
            }
            const associatedLabel=tagName==='LABEL'?element:(element.id?document.querySelector(`label[for='${CSS.escape(element.id)}']`):null);
            const clickTarget=associatedLabel||element;
            clickTarget.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,cancelable:true,view:window}));
            clickTarget.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,view:window}));
            clickTarget.click();
            clickTarget.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true,view:window}));
            clickTarget.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
            const isChoiceControl=tagName==='INPUT'&&['radio','checkbox'].includes((element.type||'').toLowerCase());
            if(isChoiceControl){element.checked=true;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));}
            const actionProbablyWorked=isChoiceControl?element.checked:true;
            markElement(clickTarget,'#4285F4'); return actionProbablyWorked;
        }catch(error){console.error('Failed to interact with element:',error);return false;}
    };
    for(const decision of decisions){
        if(!decision||!decision.elementId)continue;
        const element=resolveElement(decision); if(!element)continue;
        const worked=interactWithElement(element,decision);
        if(worked){actionsTaken++;}else{highlightedOnly=true;markElement(element,'#f4b400');}
    }
    if(actionsTaken===0&&highlightedOnly)return{success:true,actionsTaken:0,highlightedOnly:true};
    if(actionsTaken===0&&decisions.length>0)return{success:false,actionsTaken:0,highlightedOnly:false};
    return{success:true,actionsTaken,highlightedOnly};
}

function buildGenericSolvePrompt(pageContent) {
    return [
        'You are an expert browser assistant solving questions from a webpage.',
        'Analyze the full page text and the provided interactive elements.',
        'Return ONLY a JSON array of action objects.',
        'Use only the element ids from the interactive elements list.',
        'Supported actions:',
        '{"action":"click","elementId":"..."}',
        '{"action":"type","elementId":"...","answerText":"..."}',
        '{"action":"select","elementId":"...","answerText":"..."}',
        'If the page contains questions, identify the correct answer controls and return actions in the order they should be applied.',
        'If an answer cannot be determined, omit it.','',
        'Webpage text:','---',pageContent.text,'---','',
        'Interactive elements:','---',JSON.stringify(pageContent.interactiveElements, null, 2),'---','',
        'Return only valid JSON. No code fences. No explanation.'
    ].join('\n');
}

function estimateQuestionCount(pageText) {
    if (!pageText || typeof pageText !== 'string') return 1;
    const questionMarkers = pageText.match(/(^|\n)\s*\d+\s*[.)]\s+/g) || [];
    return Math.max(1, questionMarkers.length);
}

async function handleFullPageAI(tabId) {
    try {
        showToast(tabId, 'Analyzing full page...', false, 'Scraping visible text and interactive controls from the page.');
        const results = await chrome.scripting.executeScript({ target: { tabId }, func: scrapeGenericPage });
        const pageContent = results?.[0]?.result;
        if (!pageContent || !pageContent.text || pageContent.text.trim().length < 20) {
            showToast(tabId, 'Not enough text on page to analyze.', true); return;
        }
        const prompt = buildGenericSolvePrompt(pageContent);
        const estimatedQuestions = estimateQuestionCount(pageContent.text);
        const response = await queryRequest(prompt, false, false, tabId, 'mcq', estimatedQuestions);
        if (typeof response !== 'string') {
            if (response && response.error) { showToast(tabId, response.error, true, response.detailedInfo || 'The page solve request could not be completed.'); }
            return;
        }
        const decisions = extractJsonArrayFromText(response);
        if (!Array.isArray(decisions) || decisions.length === 0) {
            showToast(tabId, 'AI returned no usable actions.', true, 'Try selecting a narrower section of the page or reloading the page.'); return;
        }
        const actionResults = await chrome.scripting.executeScript({ target: { tabId }, func: performGenericActions, args: [decisions] });
        const result = actionResults?.[0]?.result || { success: false, actionsTaken: 0, highlightedOnly: false };
        if (result.success) {
            if (result.highlightedOnly && result.actionsTaken === 0) { showToast(tabId, 'Answers found, but the page blocked automatic marking.', false, 'The matching controls were highlighted so you can review them manually.'); }
            else { showToast(tabId, `Completed ${result.actionsTaken} actions.`, false, result.highlightedOnly ? 'Some controls were highlighted because the page resisted direct interaction.' : 'The page accepted the generated actions.'); }
        } else {
            showToast(tabId, 'AI produced actions, but none could be performed.', true, 'The page may be blocking programmatic interaction. The likely answers were highlighted when possible.');
        }
    } catch (error) {
        console.error('Error in handleFullPageAI:', error);
        showToast(tabId, 'Full page solve failed.', true, error.message || 'An unexpected error occurred while analyzing the page.');
    }
}

export { handleFullPageAI, buildGenericSolvePrompt, estimateQuestionCount, scrapeGenericPage, performGenericActions };
