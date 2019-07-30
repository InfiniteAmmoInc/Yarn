import "../scss/index.scss";
import ko from "knockout";
window.ko = ko;

window.$ = window.jQuery = require("jquery");
require("jquery-contextmenu");
require("jquery-mousewheel");

import ace from "ace-builds/src-noconflict/ace";
window.ace = ace;
ace.config.set("basePath", "libs"); //needed to import yarn mode
window.define = ace.define;

require("ace-builds/src-min-noconflict/ext-language_tools");
require("ace-builds/src-min-noconflict/ext-searchbox");
require("./libs/knockout.ace.js");
require("jquery.transit");

require("spectrum-colorpicker");
require("lightweight-emoji-picker/dist/picker.js");

import { FILETYPE } from "./classes/utils";
window.FILETYPE = FILETYPE;
import { App } from "./classes/app.js";
import { data } from "./classes/data";
import { Utils } from "./classes/utils";
import { Node } from "./classes/node";

window.data = data;
window.Utils = Utils;
window.Node = Node;
window.app = new App("Yarn", "0.4.1");
window.app.run();
