// Basic architecture of the extension is as follows:
//
//   1. User clicks on icon in Chrome toolbar.
//   2. A popup opens within which we run a tiny bit of
//      code that sends a message to the background page
//      that the icon wsa clicked.
//   3. Background page injects a script into the active
//      tab to convert it.
//   4. Script sends a message to background page with
//      markdown text.
//   5. Background page sends the markdown text to the
//      popup.
//   6. Popup displays.

// Inject conversion script into tab.
function start_converting(tabid) {
  console.debug('start_converting: tabid: ' + tabid);
  chrome.tabs.executeScript(tabid, {file: 'm2m.js'});
}

// Act on messages *FROM* popup and content script.
function main_message_listener(request, sender, sendResponse) {
  if (request.command === 'convert_from_browser_action') {
    chrome.windows.getCurrent( {populate: true}, function(win) {
      var tabs = win.tabs;
      for (var i = 0; i < tabs.length; ++i) {
        var tab = tabs[i];
        if (tab.active) {
          start_converting(tab.id);
        }
      }    
    });
  } else if (request.command === 'm2m_result') {
    // Send the converted text *TO* the popup.
    popup2bg_port.postMessage({command: 'm2m_result',
      markdown_text: request.markdown_text});
  }
  sendResponse(true);
}

// ================== main() ===============================

chrome.runtime.onMessage.addListener(main_message_listener);

// TODO: proper mutexing?
var popup2bg_port = null;

// Accept the connection from the popup so we can send messages
// *TO* it.
chrome.runtime.onConnect.addListener(function(port) {
  console.log('port: ' + port.name);
  if (port.name === 'popup2bg') {
    popup2bg_port = port;
  }
});

