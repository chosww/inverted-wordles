"use strict";

const gitOpsApi = require("git-ops-api");
const serverUtils = require("../functions-common/serverUtils.js");
const fetchJSONFile = require("../functions-common/fetchJSONFile.js").fetchJSONFile;
const {
    Octokit
} = require("@octokit/core");

export async function onRequest(event) {
    console.log("Received delete_wordle request at " + new Date() + " with path " + event.path);
    var wordleId = /delete_wordle\/(.*)/.exec(event.path)[1];
    const blob = new Blob();

    // Reject the request when:
    // 1. Not a DELETE request;
    // 2. Doesn’t provide required values
    if (event.httpMethod !== "DELETE" || !serverUtils.isParamsExist([wordleId])) {
        return serverUtils.invalidRequestResponse;
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    try {
        const wordleFiles = ["src/_data/" + wordleId + "-question.json", "src/_data/" + wordleId + "-answers.json"];

        // Check if the given file exists in the github repository
        const fileExists = async (file) => {
            const fileInfo = await fetchJSONFile(octokit, serverUtils.branchName, file);
            return fileInfo.exists;
        };

        // The async version of array.filter(). The first one maps the array through the predicate function
        // asynchronously, producing true/false values. Then the second step is a synchronous filter that uses
        // the results from the first step.
        // See https://advancedweb.hu/how-to-use-async-functions-with-array-filter-in-javascript/
        const asyncFilter = async (arr, predicate) => Promise.all(arr.map(predicate))
        	.then((results) => arr.filter((_v, index) => results[index]));

        const filesToDelete = await asyncFilter(wordleFiles, fileExists);

        if (filesToDelete.length > 0) {
            await gitOpsApi.commitMultipleFiles(octokit, {
                repoOwner: serverUtils.repoOwner,
                repoName: serverUtils.repoName,
                branchName: serverUtils.branchName,
                files: filesToDelete.map(file => {
                    return {
                        path: file,
                        operation: "delete"
                    };
                }),
                commitMessage: "chore: [skip ci] delete wordle files with id " + wordleId
            });
            console.log("Done: the wordle with ID " + wordleId + " has been deleted.");
        }
        return new Response(blob, {
            statusCode: 200,
            body: "Deleted successfully!"
        });
    } catch (e) {
        console.log("delete_wordle error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        });
    }
};
