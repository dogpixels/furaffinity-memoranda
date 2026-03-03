/**
 * @fileoverview FurAffinity Memoranda Background Script
 * @version 1.0
 * @author draconigen <draconigen@dogpixels.net>
 * @license AGPL-3.0
 * Provided "as is", without warranty of any kind.
 * # think twice before engaging with a squamate
 */

/**
 * background.js scoped config
 */
const config = {
    debug: false,        // additional info and debug log output to background console
    storageArea: 'local' // see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#properties
}

if (config.debug) console.info(`[FA Memo][background.js] Readying ${config.storageArea} storage.`);

/**
 * Generate a log message on client console via content script.
 * @param {string} level debug|info|warning|error
 * @param {string} message log message to display in content (string only, no second param for var types)
 */
async function log(level, message) {
    const tabs = (await browser.tabs.query({url: '*://*.furaffinity.net/user/*'}));
    tabs.forEach(async (tab) => {
        try {
            await browser.tabs.sendMessage(tab.id, {action: 'log', level: level, message: message});
        } catch(e) {
            console.warn(`[FA Memo][background/background.js] Failed to sendMessage(tab.id ${tab.id} (tab.url ${tab.url}), {action: 'log', level: ${level}, message: ${message}}). Reason:`, e);
        }
    });
}

/**
 * Handle Messages from content script.
 */
browser.runtime.onMessage.addListener(async (msg) => {
    if (config.debug) console.info('[FA Memo][background/background.js] message received:', msg);

    if (!msg.action)
        return;

    switch (msg.action) {
        case 'getUsernames':
             try {
                return await browser.storage[config.storageArea].getKeys();
            } catch(e) {
                console.error(e);
                log('error', '[FA Memo][background.js] Failed to read keys (usernames) from storage.');
                return {};
            }

        case 'readNotes':
            try {
                // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/getBytesInUse
                if (config.debug) console.info('bytesInUse:', await browser.storage[config.storageArea].getBytesInUse(null));
                return await browser.storage[config.storageArea].get(msg.username);
            } catch(e) {
                console.error(e);
                log('error', '[FA Memo][background.js] Failed to read from storage.');
                return {};
            }

        case 'writeNote':
            try {
                if (msg.note !== '')
                    await browser.storage[config.storageArea].set({[msg.username]: msg.note});
                else
                    await browser.storage[config.storageArea].remove(msg.username);
                return true;
            } catch (e) {
                console.error(e);
                log('error', '[FA Memo][background.js] Failed to write to storage.');
                return false;
            }
            
        case 'openOptionsPage':
            try {
                await browser.runtime.openOptionsPage();
                return true;
            } catch(e) {
                console.error(e);
                log('error', '[FA Memo][options.js] Failed openOptionsPage().');
                return false;
            }
    }
});

/**
 * When user edits an entry, broadcast an update to all other tabs
 * with the same userpage open and the addon options page
 */
browser.storage.onChanged.addListener(async (event) => {
    if (config.debug) console.info('[FA Memo][background/background.js] storage.onChanged fired:', event);
    for (const username in event) {
        if (!Object.hasOwn(event, username)) continue;

        const tabs = await browser.tabs.query({url: [
            `*://*.furaffinity.net/user/${username}`,
            `*://*.furaffinity.net/user/${username}/`,
            browser.runtime.getURL("html/options.html")
        ]});

    tabs.forEach(async (tab) => {
            // if the entry was deleted, event[username] will simply have only oldValue, but not newValue
            if (!event[username].newValue)
                event[username].newValue = '';

            try {
                await browser.tabs.sendMessage(tab.id, {action: 'updateNote', username: username, note: event[username].newValue});
            } catch(e) {
                console.warn(`[FA Memo][background/background.js] Failed to sendMessage(tab.id ${tab.id} (tab.url ${tab.url}), {action: 'updateNote', notes: '${event[username].newValue}'}). Reason:`, e);
            }
        });
    }
})
