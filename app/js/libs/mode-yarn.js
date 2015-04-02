define("ace/mode/yarn",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/text_highlight_rules","ace/mode/behaviour"], function(require, exports, module) {
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
                regex: "//.+$",
                next: "singleLineComment"
            },
            {
                token: "string",
                regex: "<<[a-zA-Z0-9_ ]+>>"
            },
            {
                token: "constant.numeric",
                regex: "\[\[[a-zA-Z0-9_ ]+\]\]"
            }
        ]
    }

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
        return '';
    };
    this.$id = "ace/mode/yarn";
}).call(Mode.prototype);

exports.Mode = Mode;
});