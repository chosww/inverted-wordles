"use strict";

const {
    Octokit
} = require("@octokit/core");

const serverUtils = require("../functions-common/serverUtils.js");
const fetchJSONFile = require("../functions-common/fetchJSONFile.js").fetchJSONFile;

export async function onRequest(event) {
    console.log("Received fetch_answers request at " + new Date() + " with path " + event.path);
    var wordleId = /fetch_answer\/(.*)/.exec(event.path)[1];
    const blob = new Blob();

    // Reject the request when:
    // 1. Not a GET request;
    // 2. Doesn’t provide required values
    if (event.httpMethod !== "GET" || !serverUtils.isParamsExist([wordleId])) {
        return serverUtils.invalidRequestResponse;
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        const answerFileInfo = await fetchJSONFile(octokit, serverUtils.branchName, "src/_data/" + wordleId + "-answers.json");
        console.log("Got answerFileInfo ", JSON.stringify(answerFileInfo));
        return new Response(blob, {
            statusCode: 200,
            body: JSON.stringify(answerFileInfo.content)
        });
    } catch (e) {
        console.log("fetch_answers error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        });
    }
};
