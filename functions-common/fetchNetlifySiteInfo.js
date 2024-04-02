"use strict";

const axios = require("axios");
const serverUtils = require("./serverUtils.js");

/**
 * Find the netlify site info for the GitHub repository used by the current instance. The GitHub repository URL
 * is defined in env.REPOSITORY_URL. Returns the site id when found. Otherwise, return undefined when
 * the repository is not a netlify site.
 * @return {Object} The Netlify site information containing site "id" and "name"
 */
exports.fetchNetlifySiteInfo = async () => {
    const netlifyResponse = await axios.get(serverUtils.netlifyApi + "/sites", {
        headers: {
            "Authorization": "Bearer " + env.NETLIFY_TOKEN
        }
    });

    const matchedSite = netlifyResponse.data.find(oneSite => oneSite.build_settings.repo_url === env.REPOSITORY_URL);
    return matchedSite ? {
        id: matchedSite.id
    } : {};
};
