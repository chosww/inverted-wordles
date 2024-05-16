"use strict";

/* global d3, wordle_globals, inverted_wordles */

inverted_wordles.stringTemplateRegex = /\${([^\}]*)}/g;

/** Perform string templating by interpolation of terms expressed as "${term1} ... text ... ${term2}" etc. supplied as a
 * hash, in a function similar to that supplied at the language level by ES6 templating
 * @param {String} template - The template to be interpolated
 * @param {Object} terms - The hash of terms to be interpolated into the template
 * @return {String} The interpolated template
 */
inverted_wordles.stringTemplate = function (template, terms) {
    var replacer = function (all, match) {
        return terms[match] || "";
    };
    return template.replace(inverted_wordles.stringTemplateRegex, replacer);
};

/** Given the contents of the answers.json file from github, construct a hash of answer words to their frequencies
 * @param {Object} answersFile - Contents of the answers file as JSON
 * @return {Count[]} An array of {word, count}
 */
inverted_wordles.extractAnswers = function (answersFile) {
    var counts = {};
    var storeAnswer = function (answer) {
        counts[answer] = counts[answer] ? counts[answer] + 1 : 1;
    };
    Object.values(answersFile).forEach(function (oneAnswerRec) {
        oneAnswerRec.answers.forEach(function (answer) {
            storeAnswer(answer.trim().toLowerCase());
        });
    });
    return Object.entries(counts).map(function (entry) {
        return {
            word: entry[0],
            count: entry[1]
        };
    });
};

/** Given an array of words and counts, compute the total number of answers
 * @param {Counts[]} counts - An array of {word, count}
 * @return {Integer} The total number of answers
 */
inverted_wordles.countAnswers = function (counts) {
    return counts.reduce((a, rec) => a + rec.count, 0);
};

/** Render the layout constructed from makeLayout into the DOM element designated in the supplied Wordle instance
 * @param {d3Layout} layout - The layout object for the Wordle
 * @param {Array} words - Array of "word" objects holding text/size defining the layout
 * @param {WordleInstance} instance - The Wordle instance for which the layout is to be rendered
 */
inverted_wordles.drawLayout = function (layout, words, instance) {
    instance.element.innerHTML = ""; // TODO: move the "g" generation into static code
    var colours = d3.scaleOrdinal(instance.colours);
    d3.select(instance.element)
        .attr("width", layout.size()[0])
        .attr("height", layout.size()[1])
        .append("g")
        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", function (d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", function (d) {
            return colours(d.text);
        })
        .attr("class", "wordle-text")
        .attr("text-anchor", "middle")
        .attr("transform", function (d) {
            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function (d) { return d.text; });
};

/** Return the computed value of the font size of the given DOM element
 * @param {Element} elm - A DOM element
 * @return {Number} The computed value of the font size of the given element
 */
inverted_wordles.getFontSizeValue = function (elm) {
    const style = window.getComputedStyle(elm, null).getPropertyValue("font-size");
    return parseFloat(style);
};

/** Find font sizes of all text nodes and sort unique values into an array. The array is returned by attaching
 * to the wordle instance
 * @param {WordleInstance} instance - The singleton instance
 * @param {Element[]} textElements - An array of DOM elements for wordle texts
 */
inverted_wordles.getSortedUniqueFontSizes = function (instance, textElements) {
    let fontSizes = [];
    textElements.forEach(elm => {
        fontSizes.push(inverted_wordles.getFontSizeValue(elm));
    });

    const uniqueFontSizes = fontSizes.filter((value, index, selfArray) => selfArray.indexOf(value) === index);
    instance.sortedUniqueFontSizes = [...uniqueFontSizes].sort((a, b) => a - b);
};

/** Calculate the pitch value based on the font size
 * @param {Number} thisFontSize - The font size The font size that is based upon to calculate the pitch value
 * @param {Number[]} sortedUniqueFontSizes - Sorted and unique values of all font sizes
 * @return {Number} The calculated pitch value in two decimal points
 */
