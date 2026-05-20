/**
 * Anti-Anti-Debug Script
 * Prevents websites from detecting developer tools and overrides common debug-detection patterns.
 */
(() => {
    const Proxy = window.Proxy;
    const Originals = {
        log: console.log,
        table: console.table,
        clear: console.clear,
        functionConstructor: window.Function.prototype.constructor,
        createElement: document.createElement,
        toString: Function.prototype.toString
    };

    /**
     * Wrap functions to prevent detection via .toString() or other checks
     */
    function wrapFn(newFn, old) {
        return new Proxy(newFn, {
            get: function (target, prop) {
                const callMethods = ['apply', 'bind', 'call'];
                if (callMethods.includes(prop)) {
                    return target[prop];
                }
                return old[prop];
            }
        });
    }

    // Defeat Console-based detection
    window.console.log = wrapFn((...args) => {
        // Redact functions and sensitive objects from logs if needed
        const newArgs = args.map((a) => {
            if (typeof a === 'function') return "Redacted Function";
            return a;
        });
        // Originals.log.apply(console, newArgs); // Optional: keep logging but redacted
    }, Originals.log);

    window.console.table = wrapFn(() => {}, Originals.table);
    window.console.clear = wrapFn(() => {}, Originals.clear);

    // Defeat "debugger" statement injection via Function constructor
    let debugCount = 0;
    window.Function.prototype.constructor = wrapFn(function(...args) {
        const fnContent = args[0];
        if (fnContent && typeof fnContent === 'string' && fnContent.includes('debugger')) {
            debugCount++;
            if (debugCount > 50) {
                // Prevent infinite debugger loops
                throw new Error("Debugger detection bypassed.");
            }
            const cleanContent = fnContent.replaceAll("debugger", "/* debugger bypassed */");
            const newArgs = [...args];
            newArgs[0] = cleanContent;
            return Originals.functionConstructor.apply(this, newArgs);
        }
        return Originals.functionConstructor.apply(this, args);
    }, Originals.functionConstructor);

    // Prevent detection via iframe console hijacking
    document.createElement = wrapFn((el, o) => {
        const element = Originals.createElement.apply(document, [el, o]);
        if (el && typeof el === 'string' && el.toLowerCase() === "iframe") {
            element.addEventListener("load", () => {
                try {
                    if (element.contentWindow) {
                        element.contentWindow.window.console = window.console;
                    }
                } catch (e) {}
            });
        }
        return element;
    }, Originals.createElement);

})();
