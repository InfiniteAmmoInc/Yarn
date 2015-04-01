var App = function(name, version)
{
	var self = this;

	// self
	this.instance = this;
	this.name = ko.observable(name);
	this.version = ko.observable(version);
	this.editing = ko.observable(null);
	this.deleting = ko.observable(null);
	this.nodes = ko.observableArray([]);
	this.cachedScale = 1;
	this.canvas;
	this.context;
	this.editingHistory = [];
	this.appleCmdKey = false;
	this.editingSaveHistoryTimeout = null;
	this.dirty = false;
	//this.editingPath = ko.observable(null);


	// node-webkit
	if (typeof(require) == "function")
	{
		this.gui = require('nw.gui');
		this.fs = require('fs');
	}

	this.run = function()
	{
		$("#app").show();
		ko.applyBindings(self, $("#app")[0]);

		self.canvas = $(".arrows")[0];
		self.context = self.canvas.getContext('2d');
		self.newNode().title("Start");

		// search field enter
		$(".search-field").on("keydown", function (e)
			{
				// enter
				if (e.keyCode == 13)
					self.searchZoom();

				// escape
				if (e.keyCode == 27)
					self.clearSearch();
			});

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
		setInterval(function() { self.updateArrows(); }, 16);

		// drag node holder around
		(function()
		{
			var dragging = false;
			var offset = { x: 0, y: 0 };

			$(".nodes").on("mousedown", function(e)
			{
				dragging = true;
				offset.x = e.pageX;
				offset.y = e.pageY;
			});

			$(".nodes").on("mousemove", function(e)
			{
				if (dragging)
				{
					var nodes = self.nodes();
					for (var i in nodes)
					{
						nodes[i].x(nodes[i].x() + (e.pageX - offset.x) / self.cachedScale);
						nodes[i].y(nodes[i].y() + (e.pageY - offset.y) / self.cachedScale);
					}
					offset.x = e.pageX;
					offset.y = e.pageY;
				}
			});

			$(".nodes").on("mouseup", function(e)
			{
				dragging = false;
			});
		})();

		// search field
		$(".search-field").on('input', self.updateSearch);
		$(".search-title input").click(self.updateSearch);
		$(".search-body input").click(self.updateSearch);
		$(".search-tags input").click(self.updateSearch);

		/*
		// using on
		$('.nodes').on('mousewheel', function(event) {
			self.cachedScale += event.deltaY * .001;
			$(".nodes-holder").transition({ scale: self.cachedScale }, 0);
		    //console.log(event.deltaX, event.deltaY, event.deltaFactor);
		});
*/

		// using the event helper
		$('.nodes').mousewheel(function(event) {
			self.cachedScale += event.deltaY * .001 * self.cachedScale;

			$(".nodes-holder").css({ transformOrigin: ""+$(window).width()/2+"px "+$(window).height()/2+"px" });
			if (self.cachedScale > 1)
				self.cachedScale = 1;
			if (self.cachedScale < .25)
				self.cachedScale = .25;
			$(".nodes-holder").transition({ scale: self.cachedScale }, 0);
		    //console.log(event.deltaX, event.deltaY, event.deltaFactor);
		});

		// apple command key
		$(window).on('keydown', function(e) { if (e.keyCode == 91 || e.keyCode == 93) { self.appleCmdKey = true; } });
		$(window).on('keyup', function(e) { if (e.keyCode == 91 || e.keyCode == 93) { self.appleCmdKey = false; } });
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
		// Get the current window
		var win = gui.Window.get();

		win.title = "Yarn - [" + editingPath + "] ";// + (self.dirty?"*":"");
	}

	this.newNode = function(updateArrows)
	{
		var node = new Node();
		self.nodes.push(node);
		if (updateArrows == undefined || updateArrows == true)
			self.updateNodeLinks();
		return node;
	}

	this.removeNode = function(node)
	{
		var index = self.nodes.indexOf(node);
		if  (index >= 0)
		{
			self.nodes.splice(index, 1);
			delete node;
		}
		self.updateNodeLinks();
	}

	this.editNode = function(node)
	{
		if (node.active())
		{
			self.editing(node);
			self.editingHistory = [{text: node.body(), start: node.body().length, end: node.body().length}];

			$(".node-editor").css({ opacity: 0 }).transition({ opacity: 1 }, 250);
			$(".node-editor .form").css({ y: "-100" }).transition({ y: "0" }, 250);
			$(".editor").html(self.getHighlightedText(node.body()));
			$(".editor").on("keyup", function(e) { self.updateHighlights(e); });
			$(".editor").on("keydown", function(e) { if (e.keyCode == 9 || ((e.ctrlKey || e.metaKey) && e.keyCode == 90)) { e.preventDefault(); } });
			$(".editor").on("cut copy paste",function(e) { e.preventDefault(); });
			self.updateLineNumbers(node.body());
		}
	}

	this.trim = function(x)
	{
    	return x.replace(/^\s+|\s+$/gm,'');
	}

	this.saveNode = function()
	{
		if (self.editing() != null)
		{
			self.editing().body($(".editor")[0].innerText);
			self.updateNodeLinks();

			self.editing().title(self.trim(self.editing().title()));

			$(".node-editor").transition({ opacity: 0 }, 250);
			$(".node-editor .form").transition({ y: "-100" }, 250, function()
			{
				self.editing(null);
			});

			setTimeout(self.updateSearch, 100);
		}
	}

	this.updateSearch = function()
	{
		var search = $(".search-field").val().toLowerCase();
		var title = $(".search-title input").is(':checked');
		var body = $(".search-body input").is(':checked');
		var tags = $(".search-tags input").is(':checked');

		var on = 1;
		var off = 0.25;

		for (var i = 0; i < app.nodes().length; i ++)
		{
			var node = app.nodes()[i];
			var element = $(node.element);

			if (search.length > 0 && (title || body || tags))
			{
				var matchTitle = (title && node.title().toLowerCase().indexOf(search) >= 0);
				var matchBody = (body && node.body().toLowerCase().indexOf(search) >= 0);
				var matchTags = (tags && node.tags().toLowerCase().indexOf(search) >= 0);

				if (matchTitle || matchBody || matchTags)
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

		var scale = $(".nodes-holder").css("scale");
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

					self.context.strokeStyle = "rgba(0, 0, 0, " + (node.tempOpacity * 0.6) + ")";
					self.context.fillStyle = "rgba(0, 0, 0, " + (node.tempOpacity * 0.6) + ")";

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
		editor[0].innerHTML = self.getHighlightedText(text);

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
		const duration = 200;

		$(".nodes-holder").css({ transformOrigin: ""+$(window).width()/2+"px "+$(window).height()/2+"px" });

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
		$(".nodes-holder").transition({ scale: self.cachedScale }, duration);
	}

	this.arrangeGrid = function()
	{
		for (var i in self.nodes())
		{
			var node = self.nodes()[i];
			var y = Math.floor(i / 10);
			var x = i - (y*10);
			var spacing = 250;
			node.moveTo(x * spacing, y * spacing);
		}
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

	this.searchZoom = function()
	{
		var search = $(".search-field").val().toLowerCase();
		for (var i in self.nodes())
		{
			var node = self.nodes()[i];
			if (node.title().toLowerCase() == search)
			{
				var centerX = $(window).width()/2;
				var centerY = $(window).height()/2;
				self.moveNodes(centerX - node.x() - node.tempWidth/2, centerY - node.y() - node.tempHeight/2);
				break;
			}
		}
	}

	this.clearSearch = function()
	{
		$(".search-field").val("");
		self.updateSearch();
	}
}