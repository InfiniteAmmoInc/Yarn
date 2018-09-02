const bondage = require('bondage');
const bbcode = require('bbcode');
const yarnRunner = new bondage.Runner();
const EventEmitter = require('events').EventEmitter
	
var yarnRender = function() {
	this.self = this;
	this.vnChoiceSelectionCursor = ">";
	this.startTimeWait;
	this.vnSelectedChoice = -1;
	this.vnTextScrollInterval;
	this.finished = null;
	this.commandsPassedLog = [];
	this.commandPassed = "";
	this.emiter = new EventEmitter();
	this.node = {}; //gets raw data from yarn text nodes

	this.storyChapter = ""; // current chapter choices
	this.choices = {} ; // all choices from all start chapters
	this.visitedChapters = [];// to keep track of all visited start chapters
	this.visitedNodes = [];// collects titles of ALL visited nodes

	var vnChoices, vnTextResult, vnResult ,VNtext ,vnTextScroll ,htmIDtoAttachYarnTo,vnTextScrollIdx = 0;
	this.vnUpdateChoice = function(direction=0){ //dir: -1 or 1
		if (this.vnSelectedChoice < 0){return};
		var attemptChoice = this.vnSelectedChoice + direction;
		if (attemptChoice > vnResult.options.length-1){
			attemptChoice = 0;
		}
		else if (attemptChoice < 0){console.log("last");
		attemptChoice = vnResult.options.length-1};
		this.vnSelectedChoice = attemptChoice;
		vnChoices = "";  
		vnResult.options.forEach((choice,i) => {
			vnChoices += "\n " ;
			if(i==this.vnSelectedChoice){ vnChoices += this.vnChoiceSelectionCursor }
			else{vnChoices += "   "};
			vnChoices += " ["+choice+"] ";	
		})
		self.updateVNHud();
	}

	this.vnSelectChoice = function(){
		var endTimeWait = new Date().getTime();
		if (endTimeWait - this.startTimeWait < 1000){return}; // we need to wait for user to see the questions	
		this.choices[this.storyChapter].push(vnResult.options[this.vnSelectedChoice]);
		console.log("choices so far:");
		console.log(this.choices);
		vnTextScrollIdx = 0;
		vnResult.select(this.vnSelectedChoice);
		this.emiter.emit("choiceMade",vnResult.options[this.vnSelectedChoice]);
		vnResult = VNtext.next().value ;
		vnChoices = "";
		this.vnSelectedChoice = -1;
		this.changeTextScrollSpeed(111);
	}

	this.changeTextScrollSpeed = function(interval=0){ /// this function is triggered on key press/release
		if (vnResult === null){
			console.log("No yarndata is initiated.Vnresult is null")
			return
		}
		if (vnResult === undefined){
			// this.terminate();
			this.finished = true;
			return
		};

		if (interval == this.vnTextScrollInterval){return};/// use this to stop it from triggering on every frame
		this.vnTextScrollInterval = interval; 
		clearInterval(vnTextScroll);//this resets the scroll timer
		
		// if (vnResult.constructor.name == "CommandResult" ){
		// 	this.commandsPassedLog.push(vnResult.value) ;
		// 	this.commandsPassed = vnResult.value;
		// 	this.emiter.emit("command",vnResult.value);
		// 	vnTextScrollIdx = 0;
		// 	vnResult = VNtext.next().value;
		// 	this.changeTextScrollSpeed(200);
		// 	return;
		// }
		if (vnTextScrollIdx === 0 ){
			console.log("Start rendering text")
			if (vnResult.constructor.name ==  "TextResult"){
				if (this.node.title != vnResult.data.title){ // update title data
					this.node = self.jsonCopy(vnResult.data);
					this.visitedNodes.push(vnResult.data.title);
					// console.log(">>yarn node data:")
					// console.log(this.node)
					console.log("Visited nodes so far:");
					console.log(this.visitedNodes);
					this.emiter.emit("startedNode",this.node);
				}
			}
			// this.emiter.emit("StartChapter",vnResult.value);
		}

		if (vnResult.constructor.name ==  "OptionsResult"){ /// Add choices to text
			if (this.vnSelectedChoice === -1){ /// we need to set it to -1 after choice is made
			this.vnSelectedChoice = 0;
			this.vnUpdateChoice();
			this.startTimeWait = new Date().getTime();
			}
			return
		}
		
		if(vnTextScrollIdx >= vnResult.text.length){ /// Scrolled to end of text, move on
			if (vnResult.constructor.name ==  "TextResult"){
				
				// if (this.node.title != vnResult.data.title){ // update title data
				// 	this.node = self.jsonCopy(vnResult.data)
				// 	this.visitedNodes.push(vnResult.data.title)
				// 	console.log(">>yarn node data:")
				// 	console.log(this.node)
				// 	console.log("Visited nodes so far:");
				// 	console.log(this.visitedNodes)
				// }
			}
			vnTextScrollIdx = 0;
			vnResult = VNtext.next().value
			this.changeTextScrollSpeed(200);
			return;
		};	
		if( interval == 0){return};
		if (vnResult.constructor.name ==  "TextResult"){
			vnTextScroll = setInterval(self.scrollUpdateText, interval);
		}
	}

	self.scrollUpdateText = function(){
		vnTextResult = vnResult.text.substring(0,vnTextScrollIdx);
		self.updateVNHud();
	}

	self.updateVNHud = function (){ /// trigger this only on text update
		vnTextScrollIdx += 1;
		var bbcodeHtml = vnTextResult;
		if (vnResult.constructor.name ===  "TextResult"){
			if (vnResult.text.includes("[")) {
			while(vnTextResult.lastIndexOf("[") > vnTextResult.lastIndexOf("]")){
				vnTextScrollIdx += 1;
				vnTextResult = vnResult.text.substring(0,vnTextScrollIdx);
			};
			bbcodeHtml =bbcode.parse(vnTextResult);
			}
		};
		
		var RenderHtml = "<div style ='color: white; width:90%;position:fixed;bottom:10px;padding:10px;font:50px arial,calibri;border-radius: 25px;border: 3px solid #73AD21 ;background:rgba(1,1,1,0.5)'>"
			RenderHtml += bbcodeHtml + "<br>"
			if(vnChoices !== undefined){
				RenderHtml += "<p style='padding:20px;font:30px arial,calibri'>"+ vnChoices + "</p>" ///TODO: Render bbcode to html
			}
			RenderHtml += "</div>";
		document.getElementById(htmIDtoAttachYarnTo).innerHTML=RenderHtml;
	}
	
	this.terminate = function(){
		document.getElementById(htmIDtoAttachYarnTo).innerHTML="";
		VNtext = null;
		vnResult = null;
		this.finished = false;
	}

	this.initYarn = function(yarnDataObject,startChapter,htmlIdToAttachTo){
		htmIDtoAttachYarnTo =htmlIdToAttachTo;
		this.yarnDataObject= yarnDataObject;
		this.startChapter = startChapter;
		yarnRunner.load(yarnDataObject);
		this.loadYarnChapter(startChapter);
	}

	this.loadYarnChapter = function(storyChapter){
		this.finished = false;
		this.storyChapter = storyChapter;
		this.choices[this.storyChapter] = [];
		this.visitedChapters.push(storyChapter);
		VNtext = yarnRunner.run(storyChapter);
		vnResult = VNtext.next().value
		this.changeTextScrollSpeed(100)
	}

	this.wasChoiceMade = function(choiceName,chapterInWhichItWasMade=this.storyChapter) { // external function to check in a choice was made
		console.log(this.choices[chapterInWhichItWasMade].includes(choiceName));
		if(this.choices[chapterInWhichItWasMade].includes(choiceName)){
			return true
		}else{return false}
	}

	this.timesNodeWasVisited = function(nodeName){ // external function to check how many times a node has been visited
		var counted = 0;
		this.visitedNodes.forEach((visitedNode,i)=>{
			if(visitedNode === nodeName){
				counted += 1
			};
		});
		return counted
	}

	/// we need this to make copies instead of references ///
	self.jsonCopy = function(src) {
		return JSON.parse(JSON.stringify(src));
	};
}