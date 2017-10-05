var globalRootNodeIndex = 0;
var globalChildNodeIndex = 0;
var globalFallbackNodeIndex = 0;
const NodeExpandWidth = 300;
const NodeExpandHeight = 150;
const ClipNodeTextLength = 1024;

var Node = function(NodeType, userInput)
{
	var self = this;

	// primary values
	if (NodeType == "child") {
		// this.index = ko.observable(globalChildNodeIndex++ + ' c');
		this.index = globalChildNodeIndex++ + ' c';
		this.colorID = ko.observable(1);
	}
	if (NodeType == "root" || NodeType == undefined ) {
		// this.index = ko.observable(globalRootNodeIndex++ + ' r');
		this.index = globalRootNodeIndex++ + ' r';
		this.colorID = ko.observable(1);
	}
	if (NodeType == "fallback") {
		// this.index = ko.observable(globalFallbackNodeIndex++ + ' f');
		this.index = globalFallbackNodeIndex++ + ' f';
		this.colorID = ko.observable(3);
	}

	if (userInput != undefined ) {
		if (typeof(userInput) == "string") {
			this.title = ko.observable(userInput);
		}
		if (typeof(userInput) == "function") {
			this.title = userInput;
		}
	}
	else {
		console.log(userInput);
		console.log(this.index);
		this.title = ko.observable("Node " + this.index);
	}

	this.quickreplies = ko.observableArray();
	this.body = ko.observableArray();
	//this.x = ko.observable(128);
	//this.y = ko.observable(128);
	this.active = ko.observable(true);
	this.tempWidth;
	this.tempHeight;
	this.tempOpacity;
	this.style;
	// this.colorID = ko.observable(0);
	this.checked = false;
	this.selected = false;
	this.childs = [];
	this.fallback = "";

	// clipped values for display
	this.clippedQuickReplies = ko.computed(function()
	{
		var quickreplies = this.quickreplies();
		// var quickreplies = unfiltered_quickreplies.filter(function(word){return word != ""});
		var output = "";
		if (this.quickreplies().length > 0)
		{
			for (var i = 0; i < quickreplies.length; i ++) {
				output += '<span>' + quickreplies[i].id() + '</span>';}
		}
        return output;
    }, this);



	this.clippedBody = ko.computed(function()
	{
		// var result = app.getHighlightedText(this.body());
		// while (result.indexOf("\n") >= 0)
		// 	result = result.replace("\n", "<br />");
		// while (result.indexOf("\r") >= 0)
		// 	result = result.replace("\r", "<br />");
		// result = result.substr(0, ClipNodeTextLength);
    //     return result;
		var result ="";
		var body = this.body();
		for (var i = 0; i < body.length; i++) {
			result = result + body[i].id() + "<br />";
		}
		return result;
    }, this);

	// internal cache
	this.linkedTo = ko.observableArray();
	this.linkedFrom = ko.observableArray();

	// reference to element containing us
	this.element = null;

	this.canDoubleClick = true;

	this.create = function()
	{
		Utils.pushToTop($(self.element));
		self.style = window.getComputedStyle($(self.element).get(0));

		var parent = $(self.element).parent();
		self.x(-parent.offset().left + $(window).width() / 2 - 100);
		self.y(-parent.offset().top + $(window).height() / 2 - 100);


		var updateArrowsInterval = setInterval(app.updateArrowsThrottled, 16);

		$(self.element)
			.css({opacity: 0, scale: 0.8, y: "-=80px", rotate: "45deg"})
			.transition(
				{
					opacity: 1,
					scale: 1,
					y: "+=80px",
					rotate: "0deg"
				},
				250,
				"easeInQuad",
				function() {
					clearInterval(updateArrowsInterval);
					app.updateArrowsThrottled();
				}
			);
		self.drag();

		$(self.element).on("dblclick", function()
		{
			if (self.canDoubleClick)
				app.editNode(self);
		});

		$(self.element).on("click", function(e)
		{
			if(e.ctrlKey)
			{
				if(self.selected)
					app.removeNodeSelection(self);
				else
					app.addNodeSelected(self);
					self.setSelected(true);
			}
			else {
				if(self.selected)
					app.removeNodeSelection(self);
				else
					app.deselectAllNodes();
					self.setSelected(true);
					app.addNodeSelected(self);
			}
		});
	}

	this.setSelected = function(select)
	{
		self.selected = select;

		if(self.selected)
			$(self.element).css({border: "1px solid #49eff1"});
		else
			$(self.element).css({border: "none"});

	}

	this.toggleSelected = function()
	{
		self.setSelected(!self.selected);
	}

	this.x = function(inX)
	{
		if (inX != undefined)
			$(self.element).css({x:Math.floor(inX)});
		return Math.floor((new WebKitCSSMatrix(self.style.webkitTransform)).m41);
	}

	this.y = function(inY)
	{
		if (inY != undefined)
			$(self.element).css({y:Math.floor(inY)});
		return Math.floor((new WebKitCSSMatrix(self.style.webkitTransform)).m42);
	}

	this.resetDoubleClick = function()
	{
		self.canDoubleClick = true;
	}

	this.tryRemove = function()
	{
		if (self.active())
			app.deleting(this);

		setTimeout(self.resetDoubleClick, 500);
		self.canDoubleClick = false;
	}

	this.cycleColorDown = function()
	{
		self.doCycleColorDown();

		setTimeout(self.resetDoubleClick, 500);
		self.canDoubleClick = false;

		if (app.shifted)
			app.matchConnectedColorID(self);

		if(self.selected)
			app.setSelectedColors(self);
	}

	this.cycleColorUp = function()
	{
		self.doCycleColorUp();

		setTimeout(self.resetDoubleClick, 500);
		self.canDoubleClick = false;

		if (app.shifted)
			app.matchConnectedColorID(self);

		if(self.selected)
			app.setSelectedColors(self);
	}

	this.doCycleColorDown = function()
	{
		self.colorID(self.colorID() - 1);
		if (self.colorID() < 0)
			self.colorID(6);
	}

	this.doCycleColorUp = function()
	{
		self.colorID(self.colorID() + 1);
		if (self.colorID() > 6)
			self.colorID(0);
	}

	this.remove = function()
	{
		$(self.element).transition({opacity: 0, scale: 0.8, y: "-=80px", rotate: "-45deg"}, 250, "easeInQuad", function()
		{
			app.removeNode(self);
			app.updateArrowsThrottled();
		});
		app.deleting(null);
	}

	this.drag = function()
	{
		var dragging = false;
		var groupDragging = false;

		var offset = [0, 0];
		var moved = false;

		$(document.body).on("mousemove", function(e)
		{
			if (dragging)
			{
				var parent = $(self.element).parent();
				var newX = (e.pageX / self.getScale() - offset[0]);
				var newY = (e.pageY / self.getScale() - offset[1]);
				var movedX = newX - self.x();
				var movedY = newY - self.y();

				moved = true;
				self.x(newX);
				self.y(newY);

				if (groupDragging)
				{
					var nodes = [];
					if(self.selected)
					{
						nodes = app.getSelectedNodes();
						nodes.splice(nodes.indexOf(self), 1);
					}
					else
					{
						nodes = app.getNodesConnectedTo(self);
					}

					if (nodes.length > 0)
					{
						for (var i in nodes)
						{
							nodes[i].x(nodes[i].x() + movedX);
							nodes[i].y(nodes[i].y() + movedY);
						}
					}
				}


				//app.refresh();
				app.updateArrowsThrottled();
			}
		});

		$(self.element).on("mousedown", function (e)
		{
			if (!dragging && self.active())
			{
				var parent = $(self.element).parent();

				dragging = true;

				if (app.shifted || self.selected)
				{
					groupDragging = true;
				}

				offset[0] = (e.pageX / self.getScale() - self.x());
				offset[1] = (e.pageY / self.getScale() - self.y());
			}
		});

		$(self.element).on("mousedown", function(e)
		{
			e.stopPropagation();
		});

		$(self.element).on("mouseup", function (e)
		{
			//alert("" + e.target.nodeName);
			if (!moved)
				app.mouseUpOnNodeNotMoved();

			moved = false;
		});

		$(document.body).on("mouseup", function (e)
		{
			dragging = false;
			groupDragging = false;
			moved = false;

			app.updateArrowsThrottled();
		});
	}

	this.moveTo = function(newX, newY)
	{
		$(self.element).clearQueue();
		$(self.element).transition(
			{
				x: newX,
				y: newY
			},
			app.updateArrowsThrottled,
			500
		);
	}

	this.isConnectedTo = function(otherNode, checkBack)
	{
		if (checkBack && otherNode.isConnectedTo(self, false))
			return true;

		var linkedNodes = self.linkedTo();
		for (var i in linkedNodes)
		{
			if (linkedNodes[i] == otherNode)
				return true;
			if (linkedNodes[i].isConnectedTo(otherNode, false))
				return true;
			if (otherNode.isConnectedTo(linkedNodes[i], false))
				return true;
		}

		return false;
	}

	this.updateLinks = function()
	{
		self.resetDoubleClick();
		// clear existing links
		self.linkedTo.removeAll();

		var links = [];

		// find all the links
		for (var i = 0; i < self.childs.length; i++) {
			links.push(self.childs[i].index)
		}

		if (self.fallback != undefined && self.fallback != "") {
			links.push(self.fallback.index);
		}


		if (links != undefined)
		{
			var exists = {};
			for (var i = links.length - 1; i >= 0; i --)
			{
				links[i] = links[i].toLowerCase();

				// if (exists[links[i]] != undefined)
				// 	links.splice(i, 1);

				exists[links[i]] = true;
			}

			// update links
			for (var index in app.nodes())
			{
				var other = app.nodes()[index];
				for (var i = 0; i < links.length; i ++)
					if (other != self && other.index.toLowerCase() == links[i])
						self.linkedTo.push(other);
			}
		}
	}

	this.getScale = function() {
		if (app && typeof app.cachedScale === 'number') {
			return app.cachedScale;
		} else {
			return 1;
		}
	}
}

ko.bindingHandlers.nodeBind =
{
	init: function(element, valueAccessor, allBindings, viewModel, bindingContext)
	{
		bindingContext.$rawData.element = element;
		bindingContext.$rawData.create();
	},

	update: function(element, valueAccessor, allBindings, viewModel, bindingContext)
	{
		$(element).on("mousedown", function() { Utils.pushToTop($(element)); });
	}
};
