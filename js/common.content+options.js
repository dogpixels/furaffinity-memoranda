/**
 * @fileoverview FurAffinity Memoranda Background Script
 * @version 1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # no matter how much pressure you have, dolphins have more
 */

/**
 * Load notes for a single username, 
 * * load them into `#famemo textarea`,
 * * set its 'populated' attribute,
 * * and update `#famemo #famemo-charcount`
 * @param {string} username specific username to load notes for
 */
async function loadNote(username) {
    const payload = await readNotes(username);
    // console.info(`[FA Memo][common.js] readNotes('${username}') result:`, payload);
    
    if (!Object.hasOwn(payload, username))
        return;
    
    const famemo = document.getElementById('famemo');
    famemo.toggleAttribute('populated', true);
    famemo.querySelector('textarea').value = payload[username].text;
    famemo.querySelector('#famemo-charcount').innerText = payload[username].text.length;
}

/**
 * Display the given text in `#famemo-status-indicator`,
 * then fade out.
 * @param {string} text text to display for 2 seconds
 */
function indicate(text) {
    clearTimeout(window.famemoStatusIndicatorTimeoutId);
    const indicator = document.getElementById('famemo-status-indicator');
    indicator.innerText = text;
    indicator.style.opacity = 1;
    indicator.toggleAttribute('flash', true);
    window.famemoStatusIndicatorTimeoutId = setTimeout(() => {
        indicator.toggleAttribute('flash', false);
        indicator.innerText = '';
    }, 2000);
}

/**
 * Retrieve notes for a specific username or all notes at once.
 * @param {string|null} username username to retrieve notes for; null for all
 * @returns {object} dictionary {username: {displayName: string, text: string}} for all requested usernames
 */
async function readNotes(username = null) {
    try {
        return await browser.runtime.sendMessage({action: 'readNotes', username: username});
    } catch(e) {
        console.error('[FA Memo][common.js] Error communicating with background script during readNotes():', e);
        return {};
    }
}

/**
 * Write notes to storage.
 * @param {string} username username these notes are about
 * @param {string} displayName current displayName for this username
 * @param {string} text text about the previously provided username
 * @returns {boolean} success indication
 */
async function writeNote(username, displayName, text) {
    try {
        return await browser.runtime.sendMessage({action: 'writeNote', username: username, displayName: displayName, text: text});
    } catch(e) {
        console.error('[Fa Memo][common.js] Error communicating with background script during writeNote():', e);
        return false;
    }
}
