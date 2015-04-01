var Utils = 
{
	pushToTop: function(element)
	{
		var current = element.css("z-index");
		if (current == "auto") current = 0;

		var highZ = parseInt(current);
		var above = true;
		element.parent().children().each(function()
		{
			var otherCurrent = $(this).css("z-index");
			if (otherCurrent == "auto") otherCurrent = 0;
			var other = parseInt(otherCurrent);

			if (this != element[0])
			{
				if (other >= highZ)
				{
					highZ = other;
					above = false;
				}
			}
		});
		if (!above)
			element.css("z-index", highZ + 1);
	},

	stripHtml: function(html)
	{
		while (html.indexOf("<") >= 0)
			html = html.replace("<", "&lt;");
		while (html.indexOf(">") >= 0)
			html = html.replace(">", "&gt");
		return html;
	},

	// Changes XML to Object
	// todo: Replace with jQuery parseHTML to find values?
	xmlToObject: function(xml) 
	{
		// Create the return object
		var nodes = [];

		xml = xml.childNodes.item(0);
		if (xml.hasChildNodes())
		{
			for (var i = 0; i < xml.childNodes.length; i ++)
			{
				var node = xml.childNodes.item(i);
				if (node.hasChildNodes())
				{
					var obj = {};
					var found = false;
					for (var j = 0; j < node.childNodes.length; j ++)
					{
						var subitem = node.childNodes.item(j);
						if (subitem.nodeName != "#text")
						{
							found = true;
							if (subitem.hasChildNodes())
								obj[subitem.nodeName] = subitem.childNodes.item(0).nodeValue;
							else
								obj[subitem.nodeName] = "";

							if (subitem.attributes.length > 0)
							{
								obj[subitem.nodeName] = {};
								for (var k = 0; k < subitem.attributes.length; k ++)
								{
									var attribute = subitem.attributes.item(k);
									obj[subitem.nodeName][attribute.nodeName] = attribute.nodeValue;
								}
							}
						}
					}
					if (found)
						nodes.push(obj);
				}
			}
		}
		console.log(nodes);

		return nodes;
	}
}
