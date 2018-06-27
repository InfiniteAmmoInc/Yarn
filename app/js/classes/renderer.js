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
	this.finished = false;
	this.commandsPassedLog = [];
	this.commandPassed = "";
	this.emiter = new EventEmitter();

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
		vnResult.select(this.vnSelectedChoice);
		vnResult = VNtext.next().value ;
		vnChoices = "";
		this.vnSelectedChoice = -1;
		this.changeTextScrollSpeed(111);
	}

	this.changeTextScrollSpeed = function(interval=0){ /// this function is triggered on key press/release
		if (vnResult == undefined){
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

		if (vnResult.constructor.name ==  "OptionsResult"){ /// Add choices to text
			if (this.vnSelectedChoice === -1){ /// we need to set it to -1 after choice is made
			this.vnSelectedChoice = 0;
			this.vnUpdateChoice();
			this.startTimeWait = new Date().getTime();
			}
			return
		}
		
		if(vnTextScrollIdx >= vnResult.text.length){ /// Scrolled to end of text, move on
			vnTextScrollIdx = 0;
			vnResult = VNtext.next().value
			this.changeTextScrollSpeed(200);
			return;
		};	
		if( interval == 0){return};
		vnTextScroll = setInterval(self.scrollUpdateText, interval);
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
	}

	this.initYarn = function(yarnDataObject,startChapter,htmlIdToAttachTo){
		htmIDtoAttachYarnTo =htmlIdToAttachTo
		this.yarnDataObject= yarnDataObject
		this.startChapter = startChapter
		yarnRunner.load(yarnDataObject);
		this.loadYarnChapter(startChapter);
	}

	//todo- rename to startChapter
	this.loadYarnChapter = function(storyChapter){
		this.finished = false;
		console.log("LOADING YARN DATA... chapter: "+storyChapter);
		VNtext = yarnRunner.run(storyChapter);
		console.log("YARN::")
		console.log(VNtext);
		vnResult = VNtext.next().value
		this.changeTextScrollSpeed(100)
	}
}