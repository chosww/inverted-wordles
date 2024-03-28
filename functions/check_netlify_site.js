"use strict";

const serverUtils = require("../functions-common/serverUtils.js");
const fetchNetlifySiteInfo = require("../functions-common/fetchNetlifySiteInfo.js").fetchNetlifySiteInfo;

/**
 * Support the endpoint /api/check_netlify_site
 * It makes use of [the Netlify /sites API](https://api.netlify.com/api/v1/sites), and search through its entire
 * response to find out whether the expected repo, defined via the environment variable REPOSITORY_URL, is found
 * in the build_settings field. See https://docs.netlify.com/api/get-started/#get-sites
 */

export async function onRequest(event) {
    console.log("Received check_netlify_site request at " + new Date());
    const blob = new Blob();

    // Reject the request when:
    // 1. Not a GET request;
    // 2. Doesn’t provide required values
    if (event.httpMethod !== "GET" || !serverUtils.isParamsExist()) {
        return serverUtils.invalidRequestResponse;
    }

    try {
        const netlifyInfo = await fetchNetlifySiteInfo();
        console.log("Done: if the current site is a Netlify site: " + !!netlifyInfo.id);
        return new Response(blob, {
            statusCode: 200,
            body: JSON.stringify({
                isNetlifySite: !!netlifyInfo.id
            })
        });
    } catch (e) {
        console.log("check_netlify_site error: ", e);
        return new Response(blob, {
            statusCode: 400,
            body: JSON.stringify({
                error: e.response.statusText
            })
        });
    }
};
