"use strict";

/* global inverted_wordles */

/**
 * An object that contains a list of wordles.
 * @typedef {Object} Wordle
 * A single wordle.
 * @property {Object} content - The content of src/_data/question.json.
 * @property {Boolean} exists - Indicate whether src/_data/question.json exists.
 * @property {String} sha - The sha for src/_data/question.json.
 */

/**
 * An object that contains a list of wordles.
 * @typedef {Object} Wordles
 * A complete list of wordles.
 * @property {Wordle} wordleId - The wordle ID. Used as a key for each wordle.
 */

/**
 * Render a list of wordles.
 * @param {Wordles} wordles - A list of wordles keyed by wodle ids.
 * @param {Object} options - The value of inverted_wordles.manage.globalOptions.
 */
inverted_wordles.manage.renderWordles = function (wordles, options) {
    const wordlesAreaSelector = options.selectors.wordlesArea;

    let wordlesHtml = document.querySelector(wordlesAreaSelector).innerHTML;

    // Loop through all wordles to render
    for (const [wordleId, questionFile] of Object.entries(wordles)) {
        wordlesHtml += inverted_wordles.manage.renderWordleRow({
            wordleId,
            workshopName: questionFile.content.workshopName,
            question: questionFile.content.question,
            entries: questionFile.content.entries,
            lastModifiedTimestamp: questionFile.content.lastModifiedTimestamp
        });
    }
    // Add all wordles to the page
    document.querySelector(wordlesAreaSelector).innerHTML = wordlesHtml;
};

/**
 * Check if the GitHub repository defined via env.REPOSITORY_URL is a
 * Netlify site. If not, display a message and disable the "New Question" button.
 * @param {Object} options - The value of inverted_wordles.manage.globalOptions.
 * netlify site.
 */
inverted_wordles.manage.checkNetlifySite = function (options) {
    const generalStatusElm = document.querySelector(options.selectors.status);
    fetch("/api/check_netlify_site", {
        method: "GET"
    }).then(response => {
        if (response.status >= 400 && response.status < 600) {
            response.json().then(res => {
                inverted_wordles.manage.reportStatus("Error at checking the Netlify site: " + res.error.message, generalStatusElm, "error");
            });
        } else {
            response.json().then(res => {
                if (!res.isNetlifySite) {
                    // Disable the "new question" button
                    document.querySelector(options.selectors.createButton).disabled = true;
                    inverted_wordles.manage.reportStatus("Note: Current Github repository is not a Netlify site. New questions cannot be created.", generalStatusElm, "info");
                }
            });
        }
    });
};

/**
 * Build the wordle list.
 * @param {Wordles} wordles - A list of wordles keyed by wordle ids.
 * @param {Object} options - The value of inverted_wordles.manage.globalOptions.
 */
inverted_wordles.manage.initWordles = function (wordles, options) {
    inverted_wordles.manage.renderWordles(wordles, options);
    // inverted_wordles.instance.user is set in login_handler.js
    inverted_wordles.manage.setLoginState(inverted_wordles.instance.user ? true : false, options);
    inverted_wordles.manage.bindCreateEvent(options);
    inverted_wordles.manage.bindInputFieldEvents(document, options);
    inverted_wordles.manage.bindDeleteEvents(document, options);

    // Check if the current GitHub repo is a netlify site. If not, inform users.
    inverted_wordles.manage.checkNetlifySite(options);
};

/**
 * Initialize the manage wordles page by fetching and rendering all wordles.
 * @param {Object} options - The value of inverted_wordles.manage.globalOptions.
 */
inverted_wordles.manage.initManagePage = function (options) {
    fetch("/api/fetch_wordles").then(
        response => {
            if (response.status >= 400 && response.status < 600) {
                const generalStatusElm = document.querySelector(options.selectors.status);
                response.json().then(res => {
                    inverted_wordles.manage.reportStatus("Error at fetching wordles: " + res.error.message, generalStatusElm, "error");
                });
            } else {
                inverted_wordles.manage.bindNetlifyEvents(options);
                response.json().then(wordles => {
                    inverted_wordles.manage.initWordles(wordles, options);
                });
            }
        },
        error => inverted_wordles.manage.reportStatus("Error at fetching wordles: " + error, document.querySelector(options.selectors.status), "error")
    );
};
