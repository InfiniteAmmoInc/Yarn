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
                regex: "//.+$"
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
                regex: "[A-Za-z0-9 _.,!\"\'/$ ]+"
            },
            {
                token: "paren.rcomm",
                regex: ">>",
                next: "start"
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