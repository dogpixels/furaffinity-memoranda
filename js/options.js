/**
 * @fileoverview FurAffinity Memoranda Options Script
 * @version 1.0
 * @author draconigen <draconigen@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # want a challenge? try a horse
 */

/**
 * @type {object} A {username:note} copy of all data in storage.
 * Populated on <input id="search"> focus event for an up-to-date
 * representation of storage contents while optimizing storage read.
 */
storageDataCache = {};

window.addEventListener('load', async () => {
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
            let success = await writeNote(getCurrentUsername(), textarea.value);
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
    const ul = document.getElementById('usernames');

    let usernames = await getUsernames();

    // filter usernames by search
    if (search !== '') {
        document.getElementById('usernameTitle').innerText = 'Matching Notes';
        search = search.toLowerCase();
        usernames = Object.keys(storageDataCache).filter(key => {
            return (storageDataCache[key].toLowerCase().includes(search));
        });
    }
    else
        document.getElementById('usernameTitle').innerText = 'Existing Notes';

    ul.innerHTML = '';
    usernames.forEach(username => {
        ul.appendChild(createLi(username));
    });

    // adjust username list to longest retrieved entry
    const longestUsernameLength = usernames.reduce((a, b) => a.length < b.length ? b : a, "").length;
    if (longestUsernameLength <= 15)
        ul.style.columnCount = 4;
    else if (longestUsernameLength <= 21)
        ul.style.columnCount = 3;
    else
        ul.style.columnCount = 2;
}

// react on reply from background script
browser.runtime.onMessage.addListener((msg) => {
    // console.debug('[FA Memo][userpage.content.js] message received:', msg);

    if (!msg.action)
        return;

    switch (msg.action) {
        case 'updateNote':
            const ul = document.getElementById('usernames');
            const li = ul.querySelector(`[data-username="${msg.username}"]`);

            // case: name is not on the list, but was added on another page
            if (!li && msg.note !== '') {
                const li = createLi(msg.username);
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
            if (li && msg.note === '')
                li.remove();

            // case: name is currently selected
            if (getCurrentUsername() === msg.username) {
                const famemo = document.getElementById('famemo');
                famemo.querySelector('textarea').value = msg.note;
                famemo.querySelector('#famemo-charcount').innerText = msg.note.length;
            }
            break;
    }
});

/**
 * Creates a list item and returns it, so that you can insert it into a <ul> element.
 * @example ul.appendChild(createLiElement(msg.username));
 * @param {string} username username to create list item for
 * @returns {Element} <li data-username="USERNAME">USERNAME</li>
 */
function createLi(username) {
    const li = document.createElement('li');
    li.innerText = username;
    li.dataset.username = username;
    li.addEventListener('click', async () => { // todo: async needed here?
        setCurrentUsername(username);
        loadNote(username);
    });
    return li;
}

/**
 * Sets the currently selected (and loaded into the textarea) username.
 * @param {string} username the username to set as the currently loaded one
 */
function setCurrentUsername(username) {
    const cu = document.getElementById('currentUsername');
    cu.dataset.username = username;
    cu.innerHTML = `on <a href="https://furaffinity.net/user/${username}">${username}</a>`;
}

/**
 * Retrieves the currently selected (and loaded into the textarea) username.
 * @returns {string} the currently selected and loaded username
 */
function getCurrentUsername() {
    return document.getElementById('currentUsername').dataset.username;
}