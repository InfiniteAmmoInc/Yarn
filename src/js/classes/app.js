import {
  enable_spellcheck,
  disable_spellcheck,
  suggest_word_for_misspelled,
  load_dictionary
} from "../libs/spellcheck_ace.js";
import { Node } from "./node";
import { data } from "./data";
import { Utils, FILETYPE } from "./utils";

export var App = function(name, version) {
  var self = this;

  // self
  this.instance = this;
  this.data = data;
  this.name = ko.observable(name);
  this.version = ko.observable(version);
  this.editing = ko.observable(null);
  this.deleting = ko.observable(null);
  this.nodes = ko.observableArray([]);
  this.cachedScale = 1;
  this.canvas;
  this.context;
  this.nodeHistory = [];
  this.nodeFuture = [];
  this.editingHistory = [];
  //this.appleCmdKey = false;
  this.editingSaveHistoryTimeout = null;
  this.dirty = false;
  this.focusedNodeIdx = -1;
  this.zoomSpeed = 0.005;
  this.zoomLimitMin = 0.05;
  this.zoomLimitMax = 1;
  this.transformOrigin = [0, 0];
  this.shifted = false;
  this.isElectron = false;
  this.editor = null;
  this.nodeVisitHistory = [];
  this.mouseX = 0;
  this.mouseY = 0;
  this.clipboard = "";
  this.nodeClipboard = [];
  this.speachInstance = null;
  this.selectedLanguageIndex = 6;
  this.language = null;
  // this.fs = fs;

  this.UPDATE_ARROWS_THROTTLE_MS = 25;

  // this.parser = new ini.Parser();
  this.configFilePath = null;
  this.config = {
    nightModeEnabled: false,
    spellcheckEnabled: true,
    showCounter: false,
    autocompleteWordsEnabled: true,
    autocompleteEnabled: true,
    overwrites: {
      makeNewNodesFromLinks: true
    },
    settings: {
      autoSave: -1
    }
  };

  this.editingPath = ko.observable(null);

  this.nodeSelection = [];

  this.$searchField = $(".search-field");

  this.run = function() {
    var osName = "Unknown OS";
    if (navigator.platform.indexOf("Win") != -1) osName = "Windows";
    if (navigator.platform.indexOf("Mac") != -1) osName = "MacOS";
    if (navigator.platform.indexOf("X11") != -1) osName = "UNIX";
    if (navigator.platform.indexOf("Linux") != -1) osName = "Linux";
    self.isElectron = navigator.userAgent.toLowerCase().includes("electron");

    if (osName == "Windows") self.zoomSpeed = 0.1;

    $("#app").show();
    ko.applyBindings(self, $("#app")[0]);

    self.canvas = $(".arrows")[0];
    self.context = self.canvas.getContext("2d");
    self.newNode().title("Start");

    // search field enter
    self.$searchField.on("keydown", function(e) {
      // enter
      if (e.keyCode == 13) self.searchWarp();
      // escape
      if (e.keyCode == 27) self.clearSearch();
    });

    // Load json app settings from home folder
    // data.tryLoadConfigFile()

    // prevent click bubbling
    ko.bindingHandlers.preventBubble = {
      init: function(element, valueAccessor) {
        var eventName = ko.utils.unwrapObservable(valueAccessor());
        ko.utils.registerEventHandler(element, eventName, function(event) {
          event.cancelBubble = true;
          if (event.stopPropagation) event.stopPropagation();
        });
      }
    };
    ko.bindingHandlers.mousedown = {
      init: function(
        element,
        valueAccessor,
        allBindings,
        viewModel,
        bindingContext
      ) {
        var value = ko.unwrap(valueAccessor());
        $(element).mousedown(function() {
          value();
        });
      }
    };
    // updateArrows
    // setInterval(function() { self.updateArrows(); }, 16);

    // drag node holder around
    (function() {
      var dragging = false;
      var offset = { x: 0, y: 0 };
      var MarqueeOn = false;
      var MarqueeSelection = [];
      var MarqRect = { x1: 0, y1: 0, x2: 0, y2: 0 };
      var MarqueeOffset = [0, 0];
      var midClickHeld = false;

      $(".nodes").on("mousedown", function(e) {
        if (e.button == 1) {
          midClickHeld = true;
        }
        $("#marquee").css({ x: 0, y: 0, width: 0, height: 0 });
        dragging = true;
        offset.x = e.pageX;
        offset.y = e.pageY;
        MarqueeSelection = [];
        MarqRect = { x1: 0, y1: 0, x2: 0, y2: 0 };

        var scale = self.cachedScale;

        MarqueeOffset[0] = 0;
        MarqueeOffset[1] = 0;

        if (!e.altKey && !e.shiftKey) self.deselectAllNodes();
      });

      $(".nodes").on("mousemove", function(e) {
        if (dragging) {
          if (e.altKey || midClickHeld) {
            //prevents jumping straight back to standard dragging
            if (MarqueeOn) {
              MarqueeSelection = [];
              MarqRect = { x1: 0, y1: 0, x2: 0, y2: 0 };
              $("#marquee").css({ x: 0, y: 0, width: 0, height: 0 });
            } else {
              // self.transformOrigin[0] += e.pageX - offset.x;
              // self.transformOrigin[1] += e.pageY - offset.y;

              // self.translate();

              // offset.x = e.pageX;
              // offset.y = e.pageY;

              var nodes = self.nodes();
              for (var i in nodes) {
                nodes[i].x(
                  nodes[i].x() + (e.pageX - offset.x) / self.cachedScale
                );
                nodes[i].y(
                  nodes[i].y() + (e.pageY - offset.y) / self.cachedScale
                );
              }
              offset.x = e.pageX;
              offset.y = e.pageY;
            }
          } else {
            MarqueeOn = true;

            var scale = self.cachedScale;

            if (e.pageX > offset.x && e.pageY < offset.y) {
              MarqRect.x1 = offset.x;
              MarqRect.y1 = e.pageY;
              MarqRect.x2 = e.pageX;
              MarqRect.y2 = offset.y;
            } else if (e.pageX > offset.x && e.pageY > offset.y) {
              MarqRect.x1 = offset.x;
              MarqRect.y1 = offset.y;
              MarqRect.x2 = e.pageX;
              MarqRect.y2 = e.pageY;
            } else if (e.pageX < offset.x && e.pageY < offset.y) {
              MarqRect.x1 = e.pageX;
              MarqRect.y1 = e.pageY;
              MarqRect.x2 = offset.x;
              MarqRect.y2 = offset.y;
            } else {
              MarqRect.x1 = e.pageX;
              MarqRect.y1 = offset.y;
              MarqRect.x2 = offset.x;
              MarqRect.y2 = e.pageY;
            }

            $("#marquee").css({
              x: MarqRect.x1,
              y: MarqRect.y1,
              width: Math.abs(MarqRect.x1 - MarqRect.x2),
              height: Math.abs(MarqRect.y1 - MarqRect.y2)
            });

            //Select nodes which are within the marquee
            // MarqueeSelection is used to prevent it from deselecting already
            // selected nodes and deselecting onces which have been selected
            // by the marquee
            var nodes = self.nodes();
            for (var i in nodes) {
              var index = MarqueeSelection.indexOf(nodes[i]);
              var inMarqueeSelection = index >= 0;

              //test the Marque scaled to the nodes x,y values

              var holder = $(".nodes-holder").offset();
              var marqueeOverNode =
                (MarqRect.x2 - holder.left) / scale > nodes[i].x() &&
                (MarqRect.x1 - holder.left) / scale <
                  nodes[i].x() + nodes[i].tempWidth &&
                (MarqRect.y2 - holder.top) / scale > nodes[i].y() &&
                (MarqRect.y1 - holder.top) / scale <
                  nodes[i].y() + nodes[i].tempHeight;

              if (marqueeOverNode) {
                if (!inMarqueeSelection) {
                  self.addNodeSelected(nodes[i]);
                  MarqueeSelection.push(nodes[i]);
                }
              } else {
                if (inMarqueeSelection) {
                  self.removeNodeSelection(nodes[i]);
                  MarqueeSelection.splice(index, 1);
                }
              }
            }
          }
        }
      });

      $(".nodes").on("mouseup", function(e) {
        // console.log("finished dragging");
        if (e.button == 1) {
          midClickHeld = false;
        }
        dragging = false;

        if (MarqueeOn && MarqueeSelection.length == 0) {
          self.deselectAllNodes();
        }

        MarqueeSelection = [];
        MarqRect = { x1: 0, y1: 0, x2: 0, y2: 0 };
        $("#marquee").css({ x: 0, y: 0, width: 0, height: 0 });
        MarqueeOn = false;
      });
    })();

    // search field
    self.$searchField.on("input", self.updateSearch);
    $(".search-title input").click(self.updateSearch);
    $(".search-body input").click(self.updateSearch);
    $(".search-tags input").click(self.updateSearch);

    // using the event helper
    $(".nodes").mousewheel(function(event) {
      // https://github.com/InfiniteAmmoInc/Yarn/issues/40
      if (event.altKey) {
        return;
      } else {
        event.preventDefault();
      }

      var lastZoom = self.cachedScale,
        scaleChange = event.deltaY * self.zoomSpeed * self.cachedScale;

      if (self.cachedScale + scaleChange > self.zoomLimitMax) {
        self.cachedScale = self.zoomLimitMax;
      } else if (self.cachedScale + scaleChange < self.zoomLimitMin) {
        self.cachedScale = self.zoomLimitMin;
      } else {
        self.cachedScale += scaleChange;
      }

      var mouseX = event.pageX - self.transformOrigin[0],
        mouseY = event.pageY - self.transformOrigin[1],
        newX = mouseX * (self.cachedScale / lastZoom),
        newY = mouseY * (self.cachedScale / lastZoom),
        deltaX = mouseX - newX,
        deltaY = mouseY - newY;

      self.transformOrigin[0] += deltaX;
      self.transformOrigin[1] += deltaY;

      self.translate();
    });

    $(document).on("keyup keydown", function(e) {
      self.shifted = e.shiftKey;
    });

    $(document).contextmenu(function(e) {
      var isAllowedEl =
        $(e.target).hasClass("nodes") || $(e.target).parents(".nodes").length;

      if (e.button == 2 && isAllowedEl) {
        var x = (self.transformOrigin[0] * -1) / self.cachedScale,
          y = (self.transformOrigin[1] * -1) / self.cachedScale;

        x += event.pageX / self.cachedScale;
        y += event.pageY / self.cachedScale;

        self.newNodeAt(x, y);
      }

      return !isAllowedEl;
    });

    $(document).on("keydown", function(e) {
      //global ctrl+z
      if ((e.metaKey || e.ctrlKey) && !self.editing()) {
        switch (e.keyCode) {
          case 90:
            self.historyDirection("undo");
            break;
          case 89:
            self.historyDirection("redo");
            break;
          case 68:
            self.deselectAllNodes();
        }
      }
    });

    $(document).on("keydown", function(e) {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey) {
          switch (e.keyCode) {
            case 83:
              data.trySave(FILETYPE.JSON);
              self.fileKeyPressed = true;
              break;
            case 65:
              data.tryAppend();
              self.fileKeyPressed = true;
              break;
          }
        } else if (e.altKey) {
          switch (e.keyCode) {
            case 83:
              data.trySave(FILETYPE.YARNTEXT);
              self.fileKeyPressed = true;
              break;
          }
        } else {
          switch (e.keyCode) {
            case 83:
              if (data.editingPath() != null) {
                data.trySaveCurrent();
              } else {
                data.trySave(FILETYPE.JSON);
              }
              self.fileKeyPressed = true;
              break;
            case 79:
              data.tryOpenFile();
              self.fileKeyPressed = true;
              break;
          }
        }
      }
    });

    $(document).on("keydown", function(e) {
      // clipboard manual saving to get around browser security bs
      if (self.editing()) {
        // ctrl + c
        if ((e.metaKey || e.ctrlKey) && e.keyCode == 67) {
          self.clipboard = self.editor.getSelectedText();
        }
        // ctrl + x
        else if ((e.metaKey || e.ctrlKey) && e.keyCode == 88) {
          app.clipboard = app.editor.getSelectedText();
          app.insertTextAtCursor("");
        }
      } else {
        // ctrl + c NODES
        if ((e.metaKey || e.ctrlKey) && e.keyCode == 67) {
          self.nodeClipboard = app.cloneNodeArray(self.getSelectedNodes());
        }
        // ctrl + x NODES
        else if ((e.metaKey || e.ctrlKey) && e.keyCode == 88) {
          self.nodeClipboard = app.cloneNodeArray(self.getSelectedNodes());
          self.deleteSelectedNodes();
        }
      }
    });
    $(document).on("keydown", function(e) {
      if (
        self.editing() ||
        self.$searchField.is(":focus") ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      var scale = self.cachedScale || 1,
        movement = scale * 500;

      if (e.shiftKey) {
        movement = scale * 100;
      }

      if (e.keyCode === 65 || e.keyCode === 37) {
        // a or left arrow
        self.transformOrigin[0] += movement;
      } else if (e.keyCode === 68 || e.keyCode === 39) {
        // d or right arrow
        self.transformOrigin[0] -= movement;
      } else if (e.keyCode === 87 || e.keyCode === 38) {
        // w or up arrow
        self.transformOrigin[1] += movement;
      } else if (e.keyCode === 83 || e.keyCode === 40) {
        // w or down arrow
        self.transformOrigin[1] -= movement;
      }

      self.translate(100);
    });

    $(document).on("keyup", function(e) {
      if ((e.metaKey || e.ctrlKey) && e.keyCode == 86) {
        // ctrl + v NODES
        if (!self.editing() && self.nodeClipboard.length) {
          self.deselectAllNodes();
          self.nodeClipboard.forEach(function(node) {
            self.nodes.push(node);
            self.addNodeSelected(node);
            self.recordNodeAction("created", node);
          });
          self.updateNodeLinks();
        }
      }
      // console.log(e.keyCode+"-"+e.key)
      if (e.keyCode === 46 || e.key === "Delete") {
        // Delete selected
        if (self.editing() === null) {
          self.deleteSelectedNodes();
        }
      }
      if (e.keyCode === 31 || e.key === "Enter") {
        // Open active node, if already active, close it

        if (self.editing() === null) {
          var activeNode = self.nodes()[self.focusedNodeIdx];
          if (activeNode !== undefined) {
            self.editNode(activeNode);
          } else {
            self.editNode(self.nodes()[0]);
          }
        } else if (e.ctrlKey && e.altKey) {
          //ctrl+alt+ enter closes/saves an open node
          self.saveNode();
        }
      }
      // Spacebar toggle between nodes
      if (e.keyCode === 32) {
        if (self.editing() !== null && !e.altKey) {
          return; // alt+spacebar to toggle between open nodes
        }
        var selectedNodes = self.getSelectedNodes();
        var nodes = selectedNodes.length > 0 ? selectedNodes : self.nodes();
        var isNodeSelected = selectedNodes.length > 0;
        if (
          self.focusedNodeIdx > -1 &&
          nodes.length > self.focusedNodeIdx &&
          (self.transformOrigin[0] !=
            -nodes[self.focusedNodeIdx].x() +
              $(window).width() / 2 -
              $(nodes[self.focusedNodeIdx].element).width() / 2 ||
            self.transformOrigin[1] !=
              -nodes[self.focusedNodeIdx].y() +
                $(window).height() / 2 -
                $(nodes[self.focusedNodeIdx].element).height() / 2)
        ) {
          self.focusedNodeIdx = -1;
        }

        if (++self.focusedNodeIdx >= nodes.length) {
          self.focusedNodeIdx = 0;
        }
        self.cachedScale = 1;
        if (isNodeSelected) {
          self.warpToSelectedNodeIdx(self.focusedNodeIdx);
        } else {
          self.warpToNodeIdx(self.focusedNodeIdx);
        }

        if (self.editing() !== null) {
          self.editNode(self.nodes()[self.focusedNodeIdx]);
        }
      }
    });

    $(window).on("resize", self.updateArrowsThrottled);

    $(document).on("keyup keydown mousedown mouseup", function(e) {
      if (self.editing() != null) {
        self.updateEditorStats();
      }
    });

    this.guessPopUpHelper = function() {
      if (self.getTagBeforeCursor().match(/\[color=#/)) {
        self.insertColorCode();
        // return
      } else if (self.getTagBeforeCursor().match(/\[img\]/)) {
        // console.log("IMAGE");
      }
    };

    this.insertBBcodeTags = function(tag) {
      var tagClose = "[/" + tag.replace(/[\"#=]/gi, "") + "]";
      if (tag === "cmd") {
        tag = "<<";
        tagClose = ">>";
      } else if (tag === "opt") {
        tag = "[[";
        tagClose = "|]]";
      } else {
        tag = "[" + tag + "]";
      }

      var selectRange = JSON.parse(
        JSON.stringify(self.editor.selection.getRange())
      );
      self.editor.session.insert(selectRange.start, tag);
      self.editor.session.insert(
        {
          column: selectRange.end.column + tag.length,
          row: selectRange.end.row
        },
        tagClose
      );

      if (tag === "[color=#]") {
        if (self.editor.getSelectedText().length === 0) {
          self.moveEditCursor(-9);
          self.insertColorCode();
          return;
        }
        self.editor.selection.setRange({
          start: {
            row: self.editor.selection.getRange().start.row,
            column: self.editor.selection.getRange().start.column - 1
          },
          end: {
            row: self.editor.selection.getRange().start.row,
            column: self.editor.selection.getRange().start.column - 1
          }
        });
        self.insertColorCode();
      } else if (self.editor.getSelectedText().length === 0) {
        self.moveEditCursor(-tagClose.length);
      } else {
        self.editor.selection.setRange({
          start: self.editor.selection.getRange().start,
          end: {
            row: self.editor.selection.getRange().end.row,
            column:
              self.editor.selection.getRange().end.column - tagClose.length
          }
        });
      }
      self.editor.focus();
    };

    this.insertEmoji = function() {
      this.emPicker.toggle();
      self.togglePreviewMode(true);
      $("#emojiPicker-container").css({
        top: self.mouseY - 125,
        left: self.mouseX - 200
      });
      $("#emojiPicker-container").show();
    };

    this.updateCountry = function() {
      var select_language = document.getElementById("select_language");
      self.selectedLanguageIndex = select_language.selectedIndex;

      self.language = Utils.langs[select_language.selectedIndex][1][0];
      spoken.recognition.lang = self.language;
      load_dictionary(self.language.split("-")[0]);
    };

    this.speakText = function() {
      const selectedText = self.editor.getSelectedText();
      const say = selectedText
        ? selectedText
        : self.editor.getSession().getValue();

      spoken.voices().then(countries => {
        const lookUp = self.language.split("-")[0];
        const voices = countries.filter(v => !v.lang.indexOf(lookUp));

        if (voices.length) {
          console.log("Loaded voice", voices[0]);
          spoken.say(say, voices[0]);
        } else {
          spoken.say(say);
        }
      });
    };

    this.hearText = function() {
      const available = spoken.listen.available();
      if (!available) {
        alert("Speech recognition not avaiilable!");
        return;
      }

      // spoken.listen.on.partial(ts => ($("#speakTextBtn").title = ts));
      spoken.listen.on.partial(ts => {
        console.log(ts);
        document.getElementById("speakTextBtnBubble").title = `🗣️ ${ts} 🦜`;
      });

      spoken
        .listen()
        .then(transcript => {
          self.insertTextAtCursor(transcript + " ");
          document.getElementById("speakTextBtnBubble").title = "Transcribe";
        })
        .catch(error => console.warn(error.message));
    };

    $(document).on("mousemove", function(e) {
      self.mouseX = e.pageX;
      self.mouseY = e.pageY;
    });

    this.insertColorCode = function() {
      if ($("#colorPicker-container").is(":visible")) {
        return;
      }
      // http://bgrins.github.io/spectrum/
      $("#colorPicker").spectrum("set", self.editor.getSelectedText());
      $("#colorPicker").spectrum("toggle");
      $("#colorPicker-container").css({
        top: self.mouseY - 50,
        left: self.mouseX - 70
      });
      $("#colorPicker-container").show();
      $("#colorPicker").on("dragstop.spectrum", function(e, color) {
        self.applyPickerColorEditor(color);
      });

      self.togglePreviewMode(true);
    };

    this.applyPickerColorEditor = function(color) {
      var selectRange = JSON.parse(
        JSON.stringify(self.editor.selection.getRange())
      );
      self.editor.selection.setRange(selectRange);
      var colorCode = color.toHexString().replace("#", "");
      self.editor.session.replace(selectRange, colorCode);
      self.editor.selection.setRange({
        start: self.editor.getCursorPosition(),
        end: {
          row: self.editor.getCursorPosition().row,
          column: self.editor.getCursorPosition().column - colorCode.length
        }
      });
      self.togglePreviewMode(true);
    };

    document.addEventListener(
      "contextmenu",
      function(evt) {
        if (self.editing()) evt.preventDefault();
      },
      false
    );
    $(document).on("mouseup", function(e) {
      if (self.editing() && e.button === 2) {
        self.guessPopUpHelper();
      }
    });

    // apple command key
    //$(window).on('keydown', function(e) { if (e.keyCode == 91 || e.keyCode == 93) { self.appleCmdKey = true; } });
    //$(window).on('keyup', function(e) { if (e.keyCode == 91 || e.keyCode == 93) { self.appleCmdKey = false; } });

    // Handle file dropping
    document.ondragover = document.ondrop = e => {
      e.preventDefault();
    };
    document.body.ondrop = e => {
      e.preventDefault();
      var i;
      for (i = 0; i < e.dataTransfer.files.length; i++) {
        data.appendFile(
          e.dataTransfer.files[i],
          e.dataTransfer.files[i].name,
          false
        );
      }
    };
    // Callback for embedding in other webapps
    var event = new CustomEvent("yarnReady");
    event.document = document;
    event.data = data;
    event.app = this;
    window.parent.dispatchEvent(event);
  };

  this.getNodesConnectedTo = function(toNode) {
    var connectedNodes = [];
    var nodes = self.nodes();
    for (var i in nodes) {
      if (nodes[i] != toNode && nodes[i].isConnectedTo(toNode, true)) {
        var hasNode = false;
        for (var j in connectedNodes) {
          if (connectedNodes[j] == nodes[i]) {
            hasNode = true;
            break;
          }
        }
        if (!hasNode) connectedNodes.push(nodes[i]);
      }
    }
    return connectedNodes;
  };

  this.mouseUpOnNodeNotMoved = function() {
    self.deselectAllNodes();
  };

  this.matchConnectedColorID = function(fromNode) {
    var nodes = self.getNodesConnectedTo(fromNode);
    for (var i in nodes) nodes[i].colorID(fromNode.colorID());
  };

  this.quit = function() {
    if (self.isElectron) {
      // remote.app.quit();
    }
  };

  this.validateTitle = function() {
    var enteredValue = document.getElementById("editorTitle").value;
    if (
      self.getOtherNodeTitles().includes(enteredValue) ||
      self.titleExistsTwice(enteredValue)
    ) {
      $("#editorTitle").css({ color: "red" });
      $("#editorTitle").attr("title", "Another node has the same title");
    } else {
      $("#editorTitle").css({ color: "#666" });
      $("#editorTitle").attr("title", "");
    }
  };

  this.refreshWindowTitle = function(editingPath) {
    let title = "Yarn - [" + editingPath + "] ";
    if (!self.isElectron) {
      document.title = title;
    } else {
      // self.gui.setTitle(title);
    }
  };

  this.recordNodeAction = function(action, node) {
    //we can't go forward in 'time' when
    //new actions have been made
    if (self.nodeFuture.length > 0) {
      for (var i = 0; i < self.nodeFuture.length; i++) {
        var future = self.nodeFuture.pop();
        delete future.node;
      }

      delete self.nodeFuture;
      self.nodeFuture = [];
    }

    var historyItem = {
      action: action,
      node: node,
      lastX: node.x(),
      lastY: node.y()
    };

    if (action == "removed") {
      historyItem.lastY += 80;
    }

    self.nodeHistory.push(historyItem);
  };

  this.historyDirection = function(direction) {
    function removeNode(node) {
      var index = self.nodes.indexOf(node);
      if (index >= 0) {
        self.nodes.splice(index, 1);
      }
      self.updateNodeLinks();
    }

    var historyItem = null;

    if (direction == "undo") historyItem = self.nodeHistory.pop();
    else historyItem = self.nodeFuture.pop();

    if (!historyItem) return;

    var action = historyItem.action;
    var node = historyItem.node;

    if (direction == "undo") {
      //undo actions
      if (action == "created") {
        historyItem.lastX = node.x();
        historyItem.lastY = node.y();
        removeNode(node);
      } else if (action == "removed") {
        self.recreateNode(node, historyItem.lastX, historyItem.lastY);
      }

      self.nodeFuture.push(historyItem);
    } //redo undone actions
    else {
      if (action == "created") {
        self.recreateNode(node, historyItem.lastX, historyItem.lastY);
      } else if (action == "removed") {
        removeNode(node);
      }

      self.nodeHistory.push(historyItem);
    }
  };

  this.recreateNode = function(node, x, y) {
    self.nodes.push(node);
    node.moveTo(x, y);
    self.updateNodeLinks();
  };

  this.setSelectedColors = function(node) {
    var nodes = self.getSelectedNodes();
    nodes.splice(nodes.indexOf(node), 1);

    for (var i in nodes) nodes[i].colorID(node.colorID());
  };

  this.getSelectedNodes = function() {
    var selectedNode = [];

    for (var i in self.nodeSelection) {
      selectedNode.push(self.nodeSelection[i]);
    }

    return selectedNode;
  };

  this.deselectAllNodes = function() {
    var nodes = self.nodes();
    for (var i in nodes) {
      self.removeNodeSelection(nodes[i]);
    }
  };

  this.addNodeSelected = function(node) {
    var index = self.nodeSelection.indexOf(node);
    if (index < 0) {
      self.nodeSelection.push(node);
      node.setSelected(true);
    }
  };

  this.removeNodeSelection = function(node) {
    var index = self.nodeSelection.indexOf(node);
    if (index >= 0) {
      self.nodeSelection.splice(index, 1);
      node.setSelected(false);
    }
  };

  this.deleteSelectedNodes = function() {
    var nodes = self.getSelectedNodes();
    for (var i in nodes) {
      self.removeNodeSelection(nodes[i]);
      nodes[i].remove();
    }
  };

  this.cloneNodeArray = function(nodeArray) {
    return nodeArray.map(function(oldNode) {
      var node = new Node();
      node.title(oldNode.title());
      node.body(oldNode.body());
      node.tags(oldNode.tags());
      node.colorID(oldNode.colorID());
      node.createX = oldNode.x() + 10;
      node.createY = oldNode.y() + 10;
      return node;
    });
  };

  this.newNode = function(updateArrows) {
    var node = new Node();
    self.nodes.push(node);
    if (updateArrows == undefined || updateArrows == true)
      self.updateNodeLinks();

    self.recordNodeAction("created", node);

    return node;
  };

  this.newNodeAt = function(x, y) {
    var node = new Node();

    self.nodes.push(node);

    node.x(x - 100);
    node.y(y - 100);
    self.updateNodeLinks();
    self.recordNodeAction("created", node);

    return node;
  };

  this.removeNode = function(node) {
    if (node.selected) {
      self.deleteSelectedNodes();
    }
    var index = self.nodes.indexOf(node);
    if (index >= 0) {
      self.recordNodeAction("removed", node);
      self.nodes.splice(index, 1);
    }
    self.updateNodeLinks();
  };

  this.searchTextInEditor = function(show = true) {
    if (show) {
      self.editor.execCommand("find");
    } else if (self.editor.searchBox) {
      self.editor.searchBox.hide();
    }
  };

  this.showRandomQuote = function() {
    $.ajax({
      url: "https://api.forismatic.com/api/1.0/?",
      dataType: "jsonp",
      data: "method=getQuote&format=jsonp&lang=en&jsonp=?",
      success: function(response) {
        alert(response.quoteText + "\n\n-" + response.quoteAuthor);
      }
    });
  };

  this.editNode = function(node) {
    if (node.active()) {
      // console.log(node)
      self.editing(node);

      $(".node-editor")
        .css({ opacity: 0 })
        .transition({ opacity: 1 }, 250);
      $(".node-editor .form")
        .css({ y: "-100" })
        .transition({ y: "0" }, 250);
      self.editor = ace.edit("editor");

      var autoCompleteButton = document.getElementById("toglAutocomplete");
      autoCompleteButton.checked = self.config.autocompleteEnabled;
      var autoCompleteWordsButton = document.getElementById(
        "toglAutocompleteWords"
      );
      autoCompleteWordsButton.checked = self.config.autocompleteWordsEnabled;
      var spellCheckButton = document.getElementById("toglSpellCheck");
      spellCheckButton.checked = self.config.spellcheckEnabled;
      var nightModeButton = document.getElementById("toglNightMode");
      nightModeButton.checked = self.config.nightModeEnabled;
      self.toggleNightMode();
      var showCounterButton = document.getElementById("toglShowCounter");
      showCounterButton.checked = self.config.showCounter;
      self.toggleShowCounter();
      self.toggleWordCompletion();

      //// warn if titlealready exists
      self.validateTitle();
      /// set color picker
      $("#colorPicker").spectrum({
        flat: true,
        showButtons: false,
        showInput: true,
        showPalette: true,
        preferredFormat: "hex",
        palette: [
          ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
          ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
          [
            "#f4cccc",
            "#fce5cd",
            "#fff2cc",
            "#d9ead3",
            "#d0e0e3",
            "#cfe2f3",
            "#d9d2e9",
            "#ead1dc"
          ]
        ],
        change: function(color) {
          if ($("#colorPicker-container").is(":visible")) {
            app.applyPickerColorEditor(color);
            $("#colorPicker").spectrum("hide");
            $("#colorPicker-container").hide();
            app.moveEditCursor(color.toHexString().length);
            app.togglePreviewMode(false);
          }
        },
        clickoutFiresChange: true
      });

      /// Enable autocompletion for node links (borked atm)
      var langTools = ace.require("ace/ext/language_tools");
      var nodeLinksCompleter = Utils.createAutocompleter(
        ["string.llink", "string.rlink"],
        self.getOtherNodeTitles(),
        "Node Link"
      );
      langTools.addCompleter(nodeLinksCompleter);

      if (!self.nodeVisitHistory.includes(node.title())) {
        self.nodeVisitHistory.push(node.title());
      }

      /// init emoji picker
      this.emPicker = new EmojiPicker(
        document.getElementById("emojiPickerDom"),
        emoji => {
          self.insertTextAtCursor(emoji.char);
          this.emPicker.toggle();
          self.togglePreviewMode(false);
        }
      );

      /// init language selector
      var select_language = document.getElementById("select_language");
      for (var i = 0; i < Utils.langs.length; i++) {
        var option = document.createElement("option");
        option.text = Utils.langs[i][0];
        select_language.add(option);
      }

      select_language.selectedIndex = self.selectedLanguageIndex;
      if (!self.language) {
        self.language = "en-US";
        self.updateCountry();
      }

      self.toggleSpellCheck();
      self.updateEditorStats();
    }
  };

  this.chooseRelativePathImage = function(imagePath) {
    self.insertTextAtCursor(imagePath);
  };

  this.openNodeByTitle = function(nodeTitle) {
    self.makeNodeWithName(nodeTitle);
    app.nodes().forEach(node => {
      if (node.title() === nodeTitle.trim()) {
        self.editNode(node);
      }
    });
  };

  this.openLastEditedNode = function() {
    if (self.nodeVisitHistory.length < 2) {
      self.saveNode();
      return;
    } else {
      self.nodeVisitHistory.pop();
      self.openNodeByTitle(self.nodeVisitHistory.pop());
    }
  };

  this.getSpellCheckSuggestionItems = function() {
    var wordSuggestions = suggest_word_for_misspelled(
      self.editor.getSelectedText()
    );
    if (wordSuggestions) {
      var suggestionObject = {};
      wordSuggestions.forEach(suggestion => {
        suggestionObject[suggestion] = {
          name: suggestion,
          icon: "edit",
          callback: key => {
            self.insertTextAtCursor(key);
          }
        };
      });
      return suggestionObject;
    } else {
      return false;
    }
  };

  this.getThesaurusItems = function() {
    var synonyms = require("synonyms");
    var words = synonyms(self.editor.getSelectedText());
    if (!words) return false;
    var wordSuggestions = [];
    Object.keys(words).forEach(function(type) {
      words[type].forEach(function(word) {
        if (!wordSuggestions.includes(word) && word !== type) {
          wordSuggestions.push(word);
        }
      });
    });
    if (wordSuggestions.length > 0) {
      var suggestionObject = {};
      wordSuggestions.forEach(suggestion => {
        suggestionObject[suggestion] = {
          name: suggestion,
          icon: "edit",
          callback: key => {
            self.insertTextAtCursor(key);
          }
        };
      });
      return suggestionObject;
    } else {
      return false;
    }
  };

  this.toggleSpellCheck = function() {
    var spellCheckButton = document.getElementById("toglSpellCheck");
    self.config.spellcheckEnabled = spellCheckButton.checked;
    if (spellCheckButton.checked) {
      enable_spellcheck();
    } else {
      disable_spellcheck();
    }
  };

  this.toggleNightMode = function() {
    var nightModeButton = document.getElementById("toglNightMode");
    self.config.nightModeEnabled = nightModeButton.checked;
    var cssOverwrite = {};
    if (self.config.nightModeEnabled) {
      cssOverwrite = { filter: "invert(100%)" };
    } else {
      cssOverwrite = { filter: "invert(0%)" };
    }
    $("#app").css(cssOverwrite);
    $("#app-bg").css(cssOverwrite);
    $(".tooltip").css(cssOverwrite);
    $(".node .body").css(cssOverwrite);
    $(".node-editor .form .editor-container .editor-preview").css(cssOverwrite);
  };

  this.toggleShowCounter = function() {
    var showCounterButton = document.getElementById("toglShowCounter");
    self.config.showCounter = showCounterButton.checked;
    if (self.config.showCounter) {
      $(".node-editor .form .bbcode-toolbar .editor-counter").css({
        display: "initial"
      });
    } else {
      $(".node-editor .form .bbcode-toolbar .editor-counter").css({
        display: "none"
      });
    }
  };

  this.toggleWordCompletion = function() {
    var wordCompletionButton = document.getElementById("toglAutocompleteWords");
    self.config.autocompleteWordsEnabled = wordCompletionButton.checked;
    self.editor.setOptions({
      enableBasicAutocompletion: self.config.autocompleteWordsEnabled,
      enableLiveAutocompletion: self.config.autocompleteWordsEnabled
    });
  };

  this.togglePreviewMode = function(previewModeOverwrite) {
    var editor = $(".editor")[0];
    var editorPreviewer = document.getElementById("editor-preview");
    if (previewModeOverwrite) {
      //preview mode
      editor.style.visibility = "hidden";
      editorPreviewer.style.visibility = "visible";
      editorPreviewer.innerHTML = self
        .editing()
        .textToHtml(self.editing().body(), true);
      editorPreviewer.scrollTop = self.editor.renderer.scrollTop;
    } else {
      //edit mode
      self.editor.session.setScrollTop(editorPreviewer.scrollTop);
      editorPreviewer.innerHTML = "";
      editorPreviewer.style.visibility = "hidden";
      editor.style.visibility = "visible";
      self.editor.focus();
      //close any pop up helpers tooltip class
      if ($("#colorPicker-container").is(":visible")) {
        $("#colorPicker-container").hide();
      }
      if ($("#emojiPicker-container").is(":visible")) {
        $("#emojiPicker-container").hide();
      }
    }
  };

  this.trim = function(x) {
    return x.replace(/^\s+|\s+$/gm, "");
  };

  this.appendText = function(textToAppend) {
    self.editing().body(self.editing().body() + textToAppend);
    // scroll to end of line
    var row = self.editor.session.getLength() - 1;
    var column = self.editor.session.getLine(row).length;
    self.editor.gotoLine(row + 1, column);
  };

  this.moveEditCursor = function(offset) {
    var position = self.editor.getCursorPosition();
    self.editor.gotoLine(position.row + 1, position.column + offset);
    self.editor.focus();
  };

  this.insertTextAtCursor = function(textToInsert) {
    self.editor.session.replace(self.editor.selection.getRange(), "");
    self.editor.session.insert(self.editor.getCursorPosition(), textToInsert);
    self.editor.focus();
  };

  this.getTagBeforeCursor = function() {
    var selectionRange = self.editor.getSelectionRange();
    var currline = selectionRange.start.row;
    var cursorPosition = selectionRange.end.column;
    var curLineText = self.editor.session.getLine(currline);

    var textBeforeCursor = curLineText.substring(0, cursorPosition);
    if (!textBeforeCursor) {
      return;
    }
    var tagBeforeCursor =
      textBeforeCursor.lastIndexOf("[") !== -1
        ? textBeforeCursor.substring(
            textBeforeCursor.lastIndexOf("["),
            textBeforeCursor.length
          )
        : "";

    // if (tagBeforeCursor.includes(']')) { tagBeforeCursor = "" }

    if (
      textBeforeCursor.substring(
        textBeforeCursor.length - 2,
        textBeforeCursor.length
      ) === "[["
    ) {
      tagBeforeCursor = "[[";
    }
    if (
      textBeforeCursor.substring(
        textBeforeCursor.length - 2,
        textBeforeCursor.length
      ) === "<<"
    ) {
      tagBeforeCursor = "<<";
    }

    return tagBeforeCursor;
  };

  // close tag autocompletion
  $(document).on("keyup", function(e) {
    var autoCompleteButton = document.getElementById("toglAutocomplete");
    if (self.editing() && autoCompleteButton.checked) {
      var key = e.keyCode || e.charCode || e.which;
      if (key === 37 || key === 38 || key === 39 || key === 40) {
        return;
      } // Dont trigger if moved cursor using arrow keys
      if (key === 8 || key === 46 || key === 17 || key === 90) {
        return;
      } // Dont trigger if backspace or ctrl+z pressed

      switch (self.getTagBeforeCursor()) {
        case "[[":
          self.insertTextAtCursor(" answer: | ]] ");
          self.moveEditCursor(-4);
          break;
        case "<<":
          self.insertTextAtCursor(" >> ");
          self.moveEditCursor(-3);
          break;
        case "[colo":
          self.insertTextAtCursor("r=#][/color] ");
          self.moveEditCursor(-10);
          self.insertColorCode();
          break;
        case "[b":
          self.insertTextAtCursor("][/b] ");
          self.moveEditCursor(-5);
          break;
        case "[i]":
          self.insertTextAtCursor("[/i] ");
          self.moveEditCursor(-5);
          break;
        case "[img":
          self.insertTextAtCursor("][/img] ");
          self.moveEditCursor(-7);
          break;
        case "[u":
          self.insertTextAtCursor("][/u] ");
          self.moveEditCursor(-5);
          break;
      }
    }
  });

  this.testRunFrom = function(startTestNode) {
    ipc.send(
      "testYarnStoryFrom",
      JSON.parse(data.getSaveData(FILETYPE.JSON)),
      startTestNode,
      data.editingFileFolder()
    );
  };

  this.openNodeListMenu = function(action) {
    var helperLinkSearch = document.getElementById(action + "HelperMenuFilter")
      .value;
    var rootMenu = document.getElementById(action + "HelperMenu");
    rootMenu.innerHTML = "";

    app.nodes().forEach((node, i) => {
      if (
        node
          .title()
          .toLowerCase()
          .indexOf(helperLinkSearch) >= 0 ||
        helperLinkSearch.length == 0
      ) {
        var p = document.createElement("span");
        p.innerHTML = node.title();
        p.setAttribute("class", "item");
        var pColor = node.titleColorValues[app.nodes()[i].colorID()];
        p.setAttribute("style", "background:" + pColor + ";");

        if (action == "link") {
          if (node.title() !== self.editing().title()) {
            p.setAttribute(
              "onclick",
              "app.insertTextAtCursor(' [[Answer:" +
                node.title() +
                "|" +
                node.title() +
                "]]')"
            );
            rootMenu.appendChild(p);
          }
        } else if (action == "open") {
          if (
            node
              .title()
              .toLowerCase()
              .indexOf(helperLinkSearch) >= 0 ||
            helperLinkSearch.length == 0
          ) {
            p.setAttribute("onclick", `app.openNodeByTitle("${node.title()}")`);
            rootMenu.appendChild(p);
          }
        }
      }
    });
  };

  this.saveNode = function() {
    if (self.editing() != null) {
      self.makeNewNodesFromLinks();
      self.updateNodeLinks();
      self.editing().title(self.trim(self.editing().title()));
      $(".node-editor").transition({ opacity: 0 }, 250);
      $(".node-editor .form").transition({ y: "-100" }, 250, function(e) {
        self.editing(null);
      });

      var autoCompleteButton = document.getElementById("toglAutocomplete");
      self.config.autocompleteEnabled = autoCompleteButton.checked;

      var autoCompleteWordsButton = document.getElementById(
        "toglAutocompleteWords"
      );
      self.config.autocompleteWordsEnabled = autoCompleteWordsButton.checked;

      setTimeout(self.updateSearch, 600);
    }
  };

  this.updateSearch = function() {
    var search = self.$searchField.val().toLowerCase();
    var title = $(".search-title input").is(":checked");
    var body = $(".search-body input").is(":checked");
    var tags = $(".search-tags input").is(":checked");

    var on = 1;
    var off = 0.25;

    for (var i = 0; i < app.nodes().length; i++) {
      var node = app.nodes()[i];
      var element = $(node.element);

      if (search.length > 0 && (title || body || tags)) {
        var matchTitle =
          title &&
          node
            .title()
            .toLowerCase()
            .indexOf(search) >= 0;
        var matchBody =
          body &&
          node
            .body()
            .toLowerCase()
            .indexOf(search) >= 0;
        var matchTags =
          tags &&
          node
            .tags()
            .toLowerCase()
            .indexOf(search) >= 0;

        if (matchTitle || matchBody || matchTags) {
          node.active(true);
          element.clearQueue();
          element.transition({ opacity: on }, 500);
        } else {
          node.active(false);
          element.clearQueue();
          element.transition({ opacity: off }, 500);
        }
      } else {
        node.active(true);
        element.clearQueue();
        element.transition({ opacity: on }, 500);
      }
    }
  };

  this.updateNodeLinks = function() {
    for (var i in self.nodes()) self.nodes()[i].updateLinks();
  };

  this.makeNewNodesFromLinks = function() {
    if (
      this.config &&
      this.config.overwrites &&
      !this.config.overwrites.makeNewNodesFromLinks
    ) {
      console.info(
        "Autocreation of new nodes from links is disabled in:\n" +
          this.configFilePath
      );
      return;
    }
    var nodeLinks = self.editing().getLinksInNode();
    if (nodeLinks == undefined) {
      return;
    }
    for (var i = 0; i < nodeLinks.length; i++) {
      // Create new Nodes from Node Links
      const newNodeName = nodeLinks[i].trim();
      var newNodeOffset = 220 * (i + 1);
      self.makeNodeWithName(newNodeName, newNodeOffset);
    }
  };

  this.makeNodeWithName = function(newNodeName, newNodeOffset = 220) {
    const otherNodeTitles = self.getOtherNodeTitles();
    if (
      newNodeName &&
      newNodeName.length > 0 &&
      !otherNodeTitles.includes(newNodeName) &&
      newNodeName != self.editing().title()
    ) {
      self
        .newNodeAt(self.editing().x() + newNodeOffset, self.editing().y() - 120)
        .title(newNodeName);
    }
  };

  this.titleExistsTwice = function(title) {
    return (
      app.nodes().filter(node => node.title().trim() === title.trim()).length >
      1
    );
  };

  this.getOtherNodeTitles = function() {
    var result = [];
    app.nodes().forEach(node => {
      if (!self.editing() || node.title() !== self.editing().title()) {
        result.push(node.title().trim());
      }
    });
    return result;
  };

  this.updateArrows = function() {
    self.canvas.width = $(window).width();
    self.canvas.height = $(window).height();

    var scale = self.cachedScale;
    var offset = $(".nodes-holder").offset();

    self.context.clearRect(0, 0, $(window).width(), $(window).height());
    self.context.lineWidth = 4 * scale;

    var nodes = self.nodes();

    for (var i in nodes) {
      var node = nodes[i];
      nodes[i].tempWidth = $(node.element).width();
      nodes[i].tempHeight = $(node.element).height();
      nodes[i].tempOpacity = $(node.element).css("opacity");
    }

    for (var index in nodes) {
      var node = nodes[index];
      if (node.linkedTo().length > 0) {
        for (var link in node.linkedTo()) {
          link = link.trim();
          var linked = node.linkedTo()[link];

          // get origins
          var fromX = (node.x() + node.tempWidth / 2) * scale + offset.left;
          var fromY = (node.y() + node.tempHeight / 2) * scale + offset.top;
          var toX = (linked.x() + linked.tempWidth / 2) * scale + offset.left;
          var toY = (linked.y() + linked.tempHeight / 2) * scale + offset.top;

          // get the normal
          var distance = Math.sqrt(
            (fromX - toX) * (fromX - toX) + (fromY - toY) * (fromY - toY)
          );
          var normal = {
            x: (toX - fromX) / distance,
            y: (toY - fromY) / distance
          };

          var dist =
            110 + 160 * (1 - Math.max(Math.abs(normal.x), Math.abs(normal.y)));

          // get from / to
          var from = {
            x: fromX + normal.x * dist * scale,
            y: fromY + normal.y * dist * scale
          };
          var to = {
            x: toX - normal.x * dist * scale,
            y: toY - normal.y * dist * scale
          };

          self.context.strokeStyle =
            "rgba(0, 0, 0, " + node.tempOpacity * 0.6 + ")";
          self.context.fillStyle =
            "rgba(0, 0, 0, " + node.tempOpacity * 0.6 + ")";

          // draw line
          self.context.beginPath();
          self.context.moveTo(from.x, from.y);
          self.context.lineTo(to.x, to.y);
          self.context.stroke();

          // draw arrow
          self.context.beginPath();
          self.context.moveTo(to.x + normal.x * 4, to.y + normal.y * 4);
          self.context.lineTo(
            to.x - normal.x * 16 * scale - normal.y * 12 * scale,
            to.y - normal.y * 16 * scale + normal.x * 12 * scale
          );
          self.context.lineTo(
            to.x - normal.x * 16 * scale + normal.y * 12 * scale,
            to.y - normal.y * 16 * scale - normal.x * 12 * scale
          );
          self.context.fill();
        }
      }
    }
  };

  this.updateArrowsThrottled = Utils.throttle(
    this.updateArrows,
    this.UPDATE_ARROWS_THROTTLE_MS
  );

  this.getHighlightedText = function(text) {
    text = text.replace(/\</g, "&lt;");
    text = text.replace(/\>/g, "&gt;");
    text = text.replace(
      /\&lt;\&lt;(.*?)\&gt;\&gt;/g,
      '<p class="conditionbounds">&lt;&lt;</p><p class="condition">$1</p><p class="conditionbounds">&gt;&gt;</p>'
    );
    text = text.replace(
      /\[\[([^\|]*?)\]\]/g,
      '<p class="linkbounds">[[</p><p class="linkname">$1</p><p class="linkbounds">]]</p>'
    );
    text = text.replace(
      /\[\[([^\[\]]*?)\|([^\[\]]*?)\]\]/g,
      '<p class="linkbounds">[[</p>$1<p style="color:red"><p class="linkbounds">|</p><p class="linkname">$2</p><p class="linkbounds">]]</p>'
    );
    text = text.replace(
      /[^:]\/\/(.*)?($|\n)/g,
      '<span class="comment">//$1</span>\n'
    );
    text = text.replace(
      /\/\*((.|[\r\n])*)?\*\//gm,
      '<span class="comment">/*$1*/</span>'
    );
    text = text.replace(
      /\/\%((.|[\r\n])*)?\%\//gm,
      '<span class="comment">/%$1%/</span>'
    );

    // create a temporary document and remove all styles inside comments
    var div = $("<div>");
    div[0].innerHTML = text;
    div.find(".comment").each(function() {
      $(this)
        .find("p")
        .each(function() {
          $(this).removeClass();
        });
    });

    // unhighlight links that don't exist
    div.find(".linkname").each(function() {
      var name = $(this).text();
      var found = false;
      for (var i in self.nodes()) {
        if (
          self
            .nodes()
            [i].title()
            .toLowerCase() == name.toLowerCase()
        ) {
          found = true;
          break;
        }
      }
      if (!found) $(this).removeClass("linkname");
    });

    text = div[0].innerHTML;
    return text;
  };

  this.updateLineNumbers = function(text) {
    // update line numbers
    var lines = text.split("\n");
    var lineNumbers = "";
    for (var i = 0; i < Math.max(1, lines.length); i++) {
      if (i == 0 || i < lines.length - 1 || lines[i].length > 0)
        lineNumbers += i + 1 + "<br />";
    }
    $(".editor-container .lines").html(lineNumbers);
  };

  this.updateHighlights = function(e) {
    if (e.keyCode == 17 || (e.keyCode >= 37 && e.keyCode <= 40)) return;

    // get the text
    var editor = $(".editor");
    var text = editor[0].innerText;
    var startOffset, endOffset;

    // ctrl + z
    if ((e.metaKey || e.ctrlKey) && e.keyCode == 90) {
      if (self.editingHistory.length > 0) {
        var last = self.editingHistory.pop();
        text = last.text;
        startOffset = last.start;
        endOffset = last.end;
      } else {
        return;
      }
    } else {
      // get the current start offset
      var range = window.getSelection().getRangeAt(0);
      var preCaretStartRange = range.cloneRange();
      preCaretStartRange.selectNodeContents(editor[0]);
      preCaretStartRange.setEnd(range.startContainer, range.startOffset);
      startOffset = preCaretStartRange.toString().length;

      // get the current end offset
      var preCaretEndRange = range.cloneRange();
      preCaretEndRange.selectNodeContents(editor[0]);
      preCaretEndRange.setEnd(range.endContainer, range.endOffset);
      endOffset = preCaretEndRange.toString().length;

      // ctrl + c
      if ((e.metaKey || e.ctrlKey) && e.keyCode == 67) {
        if (self.gui != undefined) {
          var clipboard = self.gui.Clipboard.get();
          clipboard.set(
            text.substr(startOffset, endOffset - startOffset),
            "text"
          );
        }
      } else {
        // ctrl + v
        if ((e.metaKey || e.ctrlKey) && e.keyCode == 86) {
          var clipboard = self.gui.Clipboard.get();
          text =
            text.substr(0, startOffset) +
            clipboard.get("text") +
            text.substr(endOffset);
          startOffset = endOffset = startOffset + clipboard.get("text").length;
        }
        // ctrl + x
        else if ((e.metaKey || e.ctrlKey) && e.keyCode == 88) {
          if (self.gui != undefined) {
            var clipboard = self.gui.Clipboard.get();
            clipboard.set(
              text.substr(startOffset, endOffset - startOffset),
              "text"
            );
            text = text.substr(0, startOffset) + text.substr(endOffset);
            endOffset = startOffset;
          }
        }
        // increment if we just hit enter
        else if (e.keyCode == 13) {
          startOffset++;
          endOffset++;
          if (startOffset > text.length) startOffset = text.length;
          if (endOffset > text.length) endOffset = text.length;
        }
        // take into account tab character
        else if (e.keyCode == 9) {
          text = text.substr(0, startOffset) + "\t" + text.substr(endOffset);
          startOffset++;
          endOffset = startOffset;
          e.preventDefault();
        }

        // save history (in chunks)
        if (
          self.editingHistory.length == 0 ||
          text != self.editingHistory[self.editingHistory.length - 1].text
        ) {
          if (self.editingSaveHistoryTimeout == null)
            self.editingHistory.push({
              text: text,
              start: startOffset,
              end: endOffset
            });
          clearTimeout(self.editingSaveHistoryTimeout);
          self.editingSaveHistoryTimeout = setTimeout(function() {
            self.editingSaveHistoryTimeout = null;
          }, 500);
        }
      }
    }

    // update text
    //editor[0].innerHTML = self.getHighlightedText(text);

    self.updateLineNumbers(text);

    // reset offsets
    if (document.createRange && window.getSelection) {
      function getTextNodesIn(node) {
        var textNodes = [];
        if (node.nodeType == 3) textNodes.push(node);
        else {
          var children = node.childNodes;
          for (var i = 0, len = children.length; i < len; ++i)
            textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
        }
        return textNodes;
      }

      var range = document.createRange();
      range.selectNodeContents(editor[0]);
      var textNodes = getTextNodesIn(editor[0]);
      var charCount = 0,
        endCharCount;
      var foundStart = false;
      var foundEnd = false;

      for (var i = 0, textNode; (textNode = textNodes[i++]); ) {
        endCharCount = charCount + textNode.length;
        if (
          !foundStart &&
          startOffset >= charCount &&
          (startOffset <= endCharCount ||
            (startOffset == endCharCount && i < textNodes.length))
        ) {
          range.setStart(textNode, startOffset - charCount);
          foundStart = true;
        }
        if (
          !foundEnd &&
          endOffset >= charCount &&
          (endOffset <= endCharCount ||
            (endOffset == endCharCount && i < textNodes.length))
        ) {
          range.setEnd(textNode, endOffset - charCount);
          foundEnd = true;
        }
        if (foundStart && foundEnd) break;
        charCount = endCharCount;
      }

      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  this.zoom = function(zoomLevel) {
    self.cachedScale = zoomLevel / 4;
    self.translate(200);
  };

  this.translate = function(speed) {
    var updateArrowsInterval = setInterval(self.updateArrowsThrottled, 16);

    $(".nodes-holder").transition(
      {
        transform:
          "matrix(" +
          self.cachedScale +
          ",0,0," +
          self.cachedScale +
          "," +
          self.transformOrigin[0] +
          "," +
          self.transformOrigin[1] +
          ")"
      },
      speed || 0,
      "easeInQuad",
      function() {
        clearInterval(updateArrowsInterval);
        self.updateArrowsThrottled();
      }
    );
  };

  /**
   * Align selected nodes relative to a node with the lowest x-value
   */
  this.arrangeX = function() {
    var SPACING = 250;

    var selectedNodes = self
        .nodes()
        .filter(function(el) {
          return el.selected;
        })
        .sort(function(a, b) {
          if (a.x() > b.x()) return 1;
          if (a.x() < b.x()) return -1;
          return 0;
        }),
      referenceNode = selectedNodes.shift();

    if (!selectedNodes.length) {
      alert("Select nodes to align");
      return;
    }

    selectedNodes.forEach(function(node, i) {
      var x = referenceNode.x() + SPACING * (i + 1);
      node.moveTo(x, referenceNode.y());
    });
  };

  /**
   * Align selected nodes relative to a node with the lowest y-value
   */
  this.arrangeY = function() {
    var SPACING = 250;

    var selectedNodes = self
        .nodes()
        .filter(function(el) {
          return el.selected;
        })
        .sort(function(a, b) {
          if (a.y() > b.y()) return 1;
          if (a.y() < b.y()) return -1;
          return 0;
        }),
      referenceNode = selectedNodes.shift();

    if (!selectedNodes.length) {
      alert("Select nodes to align");
      return;
    }

    selectedNodes.forEach(function(node, i) {
      var y = referenceNode.y() + SPACING * (i + 1);
      node.moveTo(referenceNode.x(), y);
    });
  };

  this.arrangeSpiral = function() {
    for (var i in self.nodes()) {
      var node = self.nodes()[i];
      var y = Math.sin(i * 0.5) * (600 + i * 30);
      var x = Math.cos(i * 0.5) * (600 + i * 30);
      node.moveTo(x, y);
    }
  };

  this.sortAlphabetical = function() {
    self.nodes().sort(function(a, b) {
      return a.title().localeCompare(b.title());
    });
  };

  this.moveNodes = function(offX, offY) {
    for (var i in self.nodes()) {
      var node = self.nodes()[i];
      node.moveTo(node.x() + offX, node.y() + offY);
    }
  };

  this.warpToNodeIdx = function(idx) {
    if (self.nodes().length > idx) {
      var node = self.nodes()[idx];
      var nodeXScaled = -(node.x() * self.cachedScale),
        nodeYScaled = -(node.y() * self.cachedScale),
        winXCenter = $(window).width() / 2,
        winYCenter = $(window).height() / 2,
        nodeWidthShift = (node.tempWidth * self.cachedScale) / 2,
        nodeHeightShift = (node.tempHeight * self.cachedScale) / 2;

      self.transformOrigin[0] = nodeXScaled + winXCenter - nodeWidthShift;
      self.transformOrigin[1] = nodeYScaled + winYCenter - nodeHeightShift;
      self.translate(100);
      self.focusedNodeIdx = idx;
    }
  };

  this.warpToSelectedNodeIdx = function(idx) {
    if (self.getSelectedNodes().length > idx) {
      var node = self.getSelectedNodes()[idx];
      var nodeXScaled = -(node.x() * self.cachedScale),
        nodeYScaled = -(node.y() * self.cachedScale),
        winXCenter = $(window).width() / 2,
        winYCenter = $(window).height() / 2,
        nodeWidthShift = (node.tempWidth * self.cachedScale) / 2,
        nodeHeightShift = (node.tempHeight * self.cachedScale) / 2;

      self.transformOrigin[0] = nodeXScaled + winXCenter - nodeWidthShift;
      self.transformOrigin[1] = nodeYScaled + winYCenter - nodeHeightShift;
      self.translate(100);
      self.focusedNodeIdx = idx;
    }
  };

  this.warpToNodeXY = function(x, y) {
    //alert("warp to x, y: " + x + ", " + y);
    const nodeWidth = 100,
      nodeHeight = 100;
    var nodeXScaled = -(x * self.cachedScale),
      nodeYScaled = -(y * self.cachedScale),
      winXCenter = $(window).width() / 2,
      winYCenter = $(window).height() / 2,
      nodeWidthShift = (nodeWidth * self.cachedScale) / 2,
      nodeHeightShift = (nodeHeight * self.cachedScale) / 2;

    self.transformOrigin[0] = nodeXScaled + winXCenter - nodeWidthShift;
    self.transformOrigin[1] = nodeYScaled + winYCenter - nodeHeightShift;

    //alert("self.transformOrigin[0]: " + self.transformOrigin[0]);
    self.translate(100);
  };

  this.searchWarp = function() {
    // if search field is empty
    if (self.$searchField.val() == "") {
      // warp to the first node
      self.warpToNodeIdx(0);
    } else {
      var search = self.$searchField.val().toLowerCase();
      for (var i in self.nodes()) {
        var node = self.nodes()[i];
        if (node.title().toLowerCase() == search) {
          self.warpToNodeIdx(i);
          return;
        }
      }
    }
  };

  this.clearSearch = function() {
    self.$searchField.val("");
    self.updateSearch();
  };

  this.updateEditorStats = function() {
    var text = self.editor.getSession().getValue();
    var cursor = self.editor.getCursorPosition();

    var lines = text.split("\n");
    $(".editor-counter .character-count").html(text.length);
    $(".editor-counter .line-count").html(lines.length);
    $(".editor-counter .row-index").html(cursor.row);
    $(".editor-counter .column-index").html(cursor.column);
  };
};
