"use strict";

const {
    Octokit
} = require("@octokit/core");
const uuid = require("uuid");

const gitOpsApi = require("git-ops-api");
const serverUtils = require("../functions-common/serverUtils.js");
const fetchJSONFile = require("../functions-common/fetchJSONFile.js").fetchJSONFile;

/**
 * Create a new answers file. The new answer is written into a JSON file and keyed by a uuid.
 * @param {Object} octokit - An instance of octokit with authentication being set.
 * @param {String} answersFilePath - The path to the answers file.
 * @param {String} branch - The name of the branch that the file will be created in.
 * @param {Object} newAnswer - The answer written into the new file.
 * @return {Promise} The resolve or reject of the promise indicates whether the file is created successfully or
 * unsuccessfully.
 */
const createAnswerFile = async (octokit, answersFilePath, branch, newAnswer) => {
    const uniqueId = uuid.v4();
    const jsonFileContent = {};
    jsonFileContent[uniqueId] = newAnswer;

    return gitOpsApi.createSingleFile(octokit, {
        repoOwner: serverUtils.repoOwner,
        repoName: serverUtils.repoName,
        branchName: branch,
        filePath: answersFilePath,
        fileContent: JSON.stringify(jsonFileContent),
        // Including "[skip ci]" in the commit message notifies notifies Netlify not to trigger a deploy.
        commitMessage: "chore: [skip ci] create " + answersFilePath
    });
};

/**
 * Update an existing answers file by appending the new answer keyed by a uuid key to the existing file.
 * @param {Object} octokit - An instance of octokit with authentication being set.
 * @param {String} answersFilePath - The path to the existing answers file.
 * @param {String} jsonFileContent - The content of the existing answers file.
 * @param {String} sha - The sha of the existing file.
 * @param {String} branch - The name of the branch that the file to be updated sits in.
 * @param {Object} newAnswer - The answer appended to the existing file.
 * @return {Promise} The resolve or reject of the promise indicate the file is updated successfully or
 * unsuccessfully.
 */
const updateAnswerFile = async (octokit, answersFilePath, jsonFileContent, sha, branch, newAnswer) => {
    const uniqueId = uuid.v4();
    jsonFileContent[uniqueId] = newAnswer;

    return gitOpsApi.updateSingleFile(octokit, {
        repoOwner: serverUtils.repoOwner,
        repoName: serverUtils.repoName,
        branchName: branch,
        filePath: answersFilePath,
        fileContent: JSON.stringify(jsonFileContent),
        // Including "[skip ci]" in the commit message notifies notifies Netlify not to trigger a deploy.
        commitMessage: "chore: [skip ci] update " + answersFilePath,
        sha: sha
    });
};

export async function onRequest(event) {
    const incomingData = JSON.parse(event.body);
    console.log("Received save_answers request at " + new Date() + " with id " + incomingData.requestId);
    const blob = new Blob();

    const wordleId = incomingData.wordleId;
    const answers = incomingData.answers;

    // Reject the request when:
    // 1. Not a POST request;
    // 2. Doesn’t provide required values
    if (event.httpMethod !== "POST" || !serverUtils.isParamsExist([wordleId, answers])) {
        return serverUtils.invalidRequestResponse;
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });
    const newAnswer = {
        answers,
        createdTimestamp: new Date().toISOString()
    };
    const branch = serverUtils.branchName;

    try {
        const answersFilePath = "src/_data/" + wordleId + "-answers.json";
        // check if answers.json exists
        const answerFileInfo = await fetchJSONFile(octokit, branch, answersFilePath);
        console.log("Got answerFileInfo ", JSON.stringify(answerFileInfo));

        if (answerFileInfo.exists) {
            // File exists: update the existing answers file
            console.log("Updating an existing answers file...");
            await updateAnswerFile(octokit, answersFilePath, answerFileInfo.content, answerFileInfo.sha, branch, newAnswer);
            console.log("Done: Updated the answers file.");
        } else {
            // File does not exist: create a new answers file
            console.log("Creating a new answers file...");
            await createAnswerFile(octokit, answersFilePath, branch, newAnswer);
            console.log("Done: Created the answers file.");
        }

        return new Response(blob, {
            statusCode: 200,
            body: "Success"
        });
    } catch (e) {
        console.log("save_answers error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        });
    }
};
