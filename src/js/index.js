import '../scss/index.scss';
import ko from 'knockout'
window.ko = ko;
import ace from 'ace-builds/src-min-noconflict/ace'
ace.config.set('basePath', 'libs'); //needed to import yarn mode
window.define = ace.define;

window.$ = window.jQuery = require('jquery');
import 'jquery-contextmenu'
import 'jquery-mousewheel'
import './libs/knockout.ace.js';

ace.require('ace-builds/src-min-noconflict/ext-language_tools') 
ace.require('ace-builds/src-min-noconflict/ext-searchbox')
require('./libs/theme-yarn.js')
require('./libs/mode-yarn.js')
require('jquery.transit')

import 'spectrum-colorpicker'

import {App} from './classes/app.js';
import {data} from './classes/data';
import {Utils} from './classes/utils';
import {Node} from './classes/node';

window.data = data;
window.Utils = Utils;
window.Node = Node;
window.app = new App("Yarn", "0.2.1");
window.app.run();