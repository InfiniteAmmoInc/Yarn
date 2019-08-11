define("ace/mode/yarn", [
  "require",
  "exports",
  "module",
  "ace/lib/oop",
  "ace/mode/text",
  "ace/mode/text_highlight_rules",
  "ace/mode/behaviour"
], function(require, exports, module) {
  "use strict";

  var oop = require("../lib/oop");
  var TextMode = require("./text").Mode;
  var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
  var Behaviour = require("./behaviour").Behaviour;

  var YarnHighlightRules = function() {
    this.$rules = {
      start: [
        {
          token: "comment",
          regex: "[^:]//.+$"
        },
        {
          token: "paren.lcomm",
          regex: "<<",
          next: "comm"
        },
        {
          token: "paren.llink",
          regex: "\\[\\[",
          next: "link"
        }
      ],
      link: [
        {
          token: "string.rlink",
          regex: "\\|\\w*[a-zA-Z0-9 ]+"
        },
        {
          token: "string.llink",
          regex: "[a-zA-Z0-9 ]+"
        },
        {
          token: "paren.rlink",
          regex: "\\]\\]",
          next: "start"
        }
      ],
      comm: [
        {
          token: "string.comm",
          regex: "[A-Za-z0-9 _.,!:\"'/$ ]+"
        },
        {
          token: "paren.rcomm",
          regex: ">>",
          next: "start"
        }
      ]
    };
  };

  var Mode = function() {
    this.HighlightRules = YarnHighlightRules;
    this.$behaviour = new Behaviour();
  };

  oop.inherits(YarnHighlightRules, TextHighlightRules);
  oop.inherits(Mode, TextMode);

  (function() {
    this.type = "text";
    this.getNextLineIndent = function(state, line, tab) {
      return "";
    };
    this.$id = "ace/mode/yarn";
  }.call(Mode.prototype));

  exports.Mode = Mode;

  /// set context menu
  $.contextMenu({
    selector: ".node-editor .form .editor",
    trigger: "right",
    build: function($trigger) {
      var options = {
        items: {}
        // callback: () => { self.editor.focus() }
      };

      // color picker is being called instead
      if (app.getTagBeforeCursor().match(/\[color=#/)) {
        return;
      }
      // There is some text selected
      if (app.editor.getSelectedText().length > 1) {
        options.items = {
          cut: {
            name: "Cut",
            icon: "cut",
            callback: () => {
              app.clipboard = app.editor.getSelectedText();
              app.insertTextAtCursor("");
            }
          },
          copy: {
            name: "Copy",
            icon: "copy",
            callback: () => {
              document.execCommand("copy");
              app.clipboard = app.editor.getSelectedText();
            }
          },
          paste: {
            name: "Paste",
            icon: "paste",
            callback: () => {
              app.insertTextAtCursor(app.clipboard);
            }
          },
          sep1: "---------"
        };
        // add menu option to go to selected node if an option is selected
        if (app.getTagBeforeCursor().match(/\|/g)) {
          options.items["go to node"] = {
            name: "Edit node: " + app.editor.getSelectedText(),
            callback: () => {
              app.openNodeByTitle(app.editor.getSelectedText());
            }
          };
        }
        // suggest word corrections if the selected word is misspelled
        if (app.config.spellcheckEnabled) {
          var suggestedCorrections = app.getSpellCheckSuggestionItems();
          if (suggestedCorrections !== false) {
            options.items.corrections = {
              name: "Correct word",
              items: suggestedCorrections
            };
          }
        }
        // suggest similar words - thesaurus.com sysnonyms and anthonyms
        var suggested = app.getThesaurusItems();
        if (suggested !== false) {
          options.items.corrections = {
            name: "Related words",
            items: suggested
          };
        }
      } else {
        options.items = {
          paste: {
            name: "Paste",
            icon: "paste",
            callback: () => {
              app.insertTextAtCursor(app.clipboard);
            }
          }
        };
      }
      // add option to add path of local image file between img tags
      if (app.getTagBeforeCursor().match(/\[img/g)) {
        options.items["Choose image"] = {
          name: "Choose image",
          callback: () => {
            app.data.insertImageFileName();
          }
        };
      }
      return options;
    }
  });

  /// Enable autocompletion via word guessing
  app.editor.setOptions({
    enableBasicAutocompletion: app.config.autocompleteWordsEnabled,
    enableLiveAutocompletion: app.config.autocompleteWordsEnabled
  });
});
