/**
 * @fileoverview FurAffinity Memoranda Background Script
 * @version 1.0
 * @author draconigen <draconigen@dogpixels.net>
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
    const notes = await readNotes(username);
    
    // console.info(`[FA Memo][common.js] readNotes('${username}') result:`, notes);
    
    if (!Object.hasOwn(notes, username))
        return;

    const famemo = document.getElementById('famemo');
    famemo.toggleAttribute('populated', true);
    famemo.querySelector('textarea').value = notes[username];
    famemo.querySelector('#famemo-charcount').innerText = notes[username].length;
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
 * Retrieve all known usernames for which notes are stored.
 * @returns an array of all known usernames
 * @example ['blotch', 'kenket', 'vinaru']
 */
async function getUsernames() {
    try {
        return await browser.runtime.sendMessage({action: 'getUsernames'});
    } catch(e) {
        console.error('[FA Memo][common.js] Error communicating with background script during getUsernames():', e);
        return {};
    }
}

/**
 * Retrieve notes for a specific username or all notes at once.
 * @param {string|null} username username to retrieve notes for; null for all
 * @returns {object} dictionary {username: notes} for all requested usernames
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
 * @param {string} note notes about the previously provided username
 * @returns {boolean} success indication
 */
async function writeNote(username, note) {
    try {
        return await browser.runtime.sendMessage({action: 'writeNote', username: username, note: note});
    } catch(e) {
        console.error('[Fa Memo][common.js] Error communicating with background script during writeNote():', e);
        return false;
    }
}

/**
 * Open Options page (via openOptionsPage in background.js)
 * @returns {boolean} success indication
 */
async function openOptionsPage() {
    try {
        return await browser.runtime.sendMessage({action: 'openOptionsPage'});
    } catch(e) {
        console.error('[Fa Memo][common.js] Error communicating with background script during openOptionsPage():', e);
        return false;
    }
}