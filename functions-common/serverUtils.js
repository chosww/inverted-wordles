"use strict";

// Netlify API endpoint
exports.netlifyApi = "https://api.netlify.com/api/v1";

// Parse GitHub repository owner and name
const matches = /https:\/\/github.com\/(.*)\/(.*)/.exec(env.REPOSITORY_URL);
const repoOwner = matches[1];
const repoName = matches[2];

exports.repoOwner = repoOwner;
exports.repoName = repoName;
exports.branchName = env.BRANCH;

// Define a common error message for invalid incoming requests
exports.invalidRequestResponse = {
    statusCode: 400,
    body: JSON.stringify({
        message: "Invalid HTTP request method or missing field values or missing environment variables."
    })
};

/**
 * Check if all values required by the endpoint are provided. These values include values sent in the request
 * and values expected to be defined as environment variables.
 * @param {String[]} values - Optional. Values sent in the request.
 * @return {Boolean} Return true if all values exist. Otherwise, return false.
 */
exports.isParamsExist = values => {
    const isAllValuesExist = values ? values.every(value => !!value) : true;
    return isAllValuesExist && env.GITHUB_TOKEN && env.NETLIFY_TOKEN && repoOwner && repoName;
};
