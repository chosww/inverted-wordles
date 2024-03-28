"use strict";

const {
    Octokit
} = require("@octokit/core");

const gitOpsApi = require("git-ops-api");
const serverUtils = require("../functions-common/serverUtils.js");
const fetchJSONFile = require("../functions-common/fetchJSONFile.js").fetchJSONFile;

exports async function onRequest(event) {
    console.log("Received fetch_wordles request at " + new Date());
    const blob = new Blob();

    // Reject when:
    // 1. The request when the request is not a GET request;
    // 2. Required environment variables are not defined.
    if (event.httpMethod !== "GET" || !serverUtils.isParamsExist()) {
        return serverUtils.invalidRequestResponse;
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        // Get all files from "src/_data" directory
        const files = await gitOpsApi.getDirInfo(octokit, {
            repoOwner: serverUtils.repoOwner,
            repoName: serverUtils.repoName,
            path: "src/_data",
            ref: serverUtils.branchName
        });

        let wordles = {};

        // Find all question file names whose names match uuid v4 format
        // For UUID validation, see https://stackoverflow.com/questions/7905929/how-to-test-valid-uuid-guid#answer-38191104
        const regex = /^([0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})-question\.json$/i;
        for (const file of files) {
            let found = file.name.match(regex);
            if (!found) {
                continue;
            }
            wordles[found[1]] = await fetchJSONFile(octokit, serverUtils.branchName, file.path);
        }

        return new Response(blob, {
            statusCode: 200,
            body: JSON.stringify(wordles)
        });
    } catch (e) {
        console.log("fetch_wordles error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        });
    }
};
