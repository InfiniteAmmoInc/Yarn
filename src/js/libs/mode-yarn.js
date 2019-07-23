const ace = require('ace-builds/src-noconflict/ace')
const oop = ace.require("ace/lib/oop");
const TextMode = ace.require("ace/mode/text").Mode;
const {TextHighlightRules} = ace.require("ace/mode/text_highlight_rules");
const {Behaviour} = ace.require("ace/mode/behaviour");
const langTools = ace.require("ace/ext/language_tools");

const { getWordsList } = require('most-common-words-by-language');

// define("ace/mode/yarn",["require","exports","module","ace/mode/text","ace/mode/text_highlight_rules","ace/mode/behaviour"], function(require, exports, module) {

define("ace/mode/yarn",["require","exports","module"], (require, exports, module) =>{
"use strict";
app.config = {
  nightModeEnabled:false,
  spellcheckEnabled:true,
  showCounter:false,
  autocompleteWordsEnabled:true,
  autocompleteEnabled:true,
  overwrites:{
    makeNewNodesFromLinks:true
  },
  settings:{
    autoSave:-1
  }
}
app.editor = ace.edit("editor");

console.log(TextHighlightRules,Behaviour,TextMode)
// var TextMode = require("./text").Mode;
// var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
// var Behaviour = require("./behaviour").Behaviour;

const YarnHighlightRules = () => {
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
            },
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
                regex: "[A-Za-z0-9 _.,!:\"\'/$ ]+"
            },
            {
                token: "paren.rcomm",
                regex: ">>",
                next: "start"
            }
        ]
    }
};

var Mode = () =>{
    this.HighlightRules = YarnHighlightRules;
    this.$behaviour = new Behaviour();
};

oop.inherits(YarnHighlightRules, TextHighlightRules);
oop.inherits(Mode, TextMode);

(() =>{
    this.type = "text";
    this.getNextLineIndent = function(state, line, tab) {
        return '';
    };
    this.$id = "ace/mode/yarn";
}).call(Mode.prototype);

exports.Mode = Mode;

/// set context menu
$.contextMenu({
    selector: '.node-editor .form .editor',
    trigger: 'right',
    build: ($trigger) =>{
      var options = {
        items: {},
        // callback: () => { self.editor.focus() }
      };

      // color picker is being called instead
      if (app.getTagBeforeCursor().match(/\[color=#/)) {return}
      // There is some text selected
      if (app.editor && app.editor.getSelectedText().length > 1) {
        options.items = {
          "cut": { name: "Cut", icon: "cut", callback: () => {
            // electron.clipboard.writeText(app.editor.getSelectedText());
            app.insertTextAtCursor("")
          }},
          "copy": { name: "Copy", icon: "copy", callback: () => {
            // electron.clipboard.writeText(app.editor.getSelectedText());
          }},
          "paste": { name: "Paste", icon: "paste", callback: () => {
            // app.insertTextAtCursor(electron.clipboard.readText())
          }},
          "sep1": "---------"
        };
        // add menu option to go to selected node if an option is selected
        if (app.getTagBeforeCursor().match(/\|/g)) {
          options.items["go to node"] = { name: "Edit node: " + app.editor.getSelectedText(),
          callback: () => { app.openNodeByTitle(app.editor.getSelectedText()) }
          }
        }
        // suggest word corrections if the selected word is misspelled
        if (app.config.spellcheckEnabled) {
          var suggestedCorrections = app.getSpellCheckSuggestionItems();
          if (suggestedCorrections !== false) {
            options.items.corrections = {name: "Correct word" ,items: suggestedCorrections} 
          }
        }
      } else {
        options.items = {
          "paste": { name: "Paste", icon: "paste", callback: () => {
            // app.insertTextAtCursor(electron.clipboard.readText())
          }},      
        }; 
      }
      // add option to add path of local image file between img tags
      if (app.getTagBeforeCursor().match(/\[img/g)) {
          options.items["Choose image"] = { name: "Choose image",
          callback: () => { 
              if (!data.editingPath()) {
                alert("Please save the yarn file to a location first. \nIt is required for this feature to work...");
                return
              }
              ipc.send("openFile", "addImgTag");
            }
          }
        }
      return options;
    }
  });

/// Enable autocompletion via word guessing
// console.log(app)

app.editor.setOptions({
enableBasicAutocompletion: app.config.autocompleteWordsEnabled,
enableLiveAutocompletion: app.config.autocompleteWordsEnabled
});

console.log(langTools)
// var commonWordList = getWordsList('english');
// var commonWordCompleter = Utils.createAutocompleter(["text"], commonWordList, "Common word");
// langTools.addCompleter(commonWordCompleter);
});
