/* global wordle_globals, inverted_wordles */

"use strict";

var submitAnswer = function (dataTogo) {
    // Submit the data to the server
    fetch("/api/save_answers", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dataTogo)
    }).then(response => updateStatus(response), error => updateStatus(error));
};

var updateStatus = function (response) {
    const statusElm = document.getElementById("status");
    statusElm.className = response.ok ? "success" : "error";
    statusElm.innerHTML = response.ok ? "<span data-i18n-textcontent=\"success_answer_submit\">" + inverted_wordles.t("success_answer_submit") + "</span>" : "<span data-i18n-textcontent=\"error_answer_submit\">" + inverted_wordles.t("error_answer_submit") + "</span>";
    if (response.ok) {
        const viewWordle = document.querySelector(".view-wordle");
        viewWordle.classList.remove("hidden");
    }
};

// Submit the form data on the answer page to the server
document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    let dataTogo = {
        answers: [],
        requestId: Math.random().toString(36).substring(7),
        wordleId: wordle_globals.wordleId
    };

    // Find all answer values
    const answerElms = document.querySelectorAll("input[name='answer']");
    for (let i = 0; i < answerElms.length; i++) {
        let currentAnswer = answerElms[i].value;
        if (currentAnswer.trim() !== "") {
            dataTogo.answers.push(currentAnswer);
        }
    }
    console.log("About to save answers at " + new Date() + " with id " + dataTogo.requestId);
    submitAnswer(dataTogo);
});
