function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage( {command: 'convert_from_browser_action'} );
  renderStatus('Converting page to Markdown ...');
});

function message_listener(message) {
  console.log('message_listener: ' + JSON.stringify(message));
  document.getElementById('markdown-result').textContent =
    message.markdown_text;
  renderStatus('');
}

var port = chrome.runtime.connect({name: "popup2bg"});
port.onMessage.addListener(message_listener);
