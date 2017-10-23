var App = function(name, version)
{
	var self = this;

	// self
	this.globalRootNodeIndexes = ko.observableArray([ko.observable("0 r")]);
	this.globalChildNodeIndexes =  ko.observableArray([ko.observable("0 c")]);
	this.globalFallbackNodeIndexes =  ko.observableArray([ko.observable("0 f")]);
	this.instance = this;
	this.operators = ['And', 'Or']
	this.name = ko.observable(name);
	this.version = ko.observable(version);
	this.editing = ko.observable(null);
	this.advediting = ko.observable(null);
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
	this.zoomSpeed = .005;
	this.zoomLimitMin = .05;
	this.zoomLimitMax = 1;
	this.transformOrigin = [
		0,
		0
	];
	this.shifted = false;

	this.UPDATE_ARROWS_THROTTLE_MS = 25;

	//this.editingPath = ko.observable(null);

	this.nodeSelection = [];

	this.$searchField = $(".search-field");

	// node-webkit
	if (typeof(require) == "function")
	{
		this.gui = require('nw.gui');
		this.fs = require('fs');
	}

	this.run = function()
	{
		//TODO(Al):
		// delete mutliple nodes at the same time

		var osName = "Unknown OS";
		if (navigator.platform.indexOf("Win")!=-1) osName="Windows";
		if (navigator.platform.indexOf("Mac")!=-1) osName="MacOS";
		if (navigator.platform.indexOf("X11")!=-1) osName="UNIX";
		if (navigator.platform.indexOf("Linux")!=-1) osName="Linux";

		if (osName == "Windows")
			self.zoomSpeed = .1;

		$("#app").show();
		ko.applyBindings(self, $("#app")[0]);

		self.canvas = $(".arrows")[0];
		self.context = self.canvas.getContext('2d');
		self.newRootNode().title("Get Started");
		self.nodes()[0].conditions()[0].content("#Get Started");
		self.newFallbackNode("Default Fallback");

		if (osName != "Windows" && osName != "Linux" && self.gui != undefined)
		{
			var win = self.gui.Window.get();
			var nativeMenuBar = new self.gui.Menu({ type: "menubar" });
			if(nativeMenuBar.createMacBuiltin) {
				nativeMenuBar.createMacBuiltin("Yarn");
			}
			win.menu = nativeMenuBar;
		}

		// search field enter
		self.$searchField.on("keydown", function (e)
		{
				// enter
				if (e.keyCode == 13)
					self.searchWarp();

				// escape
				if (e.keyCode == 27)
					self.clearSearch();
			});

		ko.bindingHandlers.editableText = {
	    init: function(element, valueAccessor) {
	        $(element).on('blur', function() {
	            var observable = valueAccessor();
	            observable( $(this).text() );
	        });
	    },
	    update: function(element, valueAccessor) {
	        var value = ko.utils.unwrapObservable(valueAccessor());
	        $(element).text(value);
	    }
		};

		// prevent click bubbling
		ko.bindingHandlers.preventBubble =
		{
			init: function(element, valueAccessor)
			{
				var eventName = ko.utils.unwrapObservable(valueAccessor());
				ko.utils.registerEventHandler(element, eventName, function(event)
				{
					event.cancelBubble = true;
					if (event.stopPropagation)
						event.stopPropagation();
				});
			}
		};

		ko.bindingHandlers.mousedown =
		{
			init: function(element, valueAccessor, allBindings, viewModel, bindingContext)
			{
				var value = ko.unwrap(valueAccessor());
				$(element).mousedown(function()
				{
					value();
				});
			}
		};

		// updateArrows
		// setInterval(function() { self.updateArrows(); }, 16);

		// drag node holder around
		(function()
		{
			var dragging = false;
			var offset = { x: 0, y: 0 };
			var MarqueeOn = false;
			var MarqueeSelection = [];
			var MarqRect = {x1:0,y1:0,x2:0,y2:0};
			var MarqueeOffset = [0, 0];

			$(".nodes").on("mousedown", function(e)
			{
				$("#marquee").css({x:0, y:0, width:0, height:0});
				dragging = true;
				offset.x = e.pageX;
				offset.y = e.pageY;
				MarqueeSelection = [];
				MarqRect = {x1:0,y1:0,x2:0,y2:0};

				var scale = self.cachedScale;

				MarqueeOffset[0] = 0;
				MarqueeOffset[1] = 0;

				if (!e.altKey && !e.shiftKey)
					self.deselectAllNodes();
			});

			$(".nodes").on("mousemove", function(e)
			{

				if (dragging)
				{
					// if(e.ctrlKey)
					if (e.altKey)
					{
						//prevents jumping straight back to standard dragging
						if(MarqueeOn)
						{
							MarqueeSelection = [];
							MarqRect = {x1:0,y1:0,x2:0,y2:0};
							$("#marquee").css({x:0, y:0, width:0, height:0});
						}
						else
						{
							self.transformOrigin[0] += e.pageX - offset.x;
							self.transformOrigin[1] += e.pageY - offset.y;

							self.translate();

							offset.x = e.pageX;
							offset.y = e.pageY;

							/*
							var nodes = self.nodes();
							for (var i in nodes)
							{
								nodes[i].x(nodes[i].x() + (e.pageX - offset.x) / self.cachedScale);
								nodes[i].y(nodes[i].y() + (e.pageY - offset.y) / self.cachedScale);
							}
							offset.x = e.pageX;
							offset.y = e.pageY;
							*/
						}
					}
					else
					{
						MarqueeOn = true;

						var scale = self.cachedScale;

						if(e.pageX > offset.x && e.pageY < offset.y)
						{
							MarqRect.x1 = offset.x;
							MarqRect.y1 = e.pageY;
							MarqRect.x2 = e.pageX;
							MarqRect.y2 = offset.y;
						}
						else if(e.pageX > offset.x && e.pageY > offset.y)
						{
							MarqRect.x1 = offset.x;
							MarqRect.y1 = offset.y;
							MarqRect.x2 = e.pageX;
							MarqRect.y2 = e.pageY;
						}
						else if(e.pageX < offset.x && e.pageY < offset.y)
						{
							MarqRect.x1 = e.pageX;
							MarqRect.y1 = e.pageY;
							MarqRect.x2 = offset.x;
							MarqRect.y2 = offset.y;
						}
						else
						{
							MarqRect.x1 = e.pageX;
							MarqRect.y1 = offset.y;
							MarqRect.x2 = offset.x;
							MarqRect.y2 = e.pageY;
						}

						$("#marquee").css({ x:MarqRect.x1,
							y:MarqRect.y1,
							width:Math.abs(MarqRect.x1-MarqRect.x2),
							height:Math.abs(MarqRect.y1-MarqRect.y2)});

						//Select nodes which are within the marquee
						// MarqueeSelection is used to prevent it from deselecting already
						// selected nodes and deselecting onces which have been selected
						// by the marquee
						var nodes = self.nodes();
						for(var i in nodes)
						{
							var index = MarqueeSelection.indexOf(nodes[i]);
							var inMarqueeSelection = (index >= 0);

							//test the Marque scaled to the nodes x,y values

							var holder = $(".nodes-holder").offset();
							var marqueeOverNode = (MarqRect.x2 - holder.left) / scale > nodes[i].x()
											   && (MarqRect.x1 - holder.left) / scale < nodes[i].x() + nodes[i].tempWidth
        									   && (MarqRect.y2 - holder.top) / scale > nodes[i].y()
        									   && (MarqRect.y1 - holder.top) / scale < nodes[i].y() + nodes[i].tempHeight;

							if(marqueeOverNode)
							{
								if(!inMarqueeSelection)
								{
									self.addNodeSelected(nodes[i]);
									MarqueeSelection.push(nodes[i]);
								}
							}
							else
							{
								if(inMarqueeSelection)
								{
									self.removeNodeSelection(nodes[i]);
									MarqueeSelection.splice(index, 1);
								}

							}
						}
					}

				}

			});

			$(".nodes").on("mouseup", function(e)
			{
				// console.log("finished dragging");
				dragging = false;

				if(MarqueeOn && MarqueeSelection.length == 0)
				{
					self.deselectAllNodes();
				}

				MarqueeSelection = [];
				MarqRect = {x1:0,y1:0,x2:0,y2:0};
				$("#marquee").css({x:0, y:0, width:0, height:0});
				MarqueeOn = false;

			});
		})();

		// search field
		self.$searchField.on('input', self.updateSearch);
		$(".search-title input").click(self.updateSearch);
		$(".search-body input").click(self.updateSearch);
		$(".search-tags input").click(self.updateSearch);

		// using the event helper
		$('.nodes').mousewheel(function(event) {
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
			};

			var mouseX = event.pageX - self.transformOrigin[0],
				mouseY = event.pageY - self.transformOrigin[1],
				newX = mouseX * (self.cachedScale / lastZoom),
				newY = mouseY * (self.cachedScale / lastZoom),
				deltaX = (mouseX - newX),
				deltaY = (mouseY - newY);

			self.transformOrigin[0] += deltaX;
			self.transformOrigin[1] += deltaY;

			self.translate();
		});

		$(document).on('keyup keydown', function(e) { self.shifted = e.shiftKey; } );

		$(document).contextmenu( function(e){
			var isAllowedEl = (
					$(e.target).hasClass('nodes') ||
					$(e.target).parents('.nodes').length
				);

			if( e.button == 2 && isAllowedEl )
			{
				var x = self.transformOrigin[0] * -1 / self.cachedScale,
					y = self.transformOrigin[1] * -1 / self.cachedScale;

				x += event.pageX / self.cachedScale;
				y += event.pageY / self.cachedScale;

				self.newNodeAt(x, y);
			}

			return !isAllowedEl;
		});

		$(document).on('keydown', function(e){
			//global ctrl+z
			if((e.metaKey || e.ctrlKey) && !self.editing())
			{
				switch(e.keyCode)
				{
					case 90: self.historyDirection("undo");
					break;
					case 89: self.historyDirection("redo");
					break;
					case 68: self.deselectAllNodes();
				}
			}
		});

		$(document).on('keydown', function(e) {
			if (self.editing() || self.$searchField.is(':focus') || self.advediting()) return;

			var scale = self.cachedScale || 1,
				movement = scale * 500;

			if(e.shiftKey) {
				movement = scale * 100;
			}

			if (e.keyCode === 65 || e.keyCode === 37) {  // a or left arrow
				self.transformOrigin[0] += movement;
			} else if (e.keyCode === 68 || e.keyCode === 39) {  // d or right arrow
				self.transformOrigin[0] -= movement;
			} else if (e.keyCode === 87 || e.keyCode === 38) {  // w or up arrow
				self.transformOrigin[1] += movement;
			} else if (e.keyCode === 83 || e.keyCode === 40) {  // w or down arrow
				self.transformOrigin[1] -= movement;
			} else if (e.keyCode === 32) {
				var selectedNodes = self.getSelectedNodes();
				var nodes = selectedNodes.length > 0
							? selectedNodes
							: self.nodes();
				var isNodeSelected = selectedNodes.length > 0;
				if (self.focusedNodeIdx > -1 && nodes.length > self.focusedNodeIdx
					&& (self.transformOrigin[0] != -nodes[self.focusedNodeIdx].x() + $(window).width() / 2 - $(nodes[self.focusedNodeIdx].element).width() / 2
						|| self.transformOrigin[1] != -nodes[self.focusedNodeIdx].y() + $(window).height() / 2 - $(nodes[self.focusedNodeIdx].element).height() / 2))
				{
					self.focusedNodeIdx = -1;
				}

				if (++self.focusedNodeIdx >= nodes.length) {
					self.focusedNodeIdx = 0;
				}
				self.cachedScale = 1;
				if (isNodeSelected)
				{
					self.warpToSelectedNodeIdx(self.focusedNodeIdx);
				}
				else
				{
					self.warpToNodeIdx(self.focusedNodeIdx);
				}
			}

			self.translate(100);
		} );


		$(window).on('resize', self.updateArrowsThrottled);

		// apple command key
		//$(window).on('keydown', function(e) { if (e.keyCode == 91 || e.keyCode == 93) { self.appleCmdKey = true; } });
		//$(window).on('keyup', function(e) { if (e.keyCode == 91 || e.keyCode == 93) { self.appleCmdKey = false; } });
	}

	this.getNodesConnectedTo = function(toNode)
	{
		var connectedNodes = [];
		var nodes = self.nodes();
		for (var i in nodes)
		{
			if (nodes[i] != toNode && nodes[i].isConnectedTo(toNode, true))
			{
				var hasNode = false;
				for (var j in connectedNodes)
				{
					if (connectedNodes[j] == nodes[i])
					{
						hasNode = true;
						break;
					}
				}
				if (!hasNode)
					connectedNodes.push(nodes[i]);
			}
		}
		return connectedNodes;
	}

	this.mouseUpOnNodeNotMoved = function()
	{
		self.deselectAllNodes();
	}

	this.matchConnectedColorID = function(fromNode)
	{
		var nodes = self.getNodesConnectedTo(fromNode);
		for (var i in nodes)
			nodes[i].colorID(fromNode.colorID());
	}

	this.quit = function()
	{
		if (self.gui != undefined)
		{
			self.gui.App.quit();
		}
	}

	this.refreshWindowTitle = function(editingPath)
	{
		var gui = require('nw.gui');

		if (!gui) return;

		// Get the current window
		var win = gui.Window.get();

		win.title = "Yarn - [" + editingPath + "] ";// + (self.dirty?"*":"");
	}

	this.recordNodeAction = function(action, node)
	{
		//we can't go forward in 'time' when
		//new actions have been made
		if(self.nodeFuture.length > 0)
		{
			for (var i = 0; i < self.nodeFuture.length; i++) {
				var future = self.nodeFuture.pop();
				delete future.node;
			};

			delete self.nodeFuture;
			self.nodeFuture = [];
		}

		var historyItem = {action: action, node: node, lastX: node.x(), lastY: node.y()};

		if(action == "removed")
		{
			historyItem.lastY+=80;
		}

		self.nodeHistory.push(historyItem);
	}

	this.historyDirection = function(direction)
	{
		function removeNode(node){
			var index = self.nodes.indexOf(node);
			if  (index >= 0)
			{
				self.nodes.splice(index, 1);
			}
			self.updateNodeLinks();
		}

		var historyItem = null;

		if(direction == "undo")
			historyItem = self.nodeHistory.pop();
		else
			historyItem = self.nodeFuture.pop();

		if(!historyItem) return;

		var action = historyItem.action;
		var node = historyItem.node;


		if(direction == "undo") //undo actions
		{
			if(action == "created")
			{
				historyItem.lastX = node.x();
				historyItem.lastY = node.y();
				removeNode(node);
			}
			else if(action == "removed")
			{
				self.recreateNode(node, historyItem.lastX, historyItem.lastY);
			}

			self.nodeFuture.push(historyItem);
		}
		else //redo undone actions
		{
			if(action == "created")
			{
				self.recreateNode(node, historyItem.lastX, historyItem.lastY);
			}
			else if(action == "removed")
			{
				removeNode(node);
			}

			self.nodeHistory.push(historyItem);
		}
	}

	this.recreateNode = function(node, x, y)
	{
		self.nodes.push(node);
		node.moveTo(x, y);
		self.updateNodeLinks();
	}

	this.setSelectedColors = function(node)
	{
		var nodes = self.getSelectedNodes();
		nodes.splice(nodes.indexOf(node), 1);

		for(var i in nodes)
			nodes[i].colorID(node.colorID());
	}

	this.getSelectedNodes = function()
	{
		var selectedNode = [];

		for(var i in self.nodeSelection)
		{
			selectedNode.push(self.nodeSelection[i]);
		}

		return selectedNode;
	}

	this.deselectAllNodes = function()
	{
		var nodes = self.nodes();
		for (var i in nodes)
		{
			self.removeNodeSelection(nodes[i]);
		}
	}

	this.addNodeSelected = function(node)
	{
		var index = self.nodeSelection.indexOf(node);
		if(index < 0)
		{
			self.nodeSelection.push(node);
			node.setSelected(true);
		}
	}

	this.removeNodeSelection = function(node)
	{
		var index = self.nodeSelection.indexOf(node);
		if  (index >= 0)
		{
			self.nodeSelection.splice(index, 1);
			node.setSelected(false);
		}
	}

	this.deleteSelectedNodes = function()
	{
		var nodes = self.getSelectedNodes();
		for(var i in nodes)
		{
			self.removeNodeSelection(nodes[i]);
			nodes[i].remove();
		}
	}

	this.newRootNode = function(updateArrows)
	{
		var node = new Node("root");
		var nodes = self.nodes();
		// console.log(nodes[0]);
		self.nodes.push(node);
		if (updateArrows == undefined || updateArrows == true)
			self.updateNodeLinks();

		self.recordNodeAction("created", node);

		return node;
	}

	this.newChildNode = function(userInput, new_position)
	{
		var selectedNodes = self.getSelectedNodes();
		if (selectedNodes.length == 0)
			alert("Select the parent node");
		else if (selectedNodes.length > 1)
			alert("Too many nodes selected");
		else
			{
				let childs = selectedNodes[0].childs();
				let y = selectedNodes[0].y();
				if (childs.length > 0) { // IF selected Node has childs :
					let lastChildNode = selectedNodes[0].childs()[selectedNodes[0].childs().length -1];
					y = lastChildNode.y() + 250;
					childsTitles =[];
					for (var i = 0; i < childs.length; i++) {
						childsTitles.push(childs[i].title());
					}
					if (childsTitles.includes(userInput)) {
						alert("You can't have more than one child with the same name")
						return true;
					}
				}
				if (childs.length == 0 || childsTitles != undefined) {
					let childNode = new Node("child", userInput);
					childNode.parents = ko.observableArray([selectedNodes[0]]);
					let selectedNodeIndex = selectedNodes[0].index();
					for (var i = 0; i < self.nodes().length; i++) {
						if (self.nodes()[i].index() == selectedNodeIndex) {
							self.nodes()[i].childs.push(childNode);
							break;
						}
					}
					self.nodes.push(childNode);
					if (!new_position) {
						childNode.x(selectedNodes[0].x()+250);
						childNode.y(y);
					}
					self.updateNodeLinks();
					self.recordNodeAction("created", childNode);

					return childNode;
				}

			}
	}

	this.newFallbackNode = function(type)
	{

		var selectedNodes = self.getSelectedNodes();
		if (selectedNodes.length == 0)
			if (type == "Default Fallback") {
				let fallbackNode = new Node("fallback");
				fallbackNode.title("Default Fallback");
				self.nodes.push(fallbackNode);
				app.nodes()[1].x(app.nodes()[0].x());
				app.nodes()[1].y(app.nodes()[0].y() + 350);
				self.recordNodeAction("created", fallbackNode);
				return fallbackNode;
			}
			else {

			}
		else if (selectedNodes.length > 1)
			alert("Too many nodes selected");
		else
			{
				if (selectedNodes[0].fallback() == "") {
					let fallbackNode = new Node("fallback");
					fallbackNode.parents.push(selectedNodes[0]);
					let selectedNodeIndex = selectedNodes[0].index();
					for (var i = 0; i < self.nodes().length; i++) {
						if (self.nodes()[i].index() == selectedNodeIndex) {
							self.nodes()[i].fallback(fallbackNode);
							break;
						}
					}
					self.nodes.push(fallbackNode);
					self.updateNodeLinks();
					self.recordNodeAction("created", fallbackNode);

					return fallbackNode;
				}
				else {
					alert("A node can't have more than one fallback")
				}


			}
	}

	this.newNodeAt = function(x, y)
	{
		var node = new Node();

		self.nodes.push(node);

		node.x(x-100);
		node.y(y-100);
		self.updateNodeLinks();
		self.recordNodeAction("created", node);

		return node;
	}

	this.removeNode = function(node)
	{
		if(node.selected)
		{
			self.deleteSelectedNodes();
		}
		var index = self.nodes.indexOf(node);
		if  (index >= 0)
		{
			self.recordNodeAction("removed", node);
			self.nodes.splice(index, 1);
			if (node.parents().length > 0) {
				for (var i = 0; i < node.parents().length; i++) {
					if (node.index()[node.index().length -1] == "c") {
						node.parents()[i].childs.remove(node);
						for (let j = parseInt(node.index()); j < self.globalChildNodeIndexes().length - 1; j++) {
							self.globalChildNodeIndexes()[j](j - 1 + ' c');
						}
					}
					if (node.index()[node.index().length -1] == "f") {
						node.parents()[i].fallback("");
						for (let j = parseInt(node.index()); j < self.globalFallbackNodeIndexes().length - 1; j++) {
							self.globalFallbackNodeIndexes()[j](j - 1 + ' f');
						}
					}
				}
			}
			if (node.index()[node.index().length -1] == "r") {
				for (let i = index; i < self.globalRootNodeIndexes().length - 1; i++) {
					self.globalRootNodeIndexes()[i](i - 1 + ' r');
				}
			}
		}
		self.updateNodeLinks();
	}

	this.editNode = function(node)
	{
		if (node.active())
		{
			self.editing(node);

			$(".node-editor").css({ opacity: 0.8 }).transition({ opacity: 1 }, 400);
			$(".node-editor .form").css({ x: "400" }).transition({ x: "0" }, 400);



			//enable_spellcheck();
			contents_modified = true;
			//spell_check();
		}
	}

	this.saveNode = function()
	{
		if (self.editing() != null)
		{
			self.updateNodeLinks();
			self.editing().title(self.trim(self.editing().title()));
			self.editing().uuid = guid();

			$(".node-editor").transition({ opacity: 0.8 }, 400);
			$(".node-editor .form").transition({ x: "500" }, 400, function()
			{
				self.editing(null);
			});

			setTimeout(self.updateSearch, 100);
		}
	}

	this.editNodeAdv = function(node)
	{
		if (node.active())
		{
			self.advediting(node);

			$(".adv-node-editor").css({ opacity: 0.8 }).transition({ opacity: 1 }, 400);
			$(".adv-node-editor .form").css({ x: "-400" }).transition({ x: "0" }, 400);


			//enable_spellcheck();
			contents_modified = true;
			//spell_check();
		}
	}

	this.saveNodeAdv = function()
	{
		if (self.advediting() != null)
		{
			if (self.advediting().conditions()[0].content().length != "") {
				self.advediting().colorID(1);
			}

			$(".adv-node-editor").transition({ opacity: 0.8 }, 400);
			$(".adv-node-editor .form").transition({ x: "-400" }, 400, function()
			{
				self.advediting(null);
			});

			setTimeout(self.updateSearch, 100);
		}
	}

	this.addCondition = function(){
		if (self.advediting() != null)
		{
			self.advediting().conditions.push({content: ko.observable(""), op: ko.observable("And")});
		}
	}

	this.trim = function(x)
	{
		return x.replace(/^\s+|\s+$/gm,'');
	}

	this.addQuickReply = function(){
		if (self.editing() != null)
		{
			self.editing().quickreplies.push({'id': ko.observable("New QuickReply")});
			let add_node = confirm("Do you want to add a node corresponding to this Quick Reply?");
			if (add_node) {
				self.newChildNode(self.editing().quickreplies()[self.editing().quickreplies().length -1].id);
			}
		}
	}

	this.removeQuickReply = function(quickreply_name){
		if (self.editing() != null)
		{
			self.editing().quickreplies.remove(function (quickreply) { return quickreply.id == quickreply_name })
		}
	}