inverted_wordles.calculatePitch = function (thisFontSize, sortedUniqueFontSizes) {
    return sortedUniqueFontSizes.length === 1 ? 1 : 2 * sortedUniqueFontSizes.indexOf(thisFontSize) / (sortedUniqueFontSizes.length - 1);
};

/** Use web speech API to read wordle texts. The pitch of the voice represents the font size of the text
 * The larger the font size, the higer should be the pitch.
 * @param {WordleInstance} instance - The Wordle instance that the speechSynthesis is retrieved from
 * @param {Element[]} textElements - An array of DOM elements for wordle texts
 */
inverted_wordles.bindTTS = function (instance, textElements) {
    textElements.forEach(elm => {
        // Speak the wordle text when the text gains a focus or under a pointer.
        // Note: The "pointerover" event covers the mouseover event and pointer over events via user's fingers
        // and other means. See https://stackoverflow.com/questions/22773548/difference-between-the-mouseover-and-pointerover-in-visualstatemanager
        ["pointerover", "focus"].forEach(evt => {
            elm.addEventListener(evt, (e) => {
                // If the voiceOver is chosen to be disabled, do nothing
                if (!instance.tts) {
                    return;
                }

                // Cancel the previous announcement
                instance.synth.cancel();
                // Announce the current text
                let utterThis = new SpeechSynthesisUtterance(e.target.textContent);
                utterThis.pitch = inverted_wordles.calculatePitch(inverted_wordles.getFontSizeValue(e.target), instance.sortedUniqueFontSizes);
                instance.synth.speak(utterThis);
            });
        });
    });
};

/** Construct the d3 cloud layout object from the supplied Wordle instance
 * @param {WordleInstance} instance - The Wordle instance for which the layout is to be constructed
 * @return {d3Layout} The layout object for the Wordle
 */
inverted_wordles.makeLayout = function (instance) {
    var maxCount = Math.max.apply(null, instance.answerCounts.map(entry => entry.count));
    var element = instance.element;
    var laidWords;

    var layout;

    for (var i = 0; i < 10; ++i) {
        var wordRecs = instance.answerCounts.map(function (entry) {
            return {text: entry.word, size: instance.conventional ? instance.scale * 120 * entry.count / maxCount :
                instance.scale * 40 * maxCount / entry.count};
        });
        layout = d3.layout.cloud()
            .size([element.getAttribute("width"), element.getAttribute("height")])
            .padding(5)
            .font("Impact")
            .fontSize(function (d) { return d.size; })
            .rotate(function () { return instance.rotate[Math.floor(Math.random() * instance.rotate.length)]; })
            // Claims to be event-driven but is actually synchronous
            .on("end", function (words) {
                laidWords = words;
                // Shocking d3 integration model
            });
        layout.words(wordRecs);
        layout.start();
        if (laidWords.length < wordRecs.length) {
            instance.scale *= 0.8;
            console.log("Only laid out " + laidWords.length + " out of " + wordRecs.length + " words, retrying with scale factor " + instance.scale);
        } else {
            break;
        }
    }
    inverted_wordles.drawLayout(layout, laidWords, instance);

    const textElements = document.querySelectorAll("text.wordle-text");
    // Make wordle texts tabbable by setting tabindex to "0"
    textElements.forEach(elm => {
        elm.setAttribute("tabindex", "0");
    });

    // Enable text-to-speed for wordle texts
    inverted_wordles.getSortedUniqueFontSizes(instance, textElements);
    inverted_wordles.bindTTS(instance, textElements);
    return layout;
};

/** Given the XHR response, render a wordle instance into its configured selector
 * @param {WordleInstance} instance - The wordle instance
 * @param {FetchResponse} response - Fetch response for the answers file from github
 */
inverted_wordles.handleResponse = function (instance, response) {
    response.json().then(function (answersFile) {
        var answerCounts = inverted_wordles.extractAnswers(answersFile);
        var totalAnswers = inverted_wordles.countAnswers(answerCounts);
        if (totalAnswers !== inverted_wordles.countAnswers(instance.answerCounts)) {
            console.log("Updated total answer count to " + totalAnswers);
            instance.answerCounts = answerCounts;
            inverted_wordles.makeLayout(instance);
        } else {
            console.log("No change in answer count");
        }
    });
};

