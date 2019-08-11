const electron = require('electron');
const ipc = require('electron').ipcRenderer;
const remote = electron.remote;

window.ko = require('knockout'); // keep static file too for now, as this is a bit wobbly on higher zoom levels
window.$ = window.jQuery = require('jquery');
require('jquery-mousewheel')($);

window.ace = require('ace-builds/src-min-noconflict/ace');
window.define = ace.define;
require('ace-builds/src-min-noconflict/ext-language_tools');
require('ace-builds/src-min-noconflict/ext-searchbox');
ace.config.set('basePath', 'js/libs'); //needed to import yarn mode

require('spectrum-colorpicker');

require('jquery.transit');
const emojiPicker = require('lightweight-emoji-picker/dist/picker.js');

require('./js/libs/knockout.ace.js');
const { enable_spellcheck, suggest_word_for_misspelled } = require('./js/libs/spellcheck_ace.js'); //borked -todo fix

require('./js/libs/theme-yarn.js');
require('./js/libs/mode-yarn.js');
const { getWordsList } = require('most-common-words-by-language');

const { App } = require('./js/classes/app.js');
const { data } = require('./js/classes/data.js');
const { Utils } = require('./js/classes/utils.js');
const { Node } = require('./js/classes/node.js');

const ipcRenderer = require('electron').ipcRenderer;

var app;
ipcRenderer.on('initiate', function(event, version = '') {
	// wait for an updateReady message
	var updateButton = document.getElementById('updateButton');
	updateButton.style.display = 'none';
	ipcRenderer.on('updateReady', function(event, text) {
		updateButton.innerHTML = 'new version ready!';
		updateButton.style.display = 'block';
	});

	if (!version || version.length == 0) {
		version = '';
	} else {
		// if app is not running in embedded state, disable send data to parent app
		document.getElementById('sendToParentAppMenu').innerHTML = '';
	}
	console.log('Version:' + version);
	app = new App('Yarn', version);
	app.run();
});
