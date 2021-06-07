"use strict";

const {
    Octokit
} = require("@octokit/core");
const uuid = require("uuid");

const fetchAnswerFile = require("../functions-common/fetchAnswerFile.js").fetchAnswerFile;

/**
 * Create a new answers file. The new answer is written into a JSON file and keyed by a uuid.
 * @param {Object} octokit - An instance of octokit with authentication being set.
 * @param {String} branch - The name of the branch that the file will be created in.
 * @param {Object} newAnswer - The answer written into the new file.
 * @return {Promise} The resolve or reject of the promise indicates whether the file is created successfully or
 * unsuccessfully.
 */
const createAnswerFile = async (octokit, branch, newAnswer) => {
    const uniqueId = uuid.v4();
    return new Promise((resolve, reject) => {
        const jsonFileContent = {};
        jsonFileContent[uniqueId] = newAnswer;

        // Create a new answers file
        octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
            owner: process.env.WORDLES_REPO_OWNER,
            repo: process.env.WORDLES_REPO_NAME,
            path: "src/_data/answers.json",
            // Including "[skip ci]" in the commit message notifies notifies Netlify not to trigger a deploy.
            message: "chore: [skip ci] create answers.json",
            content: Buffer.from(JSON.stringify(jsonFileContent)).toString("base64"),
            branch: branch
        }).then(() => {
            resolve();
        }, (e) => {
            reject("Error at creating the answers file: ", e.message);
        });
    });
};

/**
 * Update an existing answers file by appending the new answer keyed by a uuid key to the existing file.
 * @param {Object} octokit - An instance of octokit with authentication being set.
 * @param {String} jsonFileContent - The content of the existing answers.json file.
 * @param {String} sha - The sha of the existing file.
 * @param {String} branch - The name of the branch that the file to be updated sits in.
 * @param {Object} newAnswer - The answer appended to the existing file.
 * @return {Promise} The resolve or reject of the promise indicate the file is updated successfully or
 * unsuccessfully.
 */
const updateAnswerFile = async (octokit, jsonFileContent, sha, branch, newAnswer) => {
    const uniqueId = uuid.v4();
    jsonFileContent[uniqueId] = newAnswer;

    return new Promise((resolve, reject) => {
        // Update an existing answers file
        octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
            owner: process.env.WORDLES_REPO_OWNER,
            repo: process.env.WORDLES_REPO_NAME,
            path: "src/_data/answers.json",
            // Including "[skip ci]" in the commit message notifies Netlify not to trigger a deploy.
            message: "chore: [skip ci] update answers.json",
            content: Buffer.from(JSON.stringify(jsonFileContent)).toString("base64"),
            sha: sha,
            branch: branch
        }).then(() => {
            resolve();
        }, (e) => {
            console.log("Got error.request ", e.request);
            console.log("Got error ", e);
            reject("Error at updating the answers file: " + e.data);
        });
    });
};

exports.handler = async function (event) {
    const incomingData = JSON.parse(event.body);
    console.log("Received save_answers request at " + new Date() + " with id " + incomingData.requestId);

    // Reject the request when:
    // 1. Not a POST request;
    // 2. Doesn’t provide required values
    if (event.httpMethod !== "POST" || !incomingData.branch || !incomingData.answers ||
        !process.env.ACCESS_TOKEN || !process.env.WORDLES_REPO_OWNER || !process.env.WORDLES_REPO_NAME) {
        return {
            statusCode: 400,
            body: "Invalid HTTP request method or missing field values or missing environment variables."
        };
    }

    const octokit = new Octokit({
        auth: process.env.ACCESS_TOKEN
    });
    const newAnswer = {
        answers: incomingData.answers,
        createdTimestamp: new Date().toISOString()
    };

    try {
        // check if answers.json exists
        const answerFileInfo = await fetchAnswerFile(octokit, incomingData.branch);
        console.log("Got answerFileInfo ", JSON.stringify(answerFileInfo));

        if (answerFileInfo.exists) {
            // File exists: update the existing answers file
            console.log("Updating an existing answers file...");
            await updateAnswerFile(octokit, answerFileInfo.content, answerFileInfo.sha, incomingData.branch, newAnswer);
            console.log("Done: Updated the answers file.");
        } else {
            // File does not exist: create a new answers file
            console.log("Creating a new answers file...");
            await createAnswerFile(octokit, incomingData.branch, newAnswer);
            console.log("Done: Created the answers file.");
        }

        return {
            statusCode: 200,
            body: "Success"
        };
    } catch (e) {
        console.log("save_answers error: ", e);
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: e
            })
        };
    }
};