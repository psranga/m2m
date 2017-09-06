// Javascript code that runs on the Medium page when you click
// the extension icon in Chrome. It's injected by background.js.
// This is called a "content script". Read the Chrome Extension
// Getting Started guide for more info.

// Converts a Medium page into Markdown. Won't work on other sites.
function m2m_convert() {
  var output = "";

  // We rely on the selector returning the elements in the order they appear
  // on the page.
  var elems = document.querySelectorAll('main blockquote, ' +
      'main p, main pre, main hr, ' +
      'main ul, main ul > li, ' +
      'main ol, main ol > li, ' +
      'main h1, main h2, main h3, ' +
      'main h4, main h5, main h6, ' +
      'main figure img, main figure figcaption');

  var bullet_string = '';
  var prev_tag = '';

  for (var i = 0; i < elems.length; ++i) {
    var elem = elems[i];
    var tag = elem.nodeName;

    // Ignore hidden elements. There seems to no way to do this
    // using CSS selectors alone. Hidden elements are used by Medium for
    // thumbnail images that get hidden after the real image loads.
    var elem_styles = getComputedStyle(elem);
    if ((elem_styles.display === "none") ||
        (elem_styles.visibility === "hidden") || (elem_styles.opacity == 0)) {
      continue;
    }

    // Add a line break at:
    //   the end of lists.
    //   after a image that lacks a caption.
    var add_line_break = ((tag !== 'LI') && (prev_tag === 'LI')) ||
                         ((tag !== 'FIGCAPTION') && (prev_tag === 'IMG'));
    if (add_line_break) {
      output += '\n';
    }

    if (tag === 'HR') {
      output += '*****\n\n';
    } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].indexOf(tag) != -1) {
      var heading_level = tag[1];
      output += '#'.repeat(heading_level) + ' ' +
        m2m_convert_inline_styles(elem) + '\n\n';
    } else if (tag === 'PRE') {
      output += extract_pre_content(elem) + '\n';
    } else if (tag === 'P') {
      output += m2m_convert_inline_styles(elem) + '\n\n';
    } else if (tag === 'BLOCKQUOTE') {
      output += '> ' +
        m2m_convert_inline_styles(elem).replace('\n', '\n> ') + '\n\n';
    } else if (tag === 'UL') {
      bullet_string = '*';
    } else if (tag === 'OL') {
      bullet_string = '1. ';
    } else if (tag === 'LI') {
      output += bullet_string + ' ' + m2m_convert_inline_styles(elem) + '\n';
    } else if (tag === 'IMG') {
      console.log('adding image: ' + elem.src);
      output += '![](' + elem.src + ')\n';
    } else if (tag === 'FIGCAPTION') {
      output += '<span class="figcaption_hack">' +
        m2m_convert_inline_styles(elem) + '</span>\n\n';
    }
    prev_tag = tag;
  }
  return output;
}

// Chrome seems to return each line as a TEXT_NODE with a BR
// ELEMENT_NODE as separator. I was expecting it to return
// a single TEXT_NODE with literal newline separators.
// Convert to Markdown code block by prepending each line
// with 4 spaces.
function extract_pre_content(elem) {
  var output = '';
  var children = elem.childNodes;
  for (var i = 0; i < children.length; ++i) {
    var child = children[i];
    var is_text = (child.nodeType === Node.TEXT_NODE);
    if (is_text) {
      // Ignore any other nodes.
      output += ' '.repeat(4) + child.textContent + '\n';
    }
  }
  return output;
}

// Converts a "leaf"-level HTML element like a paragraph
// into Markdown. Converts STRONG to bolding etc.
function m2m_convert_inline_styles(elem) {
  var output = '';
  var children = elem.childNodes;
  for (var i = 0; i < children.length; ++i) {
    var child = children[i];
    var is_text = (child.nodeType === Node.TEXT_NODE);
    var is_elem = (child.nodeType === Node.ELEMENT_NODE);
    if (is_text) {
      output += child.textContent;
    } else if (is_elem) {
      var tag = child.nodeName;
      if (tag === 'SPAN') {
        output += m2m_convert_inline_styles(child)
      } if (tag === 'A') {
        output += '[' + child.textContent + '](' +
            remove_medium_redirection(child.href) + ')';
      } else if (tag === 'STRONG') {
        output += '**' + child.textContent + '**';
      } if (tag === 'EM') {
        output += '*' + child.textContent + '*';
      } else if (tag === 'BR') {
        // Ignore BRs in FIGCAPTION.
        // HACK to use the img + em trick to emulate captions.
        if (elem.nodeName !== 'FIGCAPTION') {
          output += '<br>\n';
        }
      } else if (tag === 'CODE') {
        output += '`' + child.textContent + '`';
      }
    }
  }
  return split_on_whitespace_to_fit_within(output, 80);
}

// TODO: This should maybe compress multiple spaces to one.
// TODO: Don't end output lines with whitespace.
function split_on_whitespace_to_fit_within(s, max_width) {
  var words = s.split(/\s/);
  var output = '';
  var line = '';
  for (var i = 0; i < words.length; ++i) {
    var word = words[i];
    if ((line.length + word.length) < max_width) {
      if (line != '') {
        line += ' ';
      }
      line += word;
    } else {
      if (output != '') {
        output += '\n';
      }
      output += line;
      line = word;
    }
  }
  if (output != '') {
    output += '\n';
  }
  output += line;
  return output;
}

function remove_medium_redirection(s) {
  return unescape(s.replace('https://medium.com/r/?url=', ''));
}

chrome.runtime.sendMessage({
  command: "m2m_result", markdown_text: m2m_convert()
});
