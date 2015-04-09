var FILETYPE = { JSON: "json", XML: "xml", TWEE: "twee", UNKNOWN: "none" };

var data =
{
	editingPath: ko.observable(null),
	editingType: ko.observable(""),
	editingFolder: ko.observable(null),

	readFile: function(e, filename, clearNodes)
	{
		if (app.fs != undefined)
		{
			if (app.fs.readFile(filename, "utf-8", function(error, contents)
			{
				if (error)
				{

				}
				else
				{
					var type = data.getFileType(contents);
					if (type == FILETYPE.UNKNOWN)
						alert("Unknown filetype!");
					else
					{
						data.editingPath(filename);
						data.editingType(type);
						data.loadData(contents, type, clearNodes);
					}
				}
			}));
		}
		else if (window.File && window.FileReader && window.FileList && window.Blob && e.target && e.target.files && e.target.files.length > 0)
		{
			var reader  = new FileReader();
			reader.onloadend = function(e) 
			{
				if (e.srcElement && e.srcElement.result && e.srcElement.result.length > 0)
				{
					var contents = e.srcElement.result;
					var type = data.getFileType(contents);
					if (type == FILETYPE.UNKNOWN)
						alert("Unknown filetype!");
					else
						data.loadData(contents, type, clearNodes);
				}
			}
			reader.readAsBinaryString(e.target.files[0]);
		}
		else
		{
			alert("Unable to load file from your browser");
		}
	},

	openFile: function(e, filename)
	{
		data.readFile(e, filename, true);

		app.refreshWindowTitle(filename);
	},

	openFolder: function(e, foldername)
	{
		editingFolder = foldername;
		alert("openFolder not yet implemented e: " + e + " foldername: " + foldername);
	},

	appendFile: function(e, filename)
	{
		data.readFile(e, filename, false);
	},

	getFileType: function(content)
	{
		var clone = content;
		// is json?
		if (/^[\],:{}\s]*$/.test(clone.replace(/\\["\\\/bfnrtu]/g, '@').
			replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
			replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) 
			return FILETYPE.JSON;

		// is xml?
		var oParser = new DOMParser();
		var oDOM = oParser.parseFromString(content, "text/xml");
		if (oDOM.documentElement["outerText"] == undefined)
			return FILETYPE.XML;

		// is twee?
		//console.log(content.substr(0, 2));
		console.log(content.indexOf("::"));
		if (content.trim().substr(0, 2) == "::")
			return FILETYPE.TWEE;
		return FILETYPE.UNKNOWN;
	},

	loadData: function(content, type, clearNodes)
	{
		// clear all content
		if (clearNodes)
			app.nodes.removeAll();

		var objects = [];
		var i = 0;
		if (type == FILETYPE.JSON)
		{
			content = JSON.parse(content);
			for (i = 0; i < content.length; i ++)
				objects.push(content[i]);
		}
		else if (type == FILETYPE.TWEE)
		{
			var lines = content.split("\n");
			var obj = null;
			var index  = 0;
			for  (var i = 0; i < lines.length; i ++)
			{
				lines[i] = lines[i].trim();
				if (lines[i].substr(0, 2) == "::")
				{
					if (obj != null)
						objects.push(obj);

					obj = {};
					index ++;

					var title = "";
					var tags = "";

					// check if there are tags
					var openBracket = lines[i].indexOf("[");
					var closeBracket = lines[i].indexOf("]");
					if (openBracket > 0 && closeBracket > 0)
					{
						title = lines[i].substr(3, openBracket - 3);
						tags = lines[i].substr(openBracket + 1, closeBracket - openBracket - 1);
					}
					else
					{
						title = lines[i].substr(3);
					}

					obj.title = title;
					obj.tags = tags;
					obj.body = "";
					obj.position = { x: index * 80, y: index * 80 };
				}
				else if (obj != null)
				{
					if (obj.body.length > 0)
						lines[i] += '\n';
					obj.body += lines[i];
				}
			}

			if (obj != null)
				objects.push(obj);
		}
		else if (type == FILETYPE.XML)
		{
			var oParser = new DOMParser();
			var xml = oParser.parseFromString(content, "text/xml");
			content = Utils.xmlToObject(xml);

			if (content != undefined)
				for (i = 0; i < content.length; i ++)
					objects.push(content[i]);
		}

		for (var i = 0; i < objects.length; i ++)
		{
			var node = new Node();
			app.nodes.push(node);
			
			var object = objects[i]
			if (object.title != undefined)
				node.title(object.title);
			if (object.body != undefined)
				node.body(object.body);
			if (object.tags != undefined)
				node.tags(object.tags);
			if (object.position != undefined && object.position.x != undefined)
				node.x(object.position.x);
			if (object.position != undefined && object.position.y != undefined)
				node.y(object.position.y);
			if (object.colorID != undefined)
				node.colorID(object.colorID);
		}

		$(".arrows").css({ opacity: 0 }).transition({ opacity: 1 }, 500);
		app.updateNodeLinks();
	},

	getSaveData: function(type)
	{
		var output = "";
		var content = [];
		var nodes = app.nodes();

		for (var i = 0; i < nodes.length; i ++)
		{
			content.push({
				"title": nodes[i].title(), 
				"tags": nodes[i].tags(), 
				"body": nodes[i].body(),
				"position": { "x": nodes[i].x(), "y": nodes[i].y() },
				"colorID": nodes[i].colorID()
			});
		}

		if (type == FILETYPE.JSON)
		{
			output = JSON.stringify(content, null, "\t");
		}
		else if (type == FILETYPE.TWEE)
		{
			for (i = 0; i < content.length; i ++)
			{
				var tags = "";
				if (content[i].tags.length > 0)
					tags = " [" + content[i].tags + "]"
				output += ":: " + content[i].title + tags + "\n";
				output += content[i].body + "\n\n";
			}
		}
		else if (type == FILETYPE.XML)
		{
			output += '<nodes>\n';
			for (i = 0; i < content.length; i ++)
			{
				output += "\t<node>\n";
				output += "\t\t<title>" + content[i].title + "</title>\n";
				output += "\t\t<tags>" + content[i].tags + "</tags>\n";
				output += "\t\t<body>" + content[i].body + "</body>\n";
				output += '\t\t<position x="' + content[i].position.x + '" y="' + content[i].position.y + '"></position>\n';
				output += '\t\t<colorID>' + content[i].colorID + '</colorID>\n';
				output += "\t</node>\n";
			}
			output += '</nodes>\n';
		}

		return output;
	},

	saveTo: function(path, content)
	{
		if (app.fs != undefined)
		{
			app.fs.writeFile(path, content, {encoding: 'utf-8'}, function(err) 
			{
				data.editingPath(path);
				if(err)
					alert("Error Saving Data to " + path + ": " + err);
			});
		}
	},

	openFileDialog: function(dialog, callback)
	{
		dialog.bind("change", function(e)
		{
			// make callback
			callback(e, dialog.val());

			// replace input field with a new identical one, with the value cleared
			// (html can't edit file field values)
			var saveas = '';
			var accept = '';
			if (dialog.attr("nwsaveas") != undefined)
				saveas = 'nwsaveas="' + dialog.attr("nwsaveas") + '"'
			if (dialog.attr("accept") != undefined)
				saveas = 'accept="' + dialog.attr("accept") + '"'

			dialog.parent().append('<input type="file" id="' + dialog.attr("id") + '" ' + accept + ' ' + saveas + '>');
			dialog.unbind("change");
			dialog.remove();
		});

		dialog.trigger("click");
	},

	saveFileDialog: function(dialog, type, content)
	{
        var file = 'file.' + type;

        if (app.fs)
		{
			dialog.attr("nwsaveas", file);
			data.openFileDialog(dialog, function(e, path)
			{
				data.saveTo(path, content);
			});
		}
		else
		{
            switch(type) {
                case 'json':
                    content = "data:text/json," + content;
                    break;
                case 'xml':
                    content = "data:text/xml," + content;
                    break;
                default:
                    content = "data:text/plain," + content;
                    break;
            }
            window.open(content, "_blank");
		}
	},

	tryOpenFile: function()
	{
		data.openFileDialog($('#open-file'), data.openFile);
	},

	tryOpenFolder: function()
	{
		data.openFileDialog($('#open-folder'), data.openFolder);
	},

	tryAppend: function()
	{
		data.openFileDialog($('#open-file'), data.appendFile);
	},

	trySave: function(type)
	{
		data.editingType(type);
		data.saveFileDialog($('#save-file'), type, data.getSaveData(type));
	},

	trySaveCurrent: function()
	{
		if (data.editingPath().length > 0 && data.editingType().length > 0)
		{
			data.saveTo(data.editingPath(), data.getSaveData(data.editingType()));
		}
	}

}
