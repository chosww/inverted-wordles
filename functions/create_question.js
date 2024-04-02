"use strict";

const {
    Octokit
} = require("@octokit/core");

const gitOpsApi = require("git-ops-api");
const serverUtils = require("../functions-common/serverUtils.js");

export async function onRequest(event) {
    console.log("Received create_question request at " + new Date() + " with path " + event.path);
    const wordleId = JSON.parse(event.body).wordleId;
    const blob = new Blob();

    // Reject the request when:
    // 1. Not a POST request;
    // 2. Doesn’t provide required values;
    if (event.httpMethod !== "POST" || !serverUtils.isParamsExist([wordleId])) {
        return serverUtils.invalidRequestResponse;
    }

    const octokit = new Octokit({
        auth: env.GITHUB_TOKEN
    });

    try {
        const questionFileName = wordleId + "-question.json";
        const lastModifiedTimestamp = new Date().toISOString();

        // Create the question file
        await gitOpsApi.createSingleFile(octokit, {
            repoOwner: serverUtils.repoOwner,
            repoName: serverUtils.repoName,
            branchName: serverUtils.branchName,
            filePath: "src/_data/" + questionFileName,
            fileContent: JSON.stringify({
                workshopName: "",
                question: "",
                entries: 0,
                entryMaxLength: 80,
                createdTimestamp: lastModifiedTimestamp,
                lastModifiedTimestamp
            }),
            // Including "[skip ci]" in the commit message notifies notifies Netlify not to trigger a deploy.
            commitMessage: "chore: [skip ci] create " + questionFileName
        });
        console.log("Done: " + questionFileName + " has been created.");

        return new Response(blob, {
            statusCode: 200,
            body: JSON.stringify({
                wordleId,
                lastModifiedTimestamp
            })
        });
    } catch (e) {
        console.log("create_question error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        });
    }
};
