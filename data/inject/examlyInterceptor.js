/**
 * NeoPass Examly Interceptor
 * Intercepts and decrypts Examly test data to provide 100% accurate answers.
 */
(function () {
    const INTERCEPT_URLS = [
        'https://api.examly.io/api/sEKMRyOJKjIzZbUa',
        'https://api.examly.io/api/9DECJfxqhu0cgJAQ',
        'https://api.examly.io/api/v1/test/frozen-data', // Potential v1 endpoint
        '/api/sEKMRyOJKjIzZbUa', // Relative paths
        '/api/9DECJfxqhu0cgJAQ'
    ];
    const SALT = 'k3QL95NjdP!cA34CsXL';

    // Global storage for intercepted data
    window.__NEOPASS_EXAMLY_DATA__ = {
        mcqs: [],
        coding: [],
        ready: false
    };

    /**
     * Intercept XMLHttpRequests to capture Examly API responses
     */
    const originalXHR = window.XMLHttpRequest;
    function NeoXHR() {
        const xhr = new originalXHR();
        xhr.addEventListener('readystatechange', function () {
            if (xhr.readyState === 4) {
                try {
                    const url = xhr.responseURL;
                    if (INTERCEPT_URLS.some(target => url.includes(target))) {
                        processInterceptedData(xhr.responseText);
                    }
                } catch (e) { }
            }
        }, false);
        return xhr;
    }
    window.XMLHttpRequest = NeoXHR;

    /**
     * Decrypt and extract answers from the intercepted server response
     */
    function processInterceptedData(encryptedText) {
        try {
            const encryptedJson = JSON.parse(encryptedText);
            const key = deriveKey();
            if (!key) return;

            // Decryption requires CryptoJS to be loaded
            if (typeof CryptoJS === 'undefined') {
                setTimeout(() => processInterceptedData(encryptedText), 500);
                return;
            }

            const decryptedData = decrypt(encryptedJson.data, key);
            if (!decryptedData) return;

            const testData = decryptedData.frozen_test_data;
            if (!testData) return;

            // Clear previous data
            window.__NEOPASS_EXAMLY_DATA__.mcqs = [];
            window.__NEOPASS_EXAMLY_DATA__.coding = [];

            // Track the absolute question index (across all sections) for accurate mapping
            let absoluteQuestionIndex = 0;
            


            
            testData.forEach(section => {
                let sectionRelativeIndex = 0;
                section.questions.forEach(q => {
                    const currentAbsIndex = absoluteQuestionIndex;
                    absoluteQuestionIndex++;
                    const currentRelIndex = sectionRelativeIndex;
                    sectionRelativeIndex++;

                    // Extract MCQ Answers
                    if (q.mcq_questions) {
                        const actualAnswer = q.mcq_questions.actual_answer.args[0];

                        // Try matching by text
                        let optionIndex = q.options.findIndex(opt => opt.text === actualAnswer);
                        let matchedByText = optionIndex !== -1;

                        // Fallback: Try matching by ID
                        if (optionIndex === -1) {
                            optionIndex = q.options.findIndex(opt => opt.id === actualAnswer);
                        }

                        const questionText = q.question_text || q.text || "";
                        const optionTexts = q.options.map(o => o.text || o.id || '');

                        // Resolve the display text: if matched by ID, use the option's display text
                        // This is critical because the actual DOM may show text, not IDs
                        const answerDisplayText = optionIndex !== -1
                            ? (q.options[optionIndex].text || q.options[optionIndex].id || actualAnswer)
                            : actualAnswer;



                        if (optionIndex !== -1) {
                            window.__NEOPASS_EXAMLY_DATA__.mcqs.push({
                                questionId: q.id,
                                absoluteIndex: currentAbsIndex,
                                sectionRelativeIndex: currentRelIndex,
                                answerIndex: optionIndex,
                                text: answerDisplayText,
                                questionText: questionText,
                                optionTexts: optionTexts
                            });
                        }
                    }
                    // Extract Coding Solutions
                    if (q.programming_question) {
                        const solution = q.programming_question.solution?.[0]?.solutiondata?.[0]?.solution;
                        const questionText = q.question_text || q.text || "";



                        if (solution) {
                            window.__NEOPASS_EXAMLY_DATA__.coding.push({
                                questionId: q.id,
                                absoluteIndex: currentAbsIndex,
                                sectionRelativeIndex: currentRelIndex,
                                solution: solution,
                                questionText: questionText,
                                rawProgrammingQuestion: q.programming_question // Pass the raw data for potential fallback
                            });


                        }
                    }
                });
            });


            window.__NEOPASS_EXAMLY_DATA__.ready = true;

            // Send to content script for forwarding to background
            window.postMessage({
                source: 'NEOPASS_EXAMLY_INTERCEPTOR',
                action: 'cacheExamlyData',
                data: window.__NEOPASS_EXAMLY_DATA__
            }, '*');
        } catch (e) {}
    }

    /**
     * Derive AES key from localStorage values and salt
     */
    function deriveKey() {
        try {
            const accordEvent = JSON.parse(localStorage.getItem('accord_event') || '{}');
            const schoolDetails = JSON.parse(localStorage.getItem('school_details') || '{}');

            const userId = accordEvent.list?.test_details?.[0]?.user_id;
            const schoolId = schoolDetails.school_id;

            if (!userId || !schoolId) return null;

            return (userId + schoolId.toString() + SALT).split('-').join('');
        } catch (e) {
            return null;
        }
    }

    /**
     * AES Decryption helper
     */
    function decrypt(data, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(data, key);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(decryptedString);
        } catch (e) {
            return null;
        }
    }
})();
