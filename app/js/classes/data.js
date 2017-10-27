var FILETYPE = { JSON: "json", XML: "xml", TWEE: "twee", TWEE2: "tw2", UNKNOWN: "none", YARNTEXT: "yarn.txt" };

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
					var type = data.getFileType(filename);
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
		// else
		// {
		// 	alert("Unable to load file from your browser");
		// }
		else if (window.File && window.FileReader && window.FileList && window.Blob && e.target && e.target.files && e.target.files.length > 0)
		{
			var reader  = new FileReader();
			reader.onloadend = function(e)
			{
				if (e.srcElement && e.srcElement.result && e.srcElement.result.length > 0)
				{
					var contents = e.srcElement.result;
					var type = data.getFileType(contents);
					// alert("type(2): " + type);
					if (type == FILETYPE.UNKNOWN)
					alert("Unknown filetype!");
					else
					data.loadData(contents, type, clearNodes);
				}
			}
			reader.readAsText(e.target.files[0], "UTF-8");
		}
	},

	openFile: function(e, filename)
	{
		data.readFile(e, filename, true);

		// app.refreshWindowTitle(filename);
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

	getFileType: function(filename)
	{
		var clone = filename;

		// if (filename.toLowerCase().indexOf(".json") > -1)
		// 	return FILETYPE.JSON;
		// else if (filename.toLowerCase().indexOf(".yarn.txt") > -1)
		// 	return FILETYPE.YARNTEXT;
		// else if (filename.toLowerCase().indexOf(".xml") > -1)
		// 	return FILETYPE.XML;
		// else if (filename.toLowerCase().indexOf(".txt") > -1)
		// 	return FILETYPE.TWEE;
		//     else if (filename.toLowerCase().indexOf(".tw2") > -1)
		//         return FILETYPE.TWEE2;
		// return FILETYPE.UNKNOWN;

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

		app.globalRootNodeIndexes = ko.observableArray([ko.observable("0 r")]);
		app.globalChildNodeIndexes =  ko.observableArray([ko.observable("0 c")]);
		app.globalFallbackNodeIndexes =  ko.observableArray([ko.observable("0 f")]);

		//Initialize the nodes infromations
		var root_nodes = [];
		var fallback_nodes = [];
		var child_nodes = [];
		var i = 0;
		if (type == FILETYPE.JSON)
		{
			content = JSON.parse(content);

			for (let i = 0; i < content.root_nodes.length; i++) {
				root_nodes.push(content.root_nodes[i])
			}
			for (let i = 0; i < content.child_nodes.length; i++) {
				child_nodes.push(content.child_nodes[i])
			}
			for (let i = 0; i < content.fallback_nodes.length; i++) {
				fallback_nodes.push(content.fallback_nodes[i])
			}
		}

		// else if (type == FILETYPE.XML)
		// {
		// 	var oParser = new DOMParser();
		// 	var xml = oParser.parseFromString(content, "text/xml");
		// 	content = Utils.xmlToObject(xml);
		//
		// 	if (content != undefined)
		// 		for (i = 0; i < content.length; i ++)
		// 			objects.push(content[i]);
		// }

		var avgX = 0, avgY = 0;
		var numAvg = 0;

		// Allow to rewrite node information from the JSON once created, node is the
		// node just created and object is the array containing the informations
		function addNodeFromJSON(node, object)
		{
			if (object.title != undefined)
			node.title(object.title);
			if (object.id != undefined)
			node.index(object.id);
			if (object.id[object.id.length -1] == ' r') {
				app.globalRootNodeIndexes.splice(-1,1);
				app.globalRootNodeIndexes.push(node.index())
			}
			if (object.id[object.id.length -1] == ' c') {
				app.globalChildNodeIndexes.splice(-1,1);
				app.globalChildNodeIndexes.push(node.index())
			}
			if (object.id[object.id.length -1] == ' f') {
				app.globalFallbackNodeIndexes.splice(-1,1);
				app.globalFallbackNodeIndexes.push(node.index())
			}
			if (object.uuid != undefined)
			node.uuid = object.uuid;
			if (object.output != undefined)
			for (var i = 0; i < object.output.length; i++) {
				if (object.output[i].type == 0) {
					node.body.push({'id': ko.observable(object.output[i].content)});
				}
				if (object.output[i].type == 2) {
					node.body.push({'id': ko.observable(object.output[i].content.text)});
					for (var j = 0; j < object.output[i].content.quick_replies.length; j++) {
						if (object.output[i].content.quick_replies[j].title != "") {
							node.quickreplies.push({'id': ko.observable(object.output[i].content.quick_replies[j].title)});
						}
					}
				}
			}
			if (object.conditions != undefined) {
				//TODO Add conditions from JSON
				var conditions = object.conditions;
				let j = 0;

				// For every set of conditions
				for (var i = 0; i < conditions.length; i++) {
					if (conditions[i].intent != ' ') {
						node.conditions()[j].content('#'+conditions[i].intent);
						node.conditions()[j].op("And");
						node.conditions.push({content: ko.observable(""), op: ko.observable("")});
						j++;
					}
					for (var k = 0; k < conditions[i].entities.length; k++) {
						node.conditions()[j].content('@'+conditions[i].entities[k]);
						node.conditions()[j].op("And");
						node.conditions.push({content: ko.observable(""), op: ko.observable("")});
						j++;
					}
					for (var l = 0; l < conditions[i].contexts.length; l++) {
						node.conditions()[j].content('${'+conditions[i].contexts[l]+'}');
						node.conditions()[j].op("And");
						node.conditions.push({content: ko.observable(""), op: ko.observable("")});
						j++;
					}

					var not_empty = conditions[i].intent != ' '
												||conditions[i].entities.length > 0
												||conditions[i].entities.length > 0;

					if (not_empty && i < conditions.length - 1) {
						node.conditions()[j - 1].op("Or");
					}
					not_empty = false;
				}
			}
			if (object.position != undefined && object.position.x != undefined)
			{
				node.x(object.position.x);
				avgX += object.position.x;
				numAvg ++;
			}
			if (object.position != undefined && object.position.y != undefined)
			{
				node.y(object.position.y);
				avgY += object.position.y;
			}
			if (object.colorID != undefined)
			node.colorID(object.colorID);
		};

		var new_node = [];
		var child_node_index = [];
		var fallback_node_index = [];
		var node_infos = [];

		// Recursive fonction creating all the nodes
		function AddAllNodes(nodeType)
		{
			// Make an array of the indexes of the nodes already created
			var result = app.nodes().map(function(a) {return a.index();});
			// Return the index of the node to add in the nodes already created (-1 if not existant)
			var index = result.indexOf(node_infos[node_infos.length -1].id);

			// If the node already exist:
			if (index >= 0) {
				// If it's a fallback node, add it to the current node
				if (result[index][result[index].length -1] === 'f') {
					app.getSelectedNodes()[0].fallback(app.nodes()[index]);
					app.nodes()[index].parents.push(app.getSelectedNodes()[0]);
				}
				else {
					app.getSelectedNodes()[0].childs.push(app.nodes()[index]);
					app.nodes()[index].parents.push(app.getSelectedNodes()[0]);
				}
				node_infos.splice(-1,1);
				app.deselectAllNodes();
				app.updateNodeLinks();

				if (new_node.length > 0) {
					app.addNodeSelected(new_node[new_node.length -1]);
				}

				return;
			}
			else {
				if (nodeType == "root") {
					new_node.push(app.newRootNode());
				}
				if (nodeType == "child") {
					new_node.push(app.newChildNode(undefined, true));
				}
				if (nodeType == "fallback") {
					new_node.push(app.newFallbackNode());
				}
				addNodeFromJSON(new_node[new_node.length -1], node_infos[node_infos.length -1]);

				app.deselectAllNodes();
				app.addNodeSelected(new_node[new_node.length -1]);

				while (node_infos[node_infos.length -1].childs.length > 0) {
					child_node_index.push(parseInt(node_infos[node_infos.length -1].childs[node_infos[node_infos.length -1].childs.length - 1]));
					node_infos.push(child_nodes[child_node_index[child_node_index.length -1]]);
					arguments.callee("child"); //Calls the fonction recursivly as long as the current node as childs
					child_node_index.splice(-1,1);;
					node_infos[node_infos.length -1].childs.splice(-1,1);
				};

				if (node_infos[node_infos.length -1].fallback) {
					fallback_node_index.push(parseInt(node_infos[node_infos.length -1].fallback));
					node_infos.push(fallback_nodes[fallback_node_index[fallback_node_index.length -1]]);
					arguments.callee("fallback");
					fallback_node_index.splice(-1,1);
					node_infos[node_infos.length -1].fallback = null;
				};

				node_infos.splice(-1,1);
				new_node.splice(-1,1);
				app.deselectAllNodes();

				if (new_node.length > 0) {
					app.addNodeSelected(new_node[new_node.length -1]);
				}

				return;
			}
		}

		for (var i = 0; i < root_nodes.length; i ++)
		{
			node_infos.push(root_nodes[i]);
			AddAllNodes("root");
			app.nodes.sort(function(left,right){
				let left_type = left.index()[left.index().length -1];
				let right_type = right.index()[right.index().length -1];
				if (left_type == 'c' && right_type == 'r' || left_type == 'f' && right_type == 'r' || left_type == 'f' && right_type == 'c') {
					return 0;
				}
				else if (left_type == 'r' && right_type == 'c' || left_type == 'r' && right_type == 'f' || left_type == 'c' && right_type == 'f') {
					return -1;
				}
				else {
					let left_index = parseInt(left.index());
					let right_index = parseInt(right.index());
					if (left_index < right_index) {
						return -1;
					}
					else {
						return 0;
					}
				}
			});
			app.globalRootNodeIndexes.sort(function(left, right) {
				left_num = parseInt(left());
				right_num = parseInt(right());
				return left_num == right_num ? 0 : (left_num < right_num ? -1 : 1)});
				app.globalChildNodeIndexes.sort(function(left, right) {
					left_num = parseInt(left());
					right_num = parseInt(right());
					return left_num == right_num ? 0 : (left_num < right_num ? -1 : 1)});
					app.globalFallbackNodeIndexes.sort(function(left, right) {
						left_num = parseInt(left());
						right_num = parseInt(right());
						return left_num == right_num ? 0 : (left_num < right_num ? -1 : 1)});
					}

					if (numAvg > 0)
					{
						app.warpToNodeXY(avgX/numAvg, avgY/numAvg);
					}

					$(".arrows").css({ opacity: 0 }).transition({ opacity: 1 }, 500);
					app.updateNodeLinks();
				},



				filterNodeData: function(node)
				{
					var content = [];
					var output = [];
					var parent_nodes = [];
					var childs_indexes = [];
					var body = [];
					var quickreplies = [];
					var conditions = [];
					var entities = [];
					var contexts = [];
					var fallback_index = "";
					var intent = " ";

					for (let i = 0; i < node.body().length; i++) {
						body.push(node.body()[i].id());
					}

					for (let i = 0; i <body.length; i++) {
						output.push({"type":"0", "content": body[i]});
					}

					for (let i = 0; i < node.quickreplies().length; i++) {
						quickreplies.push(node.quickreplies()[i].id());
					}

					if (quickreplies.length > 0) {
						var qr = [];
						for (let i = 0; i < quickreplies.length; i++) {
							qr.push({
								"content_type": "text",
								"title": quickreplies[i],
								"payload": quickreplies[i]
							});
						}

						var text = "";

						if (output.length > 0) {
							var last_output = output.splice(-1,1);
							text = last_output[0].content;
						}
						else {
							alert("You cannot have a quick reply without a text before");
							return;
						}


						output.push({
							"type": "2",
							"content": {
								"text": text,
								"quick_replies": qr
							}
						});
					}

					for (let i = 0; i < node.parents().length; i++) {
						parent_nodes.push(node.parents()[i].index());
					}

					for (let i = 0; i < node.childs().length; i++) {
						childs_indexes.push(node.childs()[i].index());
					}

					if (node.fallback() != "") {
						fallback_index = node.fallback().index();
					}

					for (let i = 0; i < node.conditions().length; i++) {
						if (node.conditions()[i].op() == "And") {
							if (node.conditions()[i].content()[0] == '#') {
								var intent = node.conditions()[i].content().slice(1);
							}
							else if (node.conditions()[i].content()[0] == '@') {
								entities.push(node.conditions()[i].content().slice(1));
							}
							else if (node.conditions()[i].content()[0] == '$') {
								if (node.conditions()[i].content()[1] != '{' || node.conditions()[i].content()[node.conditions()[i].content().length -1] != '}') {
									alert("One of the context condition for node " + node.index() + " don't follow the bracket convention {}");
								}
								else {
									contexts.push(node.conditions()[i].content().slice(2,-1));
								}
							}
						}
						if (node.conditions()[i].op() == "Or"  && node.conditions()[i+1] != undefined || i == node.conditions().length - 1) {
							if (node.conditions()[i].content()[0] == '#') {
								var intent = node.conditions()[i].content().slice(1);
							}
							else if (node.conditions()[i].content()[0] == '@') {
								entities.push(node.conditions()[i].content().slice(1));
							}
							else if (node.conditions()[i].content()[0] == '$') {
								if (node.conditions()[i].content()[1] != '{' || node.conditions()[i].content()[node.conditions()[i].content().length -1] != '}') {
									alert("One of the context condition for node " + node.index() + " don't follow the bracket convention {}");
								}
								else {
									contexts.push(node.conditions()[i].content().slice(2,-1));
								}
							}
							conditions.push({intent:intent, entities:entities, contexts:contexts});
							entities = [];
							contexts = [];
						}
					}

					content.push({
						"id": node.index(),
						"uuid": node.uuid,
						"title": node.title(),
						"conditions": conditions,
						"parent_node": parent_nodes,
						"childs": childs_indexes,
						"fallback": fallback_index,
						"output": output,
						"position": { "x": node.x(), "y": node.y() },
						"colorID": node.colorID()
					});
					return content;
				},

				getSaveData: function(type)
				{
					var output = "";
					var nodes = app.nodes();
					var content = {
						root_nodes: [],
						child_nodes: [],
						fallback_nodes: []
					};

					for (var i = 0; i < nodes.length; i++) {
						var node = nodes[i];

						// If node is a root node
						if (node.index()[node.index().length -1] == "r") {
							let nodedata = data.filterNodeData(node);
							content.root_nodes.push(nodedata[0]);
						}
						// If node is a child node
						if (node.index()[node.index().length -1] == "c") {
							let nodedata = data.filterNodeData(node);
							content.child_nodes.push(nodedata[0]);
						}
						if (node.index()[node.index().length -1] == "f") {
							let nodedata = data.filterNodeData(node);
							content.fallback_nodes.push(nodedata[0]);
						}
					};

					if (type == FILETYPE.JSON)
					{
						output = JSON.stringify(content, null, "\t");
					}
					else if (type == FILETYPE.XML)
					{
						output += '<nodes>\n';
						for (i = 0; i < content.length; i ++)
						{
							output += "\t<node>\n";
							output += "\t\t<title>" + content[i].title + "</title>\n";
							output += "\t\t<quickreplies>" + content[i].quickreplies + "</quickreplies>\n";
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
							// app.refreshWindowTitle(path);
						});
					}
					else
					{
						switch(type) {
							case 'json':
							// content = "data:text/json," + content;
							var blob = new Blob([content], {type: "application/json"});
							var url  = URL.createObjectURL(blob);
							var a = document.createElement('a');
							a.download    = "dialog.json";
							a.href        = url;
							a.click();
							break;
							case 'xml':
							content = "data:text/xml," + content;
							break;
							default:
							content = "data:text/plain," + content;
							break;
						}
						// window.open(content, "_blank");
					}
				},

				tryOpenFile: function()
				{
					app.deselectAllNodes();
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
