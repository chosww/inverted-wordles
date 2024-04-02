"use strict";

const {
    Octokit
} = require("@octokit/core");

const serverUtils = require("../functions-common/serverUtils.js");
const fetchJSONFile = require("../functions-common/fetchJSONFile.js").fetchJSONFile;

export async function onRequest(event) {
    console.log("Received fetch_question request at " + new Date() + " with path " + event.path);
    const wordleId = /fetch_question\/(.*)/.exec(event.path)[1];
    const blob = new Blob();

    // Reject the request when:
    // 1. Not a GET request;
    // 2. Doesn’t provide required values
    if (event.httpMethod !== "GET" || !serverUtils.isParamsExist([wordleId])) {
        return serverUtils.invalidRequestResponse;
    }

    const octokit = new Octokit({
        auth: env.GITHUB_TOKEN
    });

    try {
        const questionFileInfo = await fetchJSONFile(octokit, serverUtils.branchName, "src/_data/" + wordleId + "-question.json");
        console.log("Got questionFileInfo ", JSON.stringify(questionFileInfo));
        return new Response(blob, {
            statusCode: 200,
            body: JSON.stringify(questionFileInfo.content)
        });
    } catch (e) {
        console.log("fetch_question error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        });
    }
};