//TODO Filter quickreplies with same name
	this.filterQuickReplies = function (quickreply) {
		if (self.editing() != null)
		{
			let quickreplies = [];
			for (let i = 0; i < self.editing().quickreplies().length; i++) {
				quickreplies.push(self.editing().quickreplies()[i].id());
			}
		}
	}

	this.addBotAnswer = function(){
		if (self.editing() != null)
		{
			self.editing().body.push({'id': ko.observable("New Empty text")});
		}
	}

	this.removeBotAnswer = function(Bot_Answer_name){
		if (self.editing() != null)
		{
			self.editing().body.remove(function (BotAnswer) { return BotAnswer.id == Bot_Answer_name })
		}
	}

	this.updateSearch = function()
	{
		var search = self.$searchField.val().toLowerCase();
		var title = $(".search-title input").is(':checked');
		var body = $(".search-body input").is(':checked');
		var quickreplies = $(".search-quickreply input").is(':checked');

		var on = 1;
		var off = 0.25;

		for (var i = 0; i < app.nodes().length; i ++)
		{
			var node = app.nodes()[i];
			var element = $(node.element);

			var node_body = "";
			node.body().forEach(function(bubble) {
				node_body += ' '+ bubble.id();
			})
			var node_quickreplies="";
			node.quickreplies().forEach(function(quickreply) {
				node_quickreplies += ' '+ quickreply.id();
			})

			if (search.length > 0 && (title || body || quickreplies))
			{
				var matchTitle = (title && node.title().toLowerCase().indexOf(search) >= 0);
				var matchBody = (body && node_body.toLowerCase().indexOf(search) >= 0);
				var matchQuickReplies = (quickreplies && node_quickreplies.toLowerCase().indexOf(search) >= 0);

				if (matchTitle || matchBody || matchQuickReplies)
				{
					node.active(true);
					element.clearQueue();
					element.transition({opacity: on}, 500);
				}
				else
				{
					node.active(false);
					element.clearQueue();
					element.transition({opacity: off}, 500);
				}
			}
			else
			{
				node.active(true);
				element.clearQueue();
				element.transition({opacity: on}, 500);
			}
		}
	}

	this.updateNodeLinks = function()
	{
		for  (var i in self.nodes())
			self.nodes()[i].updateLinks();
	}

	this.updateArrows = function()
	{
		self.canvas.width = $(window).width();
		self.canvas.height = $(window).height();

		var scale = self.cachedScale;
		var offset = $(".nodes-holder").offset();

		self.context.clearRect(0, 0, $(window).width(), $(window).height());
		self.context.lineWidth = 4 * scale;

		var nodes = self.nodes();

		for(var i in nodes)
		{
			var node = nodes[i];
			nodes[i].tempWidth = $(node.element).width();
			nodes[i].tempHeight = $(node.element).height();
			nodes[i].tempOpacity = $(node.element).css("opacity");
		}

		for(var index in nodes)
		{
			var node = nodes[index];
			if (node.linkedTo().length > 0)
			{
				for(var link in node.linkedTo())
				{
					var linked = node.linkedTo()[link];

					// get origins
					var fromX = (node.x() + node.tempWidth/2) * scale + offset.left;
					var fromY = (node.y() + node.tempHeight/2) * scale + offset.top;
					var toX = (linked.x() + linked.tempWidth/2) * scale + offset.left;
					var toY = (linked.y() + linked.tempHeight/2) * scale + offset.top;

					// get the normal
					var distance = Math.sqrt((fromX - toX) * (fromX - toX) + (fromY - toY) * (fromY - toY));
					var normal = { x: (toX - fromX) / distance, y: (toY - fromY) / distance };

					var dist = 110 + 160 * (1 - Math.max(Math.abs(normal.x), Math.abs(normal.y)));

					// get from / to
					var from = { x: fromX + normal.x * dist * scale, y: fromY + normal.y * dist * scale };
					var to = { x: toX - normal.x * dist * scale, y: toY - normal.y * dist * scale };

					self.context.strokeStyle = "rgba(110, 165, 224, " + (node.tempOpacity * 1) + ")";
					self.context.fillStyle = "rgba(110, 165, 224, " + (node.tempOpacity * 1) + ")";

					// draw line
					self.context.beginPath();
					self.context.moveTo(from.x, from.y);
					self.context.lineTo(to.x, to.y);
					self.context.stroke();

					// draw arrow
					self.context.beginPath();
					self.context.moveTo(to.x + normal.x * 4, to.y + normal.y * 4);
					self.context.lineTo(to.x - normal.x * 16 * scale - normal.y * 12 * scale, to.y - normal.y * 16 * scale + normal.x * 12 * scale);
					self.context.lineTo(to.x - normal.x * 16 * scale + normal.y * 12 * scale, to.y - normal.y * 16 * scale - normal.x * 12 * scale);
					self.context.fill();
				}
			}
		}
	}

	this.updateArrowsThrottled = Utils.throttle(this.updateArrows, this.UPDATE_ARROWS_THROTTLE_MS);

	this.getHighlightedText = function(text)
	{
		text = text.replace(/\</g, '&lt;');
		text = text.replace(/\>/g, '&gt;');
		text = text.replace(/\&lt;\&lt;(.*?)\&gt;\&gt;/g, '<p class="conditionbounds">&lt;&lt;</p><p class="condition">$1</p><p class="conditionbounds">&gt;&gt;</p>');
		text = text.replace(/\[\[([^\|]*?)\]\]/g, '<p class="linkbounds">[[</p><p class="linkname">$1</p><p class="linkbounds">]]</p>');
		text = text.replace(/\[\[([^\[\]]*?)\|([^\[\]]*?)\]\]/g, '<p class="linkbounds">[[</p>$1<p style="color:red"><p class="linkbounds">|</p><p class="linkname">$2</p><p class="linkbounds">]]</p>');
		text = text.replace(/\/\/(.*)?($|\n)/g, '<span class="comment">//$1</span>\n');
		text = text.replace(/\/\*((.|[\r\n])*)?\*\//gm, '<span class="comment">/*$1*/</span>');
		text = text.replace(/\/\%((.|[\r\n])*)?\%\//gm, '<span class="comment">/%$1%/</span>');

		// create a temporary document and remove all styles inside comments
		var div = $("<div>");
		div[0].innerHTML = text;
		div.find(".comment").each(function()
		{
			$(this).find("p").each(function()
			{
				$(this).removeClass();
			})
		})

		// unhighlight links that don't exist
		div.find(".linkname").each(function()
		{
			var name = $(this).text();
			var found = false;
			for (var i in self.nodes())
			{
				if (self.nodes()[i].title().toLowerCase() == name.toLowerCase())
				{
					found = true;
					break;
				}
			}
			if (!found)
				$(this).removeClass("linkname");
		});

		text = div[0].innerHTML;
		return text;
	}

	this.updateLineNumbers = function(text)
	{
		// update line numbers
		var lines = text.split("\n");
		var lineNumbers = "";
		for (var i = 0; i < Math.max(1, lines.length); i ++)
		{
			if (i == 0 || i < lines.length - 1 || lines[i].length > 0)
				lineNumbers += (i + 1) + "<br />";
		}
		$(".editor-container .lines").html(lineNumbers);
	}

	this.updateHighlights = function(e)
	{
		if (e.keyCode == 17 || (e.keyCode >= 37 && e.keyCode <= 40))
			return;

		// get the text
		var editor = $(".editor");
		var text = editor[0].innerText;
		var startOffset, endOffset;

		// ctrl + z
		if ((e.metaKey || e.ctrlKey) && e.keyCode == 90)
		{
			if (self.editingHistory.length > 0)
			{
				var last = self.editingHistory.pop();
				text = last.text;
				startOffset = last.start;
				endOffset = last.end;
			}
			else
			{
				return;
			}
		}
		else
		{
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
			if ((e.metaKey || e.ctrlKey) && e.keyCode == 67)
			{
				if (self.gui != undefined)
				{
					var clipboard = self.gui.Clipboard.get();
					clipboard.set(text.substr(startOffset, (endOffset - startOffset)), 'text');
				}
			}
			else
			{
				// ctrl + v
				if ((e.metaKey || e.ctrlKey) && e.keyCode == 86)
				{
					var clipboard = self.gui.Clipboard.get();
					console.log(clipboard);
					text = text.substr(0, startOffset) + clipboard.get('text') + text.substr(endOffset);
					startOffset = endOffset = (startOffset + clipboard.get('text').length);
				}
				// ctrl + x
				else if ((e.metaKey || e.ctrlKey) && e.keyCode == 88)
				{
					if (self.gui != undefined)
					{
						var clipboard = self.gui.Clipboard.get();
						clipboard.set(text.substr(startOffset, (endOffset - startOffset)), 'text');
						text = text.substr(0, startOffset) + text.substr(endOffset);
						endOffset = startOffset;
					}
				}
				// increment if we just hit enter
				else if (e.keyCode == 13)
				{
					startOffset ++;
					endOffset ++;
					if (startOffset > text.length)
						startOffset = text.length;
					if (endOffset > text.length)
						endOffset = text.length;
				}
				// take into account tab character
				else if (e.keyCode == 9)
				{
					text = text.substr(0, startOffset) + "\t" + text.substr(endOffset);
					startOffset ++;
					endOffset = startOffset;
					e.preventDefault();
				}

				// save history (in chunks)
				if ((self.editingHistory.length == 0 || text != self.editingHistory[self.editingHistory.length - 1].text))
				{
					if (self.editingSaveHistoryTimeout == null)
						self.editingHistory.push({ text: text, start: startOffset, end: endOffset });
					clearTimeout(self.editingSaveHistoryTimeout);
					self.editingSaveHistoryTimeout = setTimeout(function() { self.editingSaveHistoryTimeout = null; }, 500);
				}
			}
		}

		// update text
		//editor[0].innerHTML = self.getHighlightedText(text);

		self.updateLineNumbers(text);

		// reset offsets
		if (document.createRange && window.getSelection)
		{
			function getTextNodesIn(node)
			{
				var textNodes = [];
				if (node.nodeType == 3)
					textNodes.push(node);
				else
				{
					var children = node.childNodes;
					for (var i = 0, len = children.length; i < len; ++i)
						textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
				}
				return textNodes;
			}

			var range = document.createRange();
			range.selectNodeContents(editor[0]);
			var textNodes = getTextNodesIn(editor[0]);
			var charCount = 0, endCharCount;
			var foundStart = false;
			var foundEnd = false;

			for (var i = 0, textNode; textNode = textNodes[i++]; )
			{
				endCharCount = charCount + textNode.length;
				if (!foundStart && startOffset >= charCount && (startOffset <= endCharCount || (startOffset == endCharCount && i < textNodes.length)))
				{
					range.setStart(textNode, startOffset - charCount);
					foundStart = true;
				}
				if (!foundEnd && endOffset >= charCount && (endOffset <= endCharCount || (endOffset == endCharCount && i < textNodes.length)))
				{
					range.setEnd(textNode, endOffset - charCount);
					foundEnd = true;
				}
				if (foundStart && foundEnd)
					break;
				charCount = endCharCount;
			}

			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}

	this.zoom = function(zoomLevel)
	{
		switch (zoomLevel)
		{
			case 1:
				self.cachedScale = 0.25;
				break;
			case 2:
				self.cachedScale = 0.5;
				break;
			case 3:
				self.cachedScale = 0.75;
				break;
			case 4:
				self.cachedScale = 1;
				break;
		}

		self.translate(200);
	}

	this.translate = function(speed)
	{
		var updateArrowsInterval = setInterval(self.updateArrowsThrottled, 16);

		$(".nodes-holder").transition(
			{
				transform: (
					"matrix(" +
						self.cachedScale + ",0,0," +
						self.cachedScale + "," +
						self.transformOrigin[0] +"," +
						self.transformOrigin[1] +
					")"
				)
			},
			speed || 0,
			"easeInQuad",
			function() {
				clearInterval(updateArrowsInterval);
				self.updateArrowsThrottled();
			}
		);
	}

	/**
	 * Align selected nodes relative to a node with the lowest x-value
	 */
	this.arrangeX = function()
	{
		self.nodes().forEach(function(node) {
		})
		var SPACING = 250;

		var selectedNodes = self.nodes().filter(function(el) {
				return el.selected;
			})
			.sort(function(a, b) {
				if (a.x() > b.x()) return 1;
				if (a.x() < b.x()) return -1;
				return 0;
			}),
			referenceNode = selectedNodes.shift();

		if (!selectedNodes.length) {
			alert('Select nodes to align');
			return;
		}

		selectedNodes.forEach(function(node, i) {
			var x = referenceNode.x() + (SPACING * (i + 1));
			node.moveTo(x, referenceNode.y());
		});
	}

	/**
	 * Align selected nodes relative to a node with the lowest y-value
	 */
	this.arrangeY = function()
	{
		var SPACING = 250;

		var selectedNodes = self.nodes().filter(function(el) {
				return el.selected;
			})
			.sort(function(a, b) {
				if (a.y() > b.y()) return 1;
				if (a.y() < b.y()) return -1;
				return 0;
			}),
			referenceNode = selectedNodes.shift();

		if (!selectedNodes.length) {
			alert('Select nodes to align');
			return;
		}

		selectedNodes.forEach(function(node, i) {
			var y = referenceNode.y() + (SPACING * (i + 1));
			node.moveTo(referenceNode.x(), y);
		});
	}

	this.arrangeSpiral = function()
	{
		for (var i in self.nodes())
		{
			var node = self.nodes()[i];
			var y = Math.sin(i * .5) * (600 + i * 30);
			var x = Math.cos(i * .5) * (600 + i * 30);
			node.moveTo(x, y);
		}
	}

	this.sortAlphabetical = function()
	{
		console.log(self.nodes.sort);
		self.nodes.sort(function(a, b) { return a.title().localeCompare(b.title()); });
	}

	this.moveNodes = function(offX, offY)
	{
		for (var i in self.nodes())
		{
			var node = self.nodes()[i];
			node.moveTo(node.x() + offX, node.y() + offY);
		}
	}

	this.warpToNodeIdx = function(idx)
	{
		if (self.nodes().length > idx)
		{
			var node = self.nodes()[idx];
			var nodeXScaled = -( node.x() * self.cachedScale ),
				nodeYScaled = -( node.y() * self.cachedScale ),
				winXCenter = $(window).width() / 2,
				winYCenter = $(window).height() / 2,
				nodeWidthShift = node.tempWidth * self.cachedScale / 2,
				nodeHeightShift = node.tempHeight * self.cachedScale / 2;

			self.transformOrigin[0] = nodeXScaled + winXCenter - nodeWidthShift;
			self.transformOrigin[1] = nodeYScaled + winYCenter - nodeHeightShift;
			self.translate(100);
			self.focusedNodeIdx = idx;
		}
	}

	this.warpToSelectedNodeIdx = function(idx)
	{
		if (self.getSelectedNodes().length > idx)
		{
			var node = self.getSelectedNodes()[idx];
			var nodeXScaled = -( node.x() * self.cachedScale ),
				nodeYScaled = -( node.y() * self.cachedScale ),
				winXCenter = $(window).width() / 2,
				winYCenter = $(window).height() / 2,
				nodeWidthShift = node.tempWidth * self.cachedScale / 2,
				nodeHeightShift = node.tempHeight * self.cachedScale / 2;

			self.transformOrigin[0] = nodeXScaled + winXCenter - nodeWidthShift;
			self.transformOrigin[1] = nodeYScaled + winYCenter - nodeHeightShift;
			self.translate(100);
			self.focusedNodeIdx = idx;
		}
	}

	this.warpToNodeXY = function(x, y)
	{
		//alert("warp to x, y: " + x + ", " + y);
		const nodeWidth = 100, nodeHeight = 100;
		var nodeXScaled = -( x * self.cachedScale ),
			nodeYScaled = -( y * self.cachedScale ),
			winXCenter = $(window).width() / 2,
			winYCenter = $(window).height() / 2,
			nodeWidthShift = nodeWidth * self.cachedScale / 2,
			nodeHeightShift = nodeHeight * self.cachedScale / 2;

		self.transformOrigin[0] = nodeXScaled + winXCenter - nodeWidthShift;
		self.transformOrigin[1] = nodeYScaled + winYCenter - nodeHeightShift;

		//alert("self.transformOrigin[0]: " + self.transformOrigin[0]);
		self.translate(100);
	}

	this.searchWarp = function()
	{
		// if search field is empty
		if (self.$searchField.val() == "")
		{
			// warp to the first node
			self.warpToNodeIdx(0);
		}
		else
		{
			var search = self.$searchField.val().toLowerCase();
			for (var i in self.nodes())
			{
				var node = self.nodes()[i];
				if (node.title().toLowerCase() == search)
				{
					self.warpToNodeIdx(i);
					return;
				}
			}
		}
	}

	this.clearSearch = function()
	{
		self.$searchField.val("");
		self.updateSearch();
	}
}
