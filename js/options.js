/**
 * @fileoverview FurAffinity Memoranda Options Script
 * @version 1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # want a challenge? try a horse
 */

/**
 * options.js scoped config
 */
const config = {
    debug: false,         // additional info and debug log output to background console
    storageArea: 'local', // see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#properties
    dbSchemaVersion: 1    // used for import/export compatibility checks
}

/**
 * @type {object} A {username:{displayName:string, text:string} copy of all data in storage.
 * Populated on <input id="search"> focus event for an up-to-date
 * representation of storage contents while optimizing storage read.
 */
storageDataCache = {};

window.addEventListener('load', async () => {
    storageDataCache = await readNotes();

    if (!initialize())
        return;

    // load existing notes
    loadUsernamesForSearch('');
});

function initialize() {
    const famemo = document.getElementById('famemo');
    const search = document.getElementById('search');
    const textarea = famemo.querySelector('textarea');
    const charcount = famemo.querySelector('#famemo-charcount');

    // search input event handler
    search.addEventListener('focus', async () => {
        storageDataCache = await readNotes();
    });

    let searchDebounceTimeoutId;
    search.addEventListener('input', () => {
        clearTimeout(searchDebounceTimeoutId);
        searchDebounceTimeoutId = setTimeout(async () => {
            loadUsernamesForSearch(search.value)
        }, 200);
    });

    // textarea event handler
    let textareaDebounceTimeoutId;
    textarea.addEventListener('input', () => {
        charcount.innerText = textarea.value.length;
        clearTimeout(textareaDebounceTimeoutId);
        textareaDebounceTimeoutId = setTimeout(async () => {
            indicate('🔄 saving…');
            let success = await writeNote(getCurrentUsername(), getCurrentDisplayName(), textarea.value);
            indicate(success? '✅ saved':'❌ error saving');
        }, 1000);
    });

    return true;
}

/**
 * filter usernames by search query or don't filter at all by passing an empty string
 * @param {string} search search query
 */
async function loadUsernamesForSearch(search) {
    search = search.toLowerCase();
    const ul = document.getElementById('usernames');

    if (search !== '')
        document.getElementById('usernameTitle').innerText = 'Matching Notes';
    else
        document.getElementById('usernameTitle').innerText = 'Existing Notes';

    ul.innerHTML = '';
    for (const username in storageDataCache) {
        const payload = storageDataCache[username];
        if (search !== '' && !payload.text.toLowerCase().includes(search))
            continue;
        ul.appendChild(createLi(username, payload.displayName));
    }
}

// handle background script messages
browser.runtime.onMessage.addListener((msg) => {
    if (config.debug) console.debug('[FA Memo][options.js] message received:', msg);

    if (!msg.action)
        return;

    switch (msg.action) {
        case 'update':
            const ul = document.getElementById('usernames');
            const li = ul.querySelector(`[data-username="${msg.username}"]`);

            // case: name is not on the list, but was added on another page
            if (!li && msg.text !== '') {
                const li = createLi(msg.username, msg.displayName);
                // insert new <li> at alphabetically correct place
                const items = [...ul.querySelectorAll('li')];

                const next = items.find(item =>
                    item.dataset.username.localeCompare(msg.username) > 0
                );

                if (next)
                    ul.insertBefore(li, next);
                else
                    ul.appendChild(li);
            }

            // case: name is on the "Existing Notes" list, but note was deleted
            if (li && msg.text === '')
                li.remove();

            // case: name is currently selected
            if (getCurrentUsername() === msg.username) {
                const famemo = document.getElementById('famemo');
                famemo.querySelector('textarea').value = msg.text;
                famemo.querySelector('#famemo-charcount').innerText = msg.text.length;
            }
            break;
    }
});

/**
 * Creates a list item and returns it, so that you can insert it into a <ul> element.
 * @example ul.appendChild(createLiElement(msg.username, msg.displayName));
 * @param {string} username username to create list item for
 * @param {string} displayName displayName corresponding to the username
 * @returns {Element} <li data-username="USERNAME">USERNAME</li>
 */
function createLi(username, displayName) {
    const li = document.createElement('li');

    if (username.toLowerCase() === displayName.toLowerCase())
        li.innerText = `${displayName}`
    else
        li.innerText = `${displayName} (~${username})`;

    li.dataset.username = username;

    li.addEventListener('click', () => {
        setCurrentUsername(username, displayName);
        loadNote(username);
    });

    return li;
}

/**
 * Sets the currently selected (and loaded into the textarea) username.
 * @param {string} username the username to set as the currently loaded one
 * @param {string} displayName the displayName to set as the currently loaded one
 */
function setCurrentUsername(username, displayName) {
    const cu = document.getElementById('currentUsername');
    cu.innerText = '';
    cu.dataset.username = username;
    cu.dataset.displayName = displayName;
    const a = document.createElement('a');
    cu.appendChild(a);
    a.href = `https://furaffinity.net/user/${username}`;
    a.innerText = username.toLowerCase() === displayName.toLowerCase()? `${displayName}` : `${displayName} (~${username})`;
}

/**
 * Retrieves the currently selected (and loaded into the textarea) username.
 * @returns {string} the currently selected and loaded username
 */
function getCurrentUsername() {
    return document.getElementById('currentUsername').dataset.username;
}

/**
 * Retrieves the currently selected (and loaded into the textarea) username's displayName.
 * @returns {string} the currently selected and loaded username's displayName
 */
function getCurrentDisplayName() {
    return document.getElementById('currentUsername').dataset.displayName;
}

/**
 * Danger Zone Logic
 */

document.getElementById('deleteAll').addEventListener('click', async () => {
    if (window.confirm('Are you sure? This cannot be undone!')) {
        await browser.storage[config.storageArea].clear();
        
        if (config.debug) console.info('[FA Memo][options.js] All data cleared by user.');
        location.reload();
    }
});

document.getElementById('export').addEventListener('click', async () => {
    try {
        const payload = await browser.storage[config.storageArea].get(null);

        // add some meta information
        payload.$product = 'furaffinity-memoranda';
        payload.$version = config.dbSchemaVersion;

        const json = JSON.stringify(payload, null, 3);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `furaffinity-memoranda-backup-${config.storageArea}-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('[FA Memo][options.js] Export failed. Reason:', e);
    }
});

document.getElementById('import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file)
        return;

    try {
        const payload = JSON.parse(await file.text());

        if (payload.$product !== 'furaffinity-memoranda'){
            console.error('[FA Memo][options.js] Import failed due to product mismatch:', {expected: 'furaffinity-memoranda', imported: payload.$product});
            alert('Import failed: this file does not seem to come from FurAffinity Memoranda.');
            return;
        }

        if (payload.$version !== config.dbSchemaVersion) {
            console.error('[FA Memo][options.js] Import failed due to schema version mismatch:', {expected: 1, imported: payload.$version});
            alert('Import failed: this file seems to originate from an older version of FurAffinity Memoranda and is not compatible. Please contact support for a solution.');
            return;
        }

        // delete meta info as to not import them, too
        delete payload.$product;
        delete payload.$version;

        await browser.storage[config.storageArea].set(payload);

        if (config.debug) console.info('[FA Memo][options.js] Import succeeded.');
        location.reload();
    } catch (e) {
        console.error('[FA Memo][options.js] Import failed. Reason:', e);
    }
});
