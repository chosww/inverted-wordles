"use strict";

/* global inverted_wordles, aria */

/**
 * Bind event listeners for "Delete" buttons in the given container. It is the caller's
 * responsibility to ensure this function is called only once on each newly generated block of markup.
 * Currently, this function is called in two cases:
 * 1. At the page load when all word clouds are rendered;
 * 2. When a new word cloud is created and added to the word cloud list.
 * @param {DOMElement} containerElm - The DOM element of the holding container to find delete buttons.
 * @param {Object} options - The value of inverted_wordles.manage.globalOptions.
 */
inverted_wordles.manage.bindDeleteEvents = function (containerElm, options) {
    const delButtons = containerElm.querySelectorAll(options.selectors.deleteButton);
    for (let i = 0; i < delButtons.length; i++) {
        const currentButton = delButtons[i];
        if (!currentButton.disabled) {
            // Open the delete confirmation dialog
            currentButton.addEventListener("click", evt => {
                aria.openDialog(options.deleteDialogId, evt.target.id, options.deleteCancelId);
                const deleteDialog = document.getElementById(options.deleteDialogId);
                // Set the aria-controls attribute to the id of the word cloud row that will be deleted
                const wordleRowId = inverted_wordles.manage.getNameWithSharedSuffix(evt.target.id, options.deleteButtonIdPrefix, options.wordleRowIdPrefix);
                deleteDialog.querySelector(options.selectors.deleteConfirm).setAttribute("aria-controls", wordleRowId);
                // Keep the word cloud id to the delete confirmation dialog for the future retrival when the deletion is confirmed
                deleteDialog.querySelector("input[name='" + options.wordleIdField + "']").value = currentButton.parentElement.parentElement.querySelector("input[name='" + options.wordleIdField + "']").value;
            });
        }
    };
};

/**
 * Delete a word cloud.
 * @param {DOMElement} closeButton - The DOM element of the close button.
 * @param {Object} options - The value of inverted_wordles.manage.globalOptions.
 */
inverted_wordles.manage.deleteClicked = function (closeButton, options) {
    // find out the id of the word cloud to be deleted
    const wordleId = closeButton.parentElement.querySelector("input[name='" + options.wordleIdField + "']").value;
    // close the confirmation dialog
    aria.closeDialog(closeButton);
    // Find the row with the current word cloud id
    const rowElm = inverted_wordles.manage.findWordleRowByWordleId(wordleId, options);
    // Find the status element for reporting errors when occuring
    const oneStatusElm = rowElm.querySelector(options.selectors.oneStatus);

    // delete the word cloud
    fetch("/api/delete_wordle/" + wordleId, {
        method: "DELETE"
    }).then(response => {
        // Javascript fetch function does not reject when the status code is between 400 to 600.
        // This range of status code needs to be handled specifically in the success block.
        // See https://github.com/whatwg/fetch/issues/18
        if (response.status >= 400 && response.status < 600) {
            response.json().then(res => {
                inverted_wordles.manage.reportStatus("<span data-i18n-textcontent=\"error_delete_wordle\">" + inverted_wordles.t("error_delete_wordle") + "</span>" + res.error.message + "*", oneStatusElm, "error");
            });
        } else {
            // Remove the word cloud from the word cloud list
            rowElm.remove();
        }
    }, error => {
        error.json().then(err => {
            inverted_wordles.manage.reportStatus("<span data-i18n-textcontent=\"error_delete_wordle\">" + inverted_wordles.t("error_delete_wordle") + "</span>" + err.error + "*", oneStatusElm, "error");
        });
    });
};
