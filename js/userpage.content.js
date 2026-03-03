/**
 * @fileoverview FurAffinity Memoranda Content Script
 * @version 1.0
 * @author draconigen <draconigen@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # go tie a dog knot
 */

const parentElementIdentifier = '.userpage-layout-profile-container';
const insertBeforeElementIdentifier = '.userpage-profile';

console.log("okay");

// detect DOM ready (window.load and document.DOMContentLoaded do seem to fire reliably)
const domReadyInterval = setInterval(async () => {
    // poll for parent element to become available
    if (!document.querySelector(parentElementIdentifier))
        return;
    clearInterval(domReadyInterval);

    // go
    console.info('[FA Memo][userpage.content.js] FurAffinity Memoranda engaged.');

    // read target username
    window.userpageUsername = window.location.pathname.match(/^\/user\/([^\/]+)\/?/)[1];
    if (!window.userpageUsername) {
        console.error(
            '[FA Memo][userpage.content.js] Failed to obtain userpage username from window.location:',
            window.location
        );
        return;
    }
    console.info('[FA Memo][userpage.content.js] obtained userpage username:', window.userpageUsername);

    if (!inject())
        return;

    // load existing notes
    loadNote(window.userpageUsername);
}, 100);

// document.addEventListener('DOMContentLoaded', async () => {
//     console.info('[FA Memo][userpage.content.js] FurAffinity Memoranda engaged.');

//     // read target username
//     window.userpageUsername = window.location.pathname.match(/^\/user\/([^\/]+)\/?/)[1];
//     if (!window.userpageUsername) {
//         console.error(
//             '[FA Memo][userpage.content.js] Failed to obtain userpage username from window.location:',
//             window.location
//         );
//         return;
//     }
//     console.info('[FA Memo][userpage.content.js] obtained userpage username:', window.userpageUsername);

//     if (!inject())
//         return;

//     // load existing notes
//     loadNote(window.userpageUsername);
// });

/**
 * Inject notes textarea into profile page.
 * @returns {boolean} success indication
 */
function inject() {
    // check if logged in
    // const documentBody = document.querySelector('body');
    // if (documentBody.dataset['userLoggedIn'] == "1") {
    //     console.info('[FA Memo][userpage.content.js] User logged in.');
    // }
    // else {
    //     console.warn(
    //         '[FA Memo][userpage.content.js] User not logged in according to documentBody:',
    //         documentBody
    //     )
    //     return;
    // }

    // retrieve own username
    // const profileLink = document.querySelector('a[href^="/user/"]');
    // const ownUsername = profileLink?.getAttribute('href').match(/^\/user\/([^\/]+)\//)[1];
    // if (!ownUsername) {
    //     console.error(
    //         '[FA Memo][userpage.content.js] Failed to obtain own username from profileLink:',
    //         profileLink
    //     );
    //     return;
    // }
    // console.info('[FA Memo][userpage.content.js] identified own username:', ownUsername);

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
            let success = await writeNote(window.userpageUsername, textarea.value);
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

// react on reply from background script
browser.runtime.onMessage.addListener((msg) => {
    // console.debug('[FA Memo][userpage.content.js] message received:', msg);

    if (!msg.action)
        return;

    switch (msg.action) {
        case 'log':
            console[msg.level](msg.message);
            break;

        case 'updateNote':
            const famemo = document.getElementById(`famemo`);
            famemo.toggleAttribute('populated', true);
            famemo.querySelector('textarea').value = msg.note;
            famemo.querySelector('#famemo-charcount').innerText = msg.note.length;
    }
});