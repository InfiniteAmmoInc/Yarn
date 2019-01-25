// You also need to load in nspell.js and jquery.js

// This is a custom made fork that uses nspell instead of typo.js due to major performance issues in the later.
// Please keep this file for now...
const nspell = require('nspell');
// You should configure these classes.
const editor = "editor"; // This should be the id of your editor element.

const dicPath = "dictionaries/en_US/en_US.dic";
const affPath = "dictionaries/en_US/en_US.aff";

// Make red underline for gutter and words.
$("<style type='text/css'>.ace_marker-layer .misspelled { position: absolute; z-index: -2; border-bottom: 1px solid red; margin-bottom: -1px; }</style>").appendTo("head");
$("<style type='text/css'>.misspelled { border-bottom: 1px solid red; margin-bottom: -1px; }</style>").appendTo("head");

// Load the dictionary.
// We have to load the dictionary files sequentially to ensure 
var dictionary = null;
$.get(dicPath, function(data) {
	dicData = data;
}).done(function() {
  $.get(affPath, function(data) {
	  affData = data;
  }).done(function() {
  	console.log("Dictionary loaded");
    dictionary = new nspell(affData, dicData);
  });
});

// Check the spelling of a line, and return [start, end]-pairs for misspelled words.
function misspelled(line) {
	var words = line.split(/[^a-zA-Z\-']/);
	var i = 0;
	var bads = [];
	for (word in words) {
		var x = words[word] + "";
		var checkWord = x.replace(/[^a-zA-Z\-']/g, '');
	  if (!dictionary.correct(checkWord)) {
	    bads[bads.length] = [i, i + words[word].length];
	  }
	  i += words[word].length + 1;
  }
  return bads;
}

var contents_modified = true;

var currently_spellchecking = false;

var markers_present = [];

// Spell check the Ace editor contents.
function spell_check() {
  // Wait for the dictionary to be loaded.
  if (dictionary == null) {
    return;
  }

  if (currently_spellchecking) {
  	return;
  }

  if (!contents_modified) {
  	return;
  }
  currently_spellchecking = true;
  var session = ace.edit(editor).getSession();

	// Clear all markers and gutter
	clear_spellcheck_markers();
	// Populate with markers and gutter
  try {
	  var Range = ace.require('ace/range').Range
	  var lines = session.getDocument().getAllLines();
	  for (var i in lines) {
	    // Check spelling of this line.
	    var misspellings = misspelled(lines[i]);
	    
			// Add markers and gutter markings.
	    // if (misspellings.length > 0) {
	    //   session.addGutterDecoration(i, "misspelled");
	    // }
	    for (var j in misspellings) {
	      var range = new Range(i, misspellings[j][0], i, misspellings[j][1]);
	      markers_present[markers_present.length] = session.addMarker(range, "misspelled", "typo", true);
	    }
	  }
	} finally {
		currently_spellchecking = false;
		contents_modified = false;
	}
}

var spellcheckEnabled = false;
function enable_spellcheck() {
	spellcheckEnabled = true
	ace.edit(editor).getSession().on('change', function(e) {
		if (spellcheckEnabled) {
			contents_modified = true;
			spell_check();
		};
	})
	// needed to trigger update once without input
	contents_modified = true;
	spell_check();
}

function disable_spellcheck() {
	spellcheckEnabled = false
	// Clear the markers
	clear_spellcheck_markers();
}

function clear_spellcheck_markers() {
	var session = ace.edit(editor).getSession();
	for (var i in markers_present) {
		session.removeMarker(markers_present[i]);
	};
	markers_present = [];
	// Clear the gutter
	var lines = session.getDocument().getAllLines();
	for (var i in lines) {
		session.removeGutterDecoration(i, "misspelled");
	};
}

function suggest_word_for_misspelled(misspelledWord) {	
	var array_of_suggestions = dictionary.suggest(misspelledWord);
	if (array_of_suggestions.length === 0) { return false }
	return array_of_suggestions
}
