const bondage = require('bondage');
const bbcode = require('bbcode');
const yarnRunner = new bondage.Runner();

var vnTextResult, vnResult ,VNtext ,vnTextScroll ,htmIDtoAttachYarnTo,vnTextScrollIdx = 0;
var yarnRender = function() {
	this.self = this;
	this.yarnContent;
	this.startTestNode;
	this.vnChoiceSelectionCursor = ">";
	this.startTimeWait;
	this.vnChoices = ""
	this.vnSelectedChoice = -1;
	this.vnTextWithoutChoices;
	this.vnTextScrollInterval;
	this.yarnDialogue;

	this.jsonCopy = function(src) {
		return JSON.parse(JSON.stringify(src));
	}

	this.vnUpdateChoice = function(direction=0){ //dir: -1 or 1
		if (this.vnSelectedChoice < 0){return};
		var attemptChoice = this.vnSelectedChoice + direction;
		if (attemptChoice > vnResult.options.length-1){
			attemptChoice = 0;
		}
		else if (attemptChoice < 0){console.log("last");
		attemptChoice = vnResult.options.length-1};
		this.vnSelectedChoice = attemptChoice;
		this.vnChoices = ""; ///move this stuff to updateVn()
		vnResult.options.forEach((choice,i) => {
			this.vnChoices += "\n " ;
			if(i==this.vnSelectedChoice){ this.vnChoices += this.vnChoiceSelectionCursor }
			else{this.vnChoices += "   "};
			this.vnChoices += " ["+choice+"] ";
		})
		this.updateVNHud();
	}

	this.vnSelectChoice = function(){
		var endTimeWait = new Date().getTime();
		if (endTimeWait - this.startTimeWait < 1000){return}; // we need to wait for user to see the questions	
		vnResult.select(this.vnSelectedChoice);
		vnResult = VNtext.next().value ;
		this.vnChoices = "";
		this.vnSelectedChoice = -1;
		this.changeTextScrollSpeed(111);
	}

	this.changeTextScrollSpeed = function(interval=0){ /// this function is triggered on key press/release
		if (interval == this.vnTextScrollInterval){return};/// use this to stop it from triggering on every frame
		this.vnTextScrollInterval = interval; 
		
		clearInterval(vnTextScroll);//this resets the scroll timer
		
		if (vnResult.constructor.name == "TextResult"){
			// vnFullText = vnResult.text;
		}
		// else{vnTextScroll = null;}

		if (vnResult.constructor.name ==  "OptionsResult"){ /// Add choices to text
			if (this.vnSelectedChoice === -1){ ///we need to set it to -1 after choice is made
			this.vnSelectedChoice = 0;
			this.vnTextWithoutChoices = this.jsonCopy(vnTextResult);
			this.vnUpdateChoice();
			this.startTimeWait = new Date().getTime();
			}
			return
		}
		
		if (vnResult.constructor.name == "jsEvalResult" ){
			eval(vnResult.evalString);
			vnTextScrollIdx = 0;
			vnResult = VNtext.next().value;
			this.changeTextScrollSpeed(200);
			return;
		}
	
		// if (!(vnResult.constructor.name !== "TextResult")){ /// This is not text, skip it
		// 	console.log('not text, do somethings else');
		// 	this.vnTextScrollIdx = 0;
		// 	vnResult = VNtext.next().value
		// 	this.changeTextScrollSpeed(200);
		// 	return
		// }
	
		if(vnTextScrollIdx >= vnResult.text.length){ /// Scrolled to end of text, move on
			vnTextScrollIdx = 0;
			vnResult = VNtext.next().value
			this.changeTextScrollSpeed(200);
			return;
		};	
		if( interval == 0){return};
		vnTextScroll = setInterval(scrollUpdateText, interval,this.updateVNHud);
	}

	var scrollUpdateText = function(updateVNHud){
		vnTextResult = vnResult.text.substring(0,vnTextScrollIdx);
		updateVNHud();
	}

	this.updateVNHud = function (){ /// trigger this only on text update
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
		
		var RenderHtml = "<div style ='color: white; width:80%;position:fixed;bottom:10px;padding:10px;font:50px arial,calibri;border-radius: 25px;border: 3px solid #73AD21 ;background:rgba(1,1,1,0.5)'>"
			RenderHtml += bbcodeHtml + "<br>" ///TODO: Render bbcode to html
			if(this.vnChoices !== undefined){
				RenderHtml += "<p style='padding:20px;font:30px arial,calibri'>"+ this.vnChoices + "</p>" ///TODO: Render bbcode to html
			}
			RenderHtml += "</div>";
		document.getElementById(htmIDtoAttachYarnTo).innerHTML=RenderHtml;
		// hudTexture.needsUpdate = true;
	}
	
	//////////////// Yarn 
	this.initYarn = function(yarnDataObject,startChapter,htmlIdToAttachTo){
		htmIDtoAttachYarnTo =htmlIdToAttachTo
		this.yarnDataObject= yarnDataObject
		this.startChapter = startChapter
		yarnRunner.load(yarnDataObject);
		this.loadYarnChapter(startChapter);
	}

	this.loadYarnChapter = function(storyChapter){
		console.log("LOADING YARN DATA... chapter: "+storyChapter);
		VNtext = yarnRunner.run(storyChapter);
		console.log("YARN::")
		console.log(VNtext);
		vnResult = VNtext.next().value
		this.changeTextScrollSpeed(100)
	}
}