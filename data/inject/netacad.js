/**
 * NetAcad Solver - Core Injection Logic
 * Ported from netacad-solver and adapted for NeoPass.
 */
(function () {
    'use strict';

    // --- Configuration ---
    const REQUIRE_CREDITS_FOR_NETACAD = false; // Set to true to enable credit usage in the future
    const LOGIN_ERROR_MESSAGE = 'Please log in to the NeoPass extension to use the NetAcad solver.';
    // ---------------------

    let isSuspendRunning = false;
    let components = [];
    let questions = [];
    let componentUrls = [];

    const processedQuestionElements = new WeakSet();
    const processedLabels = new WeakSet();
    const processedMatchPairs = new WeakSet();
    const processedDropdownOptions = new WeakSet();
    const processedYesNoContainers = new WeakSet();
    const processedOpenTextQuestions = new WeakSet();
    const processedFillBlankDivs = new WeakSet();
    const processedTableRows = new WeakSet();
    const processedOpenTextButtons = new WeakSet();
    const processedTableOptions = new WeakSet();
    const processedFillBlankOptions = new WeakSet();

    // Listen for the background script sending the components.json URL
    chrome.runtime.onMessage.addListener(async (request) => {
        if (request.action === "netacadComponentsUrl" && request.componentsUrl && !componentUrls.includes(request.componentsUrl)) {
            componentUrls.push(request.componentsUrl);
            await setComponents(request.componentsUrl);
            suspendMain();
        }
    });

    const setComponents = async (url) => {
        const getTextContentOfText = (htmlString) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            return doc.body.textContent;
        };

        try {
            const res = await fetch(url);
            if (!res.ok) return;

            let json = await res.json();
            json = json
                .filter(component => component._items)
                .filter(component => !components.map(c => c._id).includes(component._id))
                .map(component => {
                    component.body = getTextContentOfText(component.body);
                    return component;
                });

            components.push(...json);
        } catch (e) {
            // Error fetching components silently handled
        }
    };

    const setQuestionSections = async () => {
        let isAtLeastOneSet = false;

        for (const component of components) {
            const questionDiv = deepHtmlSearch(document, `.${CSS.escape(component._id)}`);

            if (questionDiv) {
                isAtLeastOneSet = true;
                let questionType = 'basic';

                const firstItem = component._items[0];
                if (firstItem.text && firstItem._options) {
                    questionType = 'dropdownSelect';
                } else if (firstItem.question && firstItem.answer) {
                    questionType = 'match';
                } else if (firstItem._graphic?.alt && firstItem._graphic?.src) {
                    questionType = 'yesNo';
                } else if (firstItem.id && firstItem._options?.text) {
                    questionType = 'openTextInput';
                } else if (firstItem.preText && firstItem.postText && firstItem._options?.[0]?.text) {
                    questionType = 'fillBlanks';
                } else if (firstItem._options?.[0].text && typeof firstItem._options?.[0]._isCorrect === 'boolean') {
                    questionType = 'tableDropdown';
                }

                questions.push({
                    questionDiv,
                    id: component._id,
                    answersLength: component._items.length,
                    questionType,
                    items: component._items
                });
            }
        }

        if (!isAtLeastOneSet && components.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await setQuestionSections();
        }
    };

    const findQuestionElement = (doc) => {
        for (const component of components) {
            const questionElement = deepHtmlFindByTextContent(doc, component.body);
            if (questionElement) return questionElement;
        }
    };

    const findAnswerInputsBasic = (doc, questionId, answersLength, inputs = []) => {
        for (let i = 0; i < answersLength; i++) {
            const input = deepHtmlSearch(doc, `#${CSS.escape(questionId)}-${i}-input`);
            const label = deepHtmlSearch(doc, `#${CSS.escape(questionId)}-${i}-label`);

            if (input) {
                inputs.push({ input, label });
                if (inputs.length === answersLength) return inputs;
            }
        }
    };

    const findAnswerInputsMatch = (doc, answersLength, buttons = []) => {
        for (let i = 0; i < answersLength; i++) {
            const answerInputs = deepHtmlSearch(doc, `[data-id="${i}"]`, false, 2);
            if (answerInputs) {
                buttons.push(answerInputs);
                if (buttons.length === answersLength) return buttons;
            }
        }
    };

    const setQuestionElements = () => {
        questions.map(question => {
            if (question.questionType === 'basic') {
                question.questionElement = findQuestionElement(question.questionDiv);
                question.inputs = findAnswerInputsBasic(question.questionDiv, question.id, question.answersLength) || [];
            } else if (question.questionType === 'match') {
                question.questionElement = findQuestionElement(question.questionDiv);
                question.inputs = findAnswerInputsMatch(question.questionDiv, question.answersLength) || [];
            } else if (question.questionType === 'dropdownSelect') {
                setDropdownSelectQuestions(question);
                question.skip = true;
            } else if (question.questionType === 'yesNo') {
                initYesNoQuestions(question);
                question.skip = true;
            } else if (question.questionType === 'openTextInput') {
                setOpenTextInputQuestions(question);
                question.skip = true;
            } else if (question.questionType === 'fillBlanks') {
                setFillBlanksQuestions(question);
                question.skip = true;
            } else if (question.questionType === 'tableDropdown') {
                setTableDropdownQuestions(question);
                question.skip = true;
            }
            return question;
        });
    };

    // --- Specialized Question Handlers ---

    const setDropdownSelectQuestions = (question) => {
        question.items.forEach((item, i) => {
            const qDiv = deepHtmlSearch(question.questionDiv, `[index="${i}"]`, true);
            const qElement = deepHtmlFindByTextContent(qDiv, item.text.trim());

            for (const [index, option] of item._options.entries()) {
                if (option._isCorrect) {
                    const optionElement = deepHtmlSearch(qDiv, `#dropdown__item-index-${index}`, true);
                    questions.push({
                        questionDiv: qDiv,
                        questionElement: qElement,
                        inputs: [optionElement],
                        questionType: question.questionType
                    });
                }
            }
        });
    };

    const initYesNoQuestions = (question) => {
        if (processedYesNoContainers.has(question.questionDiv)) return;
        processedYesNoContainers.add(question.questionDiv);

        const qElement = deepHtmlSearch(question.questionDiv, `.img_question`);
        if (!qElement) return;

        qElement.parentElement?.addEventListener('click', e => {
            const targetQ = deepHtmlSearch(e.target, `.img_question`);
            for (const item of question.items) {
                if (targetQ.alt === item._graphic.alt) {
                    const btn = deepHtmlSearch(question.questionDiv, item._shouldBeSelected ? `.user_selects_yes` : `.user_selects_no`);
                    btn?.click();
                }
            }
        });

        const yesBtn = deepHtmlSearch(question.questionDiv, `.user_selects_yes`);
        const noBtn = deepHtmlSearch(question.questionDiv, `.user_selects_no`);

        const handleHover = (btn, shouldBeSelected) => {
            btn?.addEventListener('mouseover', e => {
                if (e.ctrlKey) {
                    const targetQ = deepHtmlSearch(question.questionDiv, `.img_question`);
                    if (targetQ) {
                        for (const item of question.items) {
                            if (item._graphic.alt === targetQ.alt && item._shouldBeSelected === shouldBeSelected) {
                                btn.click();
                                break;
                            }
                        }
                    }
                }
            });
        };

        handleHover(yesBtn, true);
        handleHover(noBtn, false);
    };

    const setOpenTextInputQuestions = (question) => {
        question.items.forEach((item, i) => {
            const qElement = deepHtmlSearch(question.questionDiv, '#' + CSS.escape(`${question.id}-option-${i}`));
            const button = deepHtmlSearch(question.questionDiv, `.current-item-${i}`, true);

            if (qElement && !processedOpenTextQuestions.has(qElement)) {
                processedOpenTextQuestions.add(qElement);
                qElement.addEventListener('click', () => {
                    setTimeout(() => {
                        button.click();
                        const currentQ = qElement.textContent?.trim();
                        const pos = question.items.find(it => it._options.text.trim() === currentQ)?.position?.[0];
                        if (pos) {
                            setTimeout(() => {
                                const input = deepHtmlSearch(question.questionDiv, `[data-target="${pos}"]`);
                                input ? input.click() : question.questionDiv.click();
                            }, 100);
                        }
                    }, 100);
                });
            }

            if (button && !processedOpenTextButtons.has(button)) {
                processedOpenTextButtons.add(button);
                button.addEventListener('click', () => {
                    setTimeout(() => {
                        const currentQ = qElement?.textContent?.trim();
                        const pos = question.items.find(it => it._options.text.trim() === currentQ)?.position?.[0];
                        if (pos) {
                            setTimeout(() => {
                                const input = deepHtmlSearch(question.questionDiv, `[data-target="${pos}"]`);
                                if (input && !input.dataset.hoverListenerAdded) {
                                    input.dataset.hoverListenerAdded = 'true';
                                    input.addEventListener('mouseover', e => { if (e.ctrlKey) input.click(); });
                                }
                            }, 100);
                        }
                    }, 100);
                });
            }
        });
    };

    const setFillBlanksQuestions = (question) => {
        const qDivs = [...deepHtmlSearch(question.questionDiv, '.fillblanks__item', true, question.answersLength)];
        qDivs.forEach(qDiv => {
            if (processedFillBlankDivs.has(qDiv)) return;
            processedFillBlankDivs.add(qDiv);

            const text = qDiv.textContent.trim();
            for (const item of question.items) {
                if (text.startsWith(item.preText.replace(/<[^>]*>?/gm, '').trim()) && text.endsWith(item.postText.replace(/<[^>]*>?/gm, '').trim())) {
                    for (const option of item._options) {
                        if (option._isCorrect) {
                            const dropdownItems = [...deepHtmlSearch(qDiv, '.dropdown__item', true, item._options.length)];
                            for (const dItem of dropdownItems) {
                                if (processedFillBlankOptions.has(dItem)) break;
                                processedFillBlankOptions.add(dItem);
                                if (dItem.textContent.trim() === option.text.trim()) {
                                    qDiv.addEventListener('click', (e) => { if (e.target.textContent?.trim()) dItem.click(); });
                                    dItem.addEventListener('mouseover', e => { if (e.ctrlKey) dItem.click(); });
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    break;
                }
            }
        });
    };

    const setTableDropdownQuestions = (question) => {
        const rows = Array.from(deepHtmlSearch(question.questionDiv, 'tbody tr', true, question.answersLength));
        rows.forEach((row, i) => {
            if (processedTableRows.has(row)) return;
            processedTableRows.add(row);

            const options = Array.from(deepHtmlSearch(row, '[role="option"]', true, question.items[i]._options.length));
            const correct = question.items[i]._options.find(opt => opt._isCorrect);

            for (const optEl of options) {
                if (processedTableOptions.has(optEl)) break;
                processedTableOptions.add(optEl);
                if (optEl.textContent.trim() === correct.text.trim()) {
                    row.addEventListener('click', () => optEl.click());
                    optEl.addEventListener('mouseover', e => { if (e.ctrlKey) optEl.click(); });
                    break;
                }
            }
        });
    };

    // --- Interaction Listeners ---

    const withLoginCheck = (callback) => {
        chrome.runtime.sendMessage({ action: "checkLoginStatus" }, (response) => {
            if (response && response.loggedIn) {
                callback();
            } else {
                chrome.runtime.sendMessage({
                    action: "showToast",
                    message: LOGIN_ERROR_MESSAGE,
                    isError: true
                });
            }
        });
    };

    const markAnswers = (question) => {
        if (REQUIRE_CREDITS_FOR_NETACAD) {
            // Placeholder for credit deduction
        }

        // Log this solve event for analytics (batched in background)
        try { chrome.runtime.sendMessage({ action: 'incrementNetacadSolve' }); } catch (e) {}

        if (question.questionType === 'basic') {
            const component = components.find(c => c._id === question.id);
            if (!component || !question.inputs) return;

            question.inputs.forEach(({ input, label }, i) => {
                const item = component._items[i];
                if (!item) return;

                // For multiple choice, we uncheck if already checked to reset
                if (input.checked) {
                    label.click();
                }

                // Check for both _shouldBeSelected and _isCorrect flags
                const shouldMark = item._shouldBeSelected || item._isCorrect;

                if (shouldMark) {
                    // Use a staggered timeout for multiple answers to avoid UI race conditions
                    setTimeout(() => {
                        if (!input.checked) label.click();
                    }, 10 + (i * 20));
                }
            });
        } else if (question.questionType === 'match') {
            question.inputs.forEach((input, i) => {
                if (input[0] && input[1]) {
                    setTimeout(() => {
                        input[0].click();
                        input[1].click();
                    }, i * 50);
                }
            });
        } else if (question.questionType === 'dropdownSelect') {
            if (question.inputs && question.inputs[0]) {
                question.inputs[0].click();
            }
        }
    };

    const initClickListeners = () => {
        questions.forEach((question) => {
            if (question.skip || !question.questionElement) return;
            if (processedQuestionElements.has(question.questionElement)) return;
            processedQuestionElements.add(question.questionElement);

            question.questionElement.addEventListener('click', () => {
                withLoginCheck(() => {
                    if (REQUIRE_CREDITS_FOR_NETACAD) {
                        chrome.runtime.sendMessage({ action: "getMcqCredits" }, (response) => {
                            if (response && response.success && response.mcqCredits > 0) {
                                markAnswers(question);
                            } else {
                                chrome.runtime.sendMessage({
                                    action: "showToast",
                                    message: "You don't have enough credits to solve this question.",
                                    isError: true
                                });
                            }
                        });
                    } else {
                        markAnswers(question);
                    }
                });
            });
        });
    };

    const initHoverListeners = () => {
        questions.forEach((question) => {
            if (question.skip) return;
            const component = components.find(c => c._id === question.id);

            if (question.questionType === 'basic') {
                question.inputs.forEach(({ input, label }, i) => {
                    if (!label || processedLabels.has(label)) return;
                    processedLabels.add(label);
                    label.addEventListener('mouseover', e => {
                        if (e.ctrlKey) {
                            withLoginCheck(() => {
                                const item = component?._items[i];
                                if (!item) return;

                                const shouldMark = item._shouldBeSelected || item._isCorrect;

                                if (REQUIRE_CREDITS_FOR_NETACAD) {
                                    chrome.runtime.sendMessage({ action: "getMcqCredits" }, (response) => {
                                        if (response && response.success && response.mcqCredits > 0) {
                                            if (input.checked !== shouldMark) label.click();
                                        }
                                    });
                                } else {
                                    if (input.checked !== shouldMark) label.click();
                                }
                            });
                        }
                    });
                });
            } else if (question.questionType === 'match') {
                question.inputs.forEach((input, i) => {
                    if (!input[0] || processedMatchPairs.has(input[0])) return;
                    processedMatchPairs.add(input[0]);
                    input[0].addEventListener('mouseover', e => {
                        if (e.ctrlKey) {
                            withLoginCheck(() => {
                                if (REQUIRE_CREDITS_FOR_NETACAD) {
                                    chrome.runtime.sendMessage({ action: "getMcqCredits" }, (response) => {
                                        if (response && response.success && response.mcqCredits > 0) {
                                            input[0].click();
                                            input[1].click();
                                        }
                                    });
                                } else {
                                    input[0].click();
                                    input[1].click();
                                }
                            });
                        }
                    });
                });
            } else if (question.questionType === 'dropdownSelect') {
                const optEl = question.inputs[0];
                if (!optEl || processedDropdownOptions.has(optEl)) return;
                processedDropdownOptions.add(optEl);
                optEl.addEventListener('mouseover', e => {
                    if (e.ctrlKey) {
                        withLoginCheck(() => {
                            if (REQUIRE_CREDITS_FOR_NETACAD) {
                                chrome.runtime.sendMessage({ action: "getMcqCredits" }, (response) => {
                                    if (response && response.success && response.mcqCredits > 0) {
                                        optEl.click();
                                    }
                                });
                            } else {
                                optEl.click();
                            }
                        });
                    }
                });
            }
        });
    };

    const setIsReady = () => {
        for (const component of components) {
            if (deepHtmlSearch(document, `.${CSS.escape(component._id)}`)) return true;
        }
        return false;
    };

    const main = async () => {
        questions = [];
        await setQuestionSections();
        setQuestionElements();
        initClickListeners();
        initHoverListeners();
    };

    const suspendMain = () => {
        if (isSuspendRunning) return;
        isSuspendRunning = true;
        const checking = async () => {
            if (setIsReady()) {
                clearInterval(interval);
                main().finally(() => { isSuspendRunning = false; });
            }
        };
        const interval = setInterval(checking, 1000);
    };

    // Start periodic check for new questions
    setInterval(() => {
        if (isSuspendRunning || components.length === 0) return;
        let visibleCount = 0;
        for (const component of components) {
            if (deepHtmlSearch(document, `.${CSS.escape(component._id)}`)) visibleCount++;
        }
        if (visibleCount !== questions.length) suspendMain();
    }, 2000);
})();
