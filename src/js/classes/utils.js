export var FILETYPE = {
  JSON: "json",
  XML: "xml",
  TWEE: "twee",
  TWEE2: "tw2",
  UNKNOWN: "none",
  YARNTEXT: "yarn.txt"
};

export var Utils = {
  createAutocompleter: function(
    allowedTokens,
    wordList,
    meta,
    prefixLength = 1
  ) {
    return {
      getCompletions: function(editor, session, pos, prefix, callback) {
        var token = editor.session.getTokenAt(pos.row, pos.column);
        if (
          prefix.length < prefixLength ||
          !allowedTokens.includes(token.type)
        ) {
          callback(null, []);
          return;
        }
        callback(
          null,
          wordList.map(function(word) {
            return {
              caption: word,
              value: word,
              meta: meta
            };
          })
        );
      }
    };
  },

  pushToTop: function(element) {
    var current = element.css("z-index");
    if (current == "auto") current = 0;

    var highZ = parseInt(current);
    var above = true;
    element
      .parent()
      .children()
      .each(function() {
        var otherCurrent = $(this).css("z-index");
        if (otherCurrent == "auto") otherCurrent = 0;
        var other = parseInt(otherCurrent);

        if (this != element[0]) {
          if (other >= highZ) {
            highZ = other;
            above = false;
          }
        }
      });
    if (!above) element.css("z-index", highZ + 1);
  },

  stripHtml: function(html) {
    while (html.indexOf("<") >= 0) html = html.replace("<", "&lt;");
    while (html.indexOf(">") >= 0) html = html.replace(">", "&gt");
    return html;
  },

  // Changes XML to Object
  // todo: Replace with jQuery parseHTML to find values?
  xmlToObject: function(xml) {
    // Create the return object
    var nodes = [];

    xml = xml.childNodes.item(0);
    if (xml.hasChildNodes()) {
      for (var i = 0; i < xml.childNodes.length; i++) {
        var node = xml.childNodes.item(i);
        if (node.hasChildNodes()) {
          var obj = {};
          var found = false;
          for (var j = 0; j < node.childNodes.length; j++) {
            var subitem = node.childNodes.item(j);
            if (subitem.nodeName != "#text") {
              found = true;
              if (subitem.hasChildNodes())
                obj[subitem.nodeName] = subitem.childNodes.item(0).nodeValue;
              else obj[subitem.nodeName] = "";

              if (subitem.attributes.length > 0) {
                obj[subitem.nodeName] = {};
                for (var k = 0; k < subitem.attributes.length; k++) {
                  var attribute = subitem.attributes.item(k);
                  obj[subitem.nodeName][attribute.nodeName] =
                    attribute.nodeValue;
                }
              }
            }
          }
          if (found) nodes.push(obj);
        }
      }
    }
    console.log(nodes);

    return nodes;
  },

  now:
    Date.now ||
    function() {
      return new Date().getTime();
    },

  throttle: function(func, wait, options) {
    var self = this;
    var context, args, result;
    var timeout = null;
    var previous = 0;

    if (!options) options = {};

    var later = function() {
      previous = options.leading === false ? 0 : self.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };

    return function() {
      var now = self.now();

      if (!previous && options.leading === false) previous = now;

      var remaining = wait - (now - previous);

      context = this;
      args = arguments;

      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        previous = now;
        result = func.apply(context, args);

        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }

      return result;
    };
  },
  langs: [
    ["Afrikaans", ["af-ZA"]],
    ["Bahasa Indonesia", ["id-ID"]],
    ["Bahasa Melayu", ["ms-MY"]],
    ["Català", ["ca-ES"]],
    ["Čeština", ["cs-CZ"]],
    ["Deutsch", ["de-DE"]],
    [
      "English",
      ["en-AU", "Australia"],
      ["en-CA", "Canada"],
      ["en-IN", "India"],
      ["en-NZ", "New Zealand"],
      ["en-ZA", "South Africa"],
      ["en-GB", "United Kingdom"],
      ["en-US", "United States"]
    ],
    [
      "Español",
      ["es-AR", "Argentina"],
      ["es-BO", "Bolivia"],
      ["es-CL", "Chile"],
      ["es-CO", "Colombia"],
      ["es-CR", "Costa Rica"],
      ["es-EC", "Ecuador"],
      ["es-SV", "El Salvador"],
      ["es-ES", "España"],
      ["es-US", "Estados Unidos"],
      ["es-GT", "Guatemala"],
      ["es-HN", "Honduras"],
      ["es-MX", "México"],
      ["es-NI", "Nicaragua"],
      ["es-PA", "Panamá"],
      ["es-PY", "Paraguay"],
      ["es-PE", "Perú"],
      ["es-PR", "Puerto Rico"],
      ["es-DO", "República Dominicana"],
      ["es-UY", "Uruguay"],
      ["es-VE", "Venezuela"]
    ],
    ["Euskara", ["eu-ES"]],
    ["Français", ["fr-FR"]],
    ["Galego", ["gl-ES"]],
    ["Hrvatski", ["hr_HR"]],
    ["IsiZulu", ["zu-ZA"]],
    ["Íslenska", ["is-IS"]],
    ["Italiano", ["it-IT", "Italia"], ["it-CH", "Svizzera"]],
    ["Magyar", ["hu-HU"]],
    ["Nederlands", ["nl-NL"]],
    ["Norsk bokmål", ["nb-NO"]],
    ["Polski", ["pl-PL"]],
    ["Português", ["pt-BR", "Brasil"], ["pt-PT", "Portugal"]],
    ["Română", ["ro-RO"]],
    ["Slovenčina", ["sk-SK"]],
    ["Suomi", ["fi-FI"]],
    ["Svenska", ["sv-SE"]],
    ["Türkçe", ["tr-TR"]],
    ["български", ["bg-BG"]],
    ["Pусский", ["ru-RU"]],
    ["Српски", ["sr-RS"]],
    ["한국어", ["ko-KR"]],
    [
      "中文",
      ["cmn-Hans-CN", "普通话 (中国大陆)"],
      ["cmn-Hans-HK", "普通话 (香港)"],
      ["cmn-Hant-TW", "中文 (台灣)"],
      ["yue-Hant-HK", "粵語 (香港)"]
    ],
    ["日本語", ["ja-JP"]],
    ["Lingua latīna", ["la"]]
  ]
};