// Note this uses a dedicated Netlify/Lambda endpoint rather than polling raw.githubusercontent.com
// as written up at https://issues.fluidproject.org/browse/FLUID-6626

/** Fetch the answers file from github and perform an initial render of the world into the supplied selector. Initialise
 * data in the Wordle instance, and resolving github coordinates from the `wordle_globals` global
 * rendered into the initial markup
 * @param {WordleInstance} instance - The wordle instance to be initialised
 */
inverted_wordles.fetchAnswers = function (instance) {
    var url = "/api/fetch_answer/" + wordle_globals.wordleId;
    fetch(url).then(function (response) {
        inverted_wordles.handleResponse(instance, response);
    }, function (error) {
        console.log("Error fetching url " + url + ": ", error);
    });
};

/** If the browser doesn't support web speech API, disable the checkbox that enables/disables voiceOver
 * and display the error message
 * @param {Object} synth - The speech synthesis object
 * @param {Object} selectors - The selectors including tts related elements
 */
inverted_wordles.checkTTS = function (synth, selectors) {
    if (!synth) {
        document.querySelector(selectors.tts).disabled = true;
        document.querySelector(selectors.ttsController).classList.add("disabled");
    }
};

/** Bind the global wordle instance to the "conventional layout" checkbox
 * @param {String} selector - Selector to the checkbox to be bound
 * @param {WordleInstance} instance - The wordle instance
 */
inverted_wordles.bindConventional = function (selector, instance) {
    var element = document.querySelector(selector);
    element.addEventListener("change", function () {
        instance.conventional = this.checked;
        instance.scale = 1.0;
        window.setTimeout(function () {
            inverted_wordles.makeLayout(instance);
        }, 1);
    });
};

/** Bind the global wordle instance to the "Enable Pointer VoiceOver" checkbox
 * @param {String} selector - Selector to the checkbox to be bound
 * @param {WordleInstance} instance - The wordle instance
 */
inverted_wordles.bindTTSInput = function (selector, instance) {
    var element = document.querySelector(selector);
    element.addEventListener("change", function () {
        instance.tts = this.checked;
    });
};

inverted_wordles.initWordle = function (options) {
    var instance = inverted_wordles.instance;

    inverted_wordles.checkTTS(instance.synth, options.selectors);
    inverted_wordles.instance.element = document.querySelector(options.selectors.render);
    inverted_wordles.fetchAnswers(instance);
    inverted_wordles.bindConventional(options.selectors.conventional, instance);
    inverted_wordles.bindTTSInput(options.selectors.tts, instance);
    instance.pollInterval = setInterval(function () {
        inverted_wordles.fetchAnswers(instance);
    }, 5000);
    // Poll for a maximum of 10 minutes before cancelling
    instance.cancelPoll = setInterval(function () {
        clearInterval(instance.pollInterval);
        instance.pollInterval = null;
    }, 10 * 60 * 1000);
};

// Represents the singleton "instance" of the Wordle, which will be progressively initialised by calls starting at
// inverted_wordles.initWordle
inverted_wordles.instance = {
    // DOM element holding the rendered SVG
    element: null,
    // Vector of words and their counts
    answerCounts: [],
    // Whether the word sizing strategy uses the "inverted" approach (the default, false) or the "conventional" where size scales with count
    conventional: false,
    // Whether the pointer VoiceOver for wordle texts is enabled
    tts: false,
    // The intervalID for polling github for updates
    pollInterval: null,
    // The intervalID for cancelling the polling
    cancelPoll: null,
    // Scaling factor to ensure fit of all words
    scale: 1.0,
    // Colours for filling wordle texts
    colours: ["#4D806F", "#1B7E83", "#0080A3", "#1365B0", "#5E56A2", "#7870A4", "#6E6E6E", "#505050"],
    // Rotate directions
    rotate: [0, -90],
    // Speech Synthesis for reading wordle texts
    synth: window.speechSynthesis,
    // An array of sorted and unique of wordle text font sizes
    sortedUniqueFontSizes: null
};
