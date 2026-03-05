/**
 * @fileoverview FurAffinity Memoranda Content Script
 * @version 1.0
 * @author Flam <flam@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # go tie a dog knot
 */

const parentElementIdentifier = '.userpage-layout-profile-container';
const insertBeforeElementIdentifier = '.userpage-profile';

// detect DOM ready (window.load and document.DOMContentLoaded do seem to fire reliably)
const domReadyInterval = setInterval(async () => {
    // poll for parent element to become available
    if (!document.querySelector(parentElementIdentifier))
        return;
    clearInterval(domReadyInterval);

    // go
    // console.info('[FA Memo][userpage.content.js] FurAffinity Memoranda engaged.');

    // read target username
    window.userpageUsername = window.location.pathname.match(/^\/user\/([^\/]+)\/?/)[1];
    if (!window.userpageUsername) {
        console.error(
            '[FA Memo][userpage.content.js] Failed to obtain userpage username from window.location:',
            window.location
        );
        return;
    }
    // console.info('[FA Memo][userpage.content.js] obtained userpage username:', window.userpageUsername);

    // read target displayName
    // fallback to empty string, because it's not actually that important
    window.UserpageDisplayName = document.querySelector('.js-displayName')?.innerText || ''; 
    // console.info('[FA Memo][userpage.content.js] obtained userpage displayname:', window.UserpageDisplayName);

    if (!inject())
        return;

    // load existing notes
    loadNote(window.userpageUsername);
}, 100);

// react on reply from background script
browser.runtime.onMessage.addListener((msg) => {
    // console.debug('[FA Memo][userpage.content.js] message received:', msg);

    if (!msg.action)
        return;

    switch (msg.action) {
        case 'log':
            console[msg.level](msg.message);
            break;

        case 'update':
            const famemo = document.getElementById(`famemo`);
            famemo.toggleAttribute('populated', true);
            famemo.querySelector('textarea').value = msg.text;
            famemo.querySelector('#famemo-charcount').innerText = msg.text.length;
    }
});

/**
 * Inject notes textarea into profile page.
 * @returns {boolean} success indication
 */
function inject() {
    // find place to inject element
    const parentElement = document.querySelector(parentElementIdentifier);
    const insertBeforeElement = parentElement.querySelector(insertBeforeElementIdentifier);

    if (!parentElement || !insertBeforeElement) {
        console.error(
            '[FA Memo][userpage.content.js] Could not determine insertion elements:', 
            {parentElement: parentElement, insertBeforeElement: insertBeforeElement}
        );
        return false;
    }

    // create element to inject
    const mainElement = document.createElement('div');
    mainElement.innerHTML = `
    <section id="famemo" class="userpage-profile">
        <div class="section-body">
            <strong class="famemo-toggle">Private Memorandum</strong>
            <div class="famemo-container">
                <textarea rows="8" maxlength="4000" placeholder="private memos only accessible to you"></textarea>
                <div class="famemo-flex">
                    <div><span id="famemo-charcount">0</span> / 4000</div>
                    <div id="famemo-status-indicator" class="famemo-text-center"></div>
                    <div class="famemo-text-right"><a href="#" class="famemo-options-link">[open FurAffinity Memo Settings]</a></div>
                </div>
            </div>
        </div>
    </section>
    `;

    // inject element
    parentElement.insertBefore(mainElement, insertBeforeElement);

    const toggle    = parentElement.querySelector('.famemo-toggle');
    const container = parentElement.querySelector('.famemo-container');
    const textarea  = parentElement.querySelector('textarea');
    const charcount = parentElement.querySelector('#famemo-charcount');

    // accordion event handler
    toggle.addEventListener('click', () => {
        container.toggleAttribute('open');
    });

    // textarea event handler
    let debounceTimeoutId;
    textarea.addEventListener('input', () => {
        charcount.innerText = textarea.value.length;
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = setTimeout(async () => {
            indicate('🔄 saving…');
            let success = await writeNote(window.userpageUsername, window.UserpageDisplayName, textarea.value);
            indicate(success? '✅ saved':'❌ error saving');
        }, 1000);
    });

    // settings page link event handler
    parentElement.querySelector('.famemo-options-link').addEventListener('click', async () => {
        let success = await openOptionsPage();
        if (!success)
            indicate('❌ error opening settings');
    });

    return true;
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
