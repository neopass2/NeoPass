/**
 * Deep HTML Search - searches through light DOM, Shadow DOM, and Iframes
 * @param {Document|ShadowRoot} root - The root element to start searching from
 * @param {string} selector - The CSS selector to search for
 * @param {boolean} unwrap - Whether to return the contentDocument or shadowRoot instead of the element
 * @param {number} count - The number of elements expected
 * @returns {Element|Element[]|Document|ShadowRoot|null}
 */
function deepHtmlSearch(root, selector, unwrap = false, count = 1) {
    if (!root) return null;

    if (count > 1) {
        const directMatch = [...root.querySelectorAll(selector)];
        if (directMatch.length === count) {
            return unwrap ? unwrapElementContent(directMatch) : directMatch;
        }
    } else {
        const directMatch = root.querySelector(selector);
        if (directMatch) {
            return unwrap ? unwrapElementContent(directMatch) : directMatch;
        }
    }

    // Search in iframes
    const iframes = root.querySelectorAll('iframe');
    for (const iframe of iframes) {
        try {
            const foundTarget = deepHtmlSearch(iframe.contentDocument, selector, unwrap, count);
            if (foundTarget) return foundTarget;
        } catch (e) {
            // Cross-origin iframe issues
        }
    }

    // Search in Shadow DOM
    const elementsWithShadow = [...root.querySelectorAll('*')].filter(el => el.shadowRoot);
    for (const element of elementsWithShadow) {
        if (count > 1) {
            const shadowMatch = [...element.shadowRoot.querySelectorAll(selector)];
            if (shadowMatch.length === count) {
                return unwrap ? unwrapElementContent(shadowMatch) : shadowMatch;
            }
        } else {
            const shadowMatch = element.shadowRoot.querySelector(selector);
            if (shadowMatch) {
                return unwrap ? unwrapElementContent(shadowMatch) : shadowMatch;
            }
        }

        const foundTarget = deepHtmlSearch(element.shadowRoot, selector, unwrap, count);
        if (foundTarget) return foundTarget;
    }

    return null;
}

/**
 * Deep search by text content
 * @param {Document|ShadowRoot} root
 * @param {string} textContent
 * @returns {Element|null}
 */
function deepHtmlFindByTextContent(root, textContent) {
    if (!root) return null;

    textContent = textContent.trim();
    const directMatch = [...root.querySelectorAll('*')].find(el => el.textContent.trim() === textContent);
    if (directMatch) return directMatch;

    const iframes = root.querySelectorAll('iframe');
    for (const iframe of iframes) {
        try {
            const foundTarget = deepHtmlFindByTextContent(iframe.contentDocument, textContent);
            if (foundTarget) return foundTarget;
        } catch (e) {}
    }

    const shadowContainers = [...root.querySelectorAll('*')].filter(el => 
        el.tagName.toLowerCase().endsWith('-view') || el.tagName.toLowerCase() === 'app-root' || el.shadowRoot
    );

    for (const container of shadowContainers) {
        if (!container.shadowRoot) continue;
        const target = [...container.shadowRoot.querySelectorAll('*')].find(el => el.textContent.trim() === textContent);
        if (target) return target;

        const foundTarget = deepHtmlFindByTextContent(container.shadowRoot, textContent);
        if (foundTarget) return foundTarget;
    }

    return null;
}

/**
 * Helper to unwrap content from iframes or shadow roots
 */
function unwrapElementContent(element) {
    if (Array.isArray(element)) {
        return element.map(unwrapElementContent);
    }
    if (element.contentDocument) {
        return element.contentDocument;
    } else if (element.shadowRoot) {
        return element.shadowRoot;
    }
    return element;
}
