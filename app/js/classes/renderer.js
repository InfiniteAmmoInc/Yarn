const bondage = require('bondage')
const bbcode = require('bbcode')
const yarnRunner = new bondage.Runner()
const EventEmitter = require('events').EventEmitter

let yarnRender = function () {
	let visitedNodes = []
	this.visitedNodes = visitedNodes // collects titles of ALL visited nodes
	let node = {}
	this.node = node // gets raw data from yarn text nodes
	let emiter = new EventEmitter()
	this.emiter = emiter
	let commandsPassedLog = []
	this.commandsPassedLog = commandsPassedLog
	let commandPassed = ''
	this.commandPassed = commandPassed
	let finished = null
	this.finished = finished

	this.visitedChapters = [] // to keep track of all visited start chapters
	this.self = this
	this.vnChoiceSelectionCursor = '>'
	this.startTimeWait
	this.vnSelectedChoice = -1
	this.vnTextScrollInterval
	this.storyChapter = '' // current chapter choices
	this.choices = {} // all choices from all start chapters

	let vnChoices, vnText, vnTextResult, vnResult, VNdata, vnTextScroll, htmIDtoAttachYarnTo, vnTextScrollIdx = null
	this.vnUpdateChoice = (direction = 0) => { // direction: -1 or 1
		if (this.vnSelectedChoice < 0) {
			return
		}
		let attemptChoice = this.vnSelectedChoice + direction
		if (attemptChoice > vnResult.options.length - 1) {
			attemptChoice = 0
		} else if (attemptChoice < 0) {
			attemptChoice = vnResult.options.length - 1
		}
		this.vnSelectedChoice = attemptChoice
		vnChoices = ''
		vnResult.options.forEach((choice, i) => {
			vnChoices += '\n '
			if (i == this.vnSelectedChoice) {
				vnChoices += this.vnChoiceSelectionCursor
			} else {
				vnChoices += '   '
			}
			vnChoices += ' [' + choice + '] '
		})
		self.updateVNHud()
	}

	this.vnSelectChoice = () => {
		let endTimeWait = new Date().getTime()
		if (endTimeWait - this.startTimeWait < 1000) {
			return
		} // we need to wait for user to see the questions
		this.choices[this.storyChapter].push(vnResult.options[this.vnSelectedChoice])
		vnResult.select(this.vnSelectedChoice)
		this.emiter.emit('choiceMade', vnResult.options[this.vnSelectedChoice])
		vnText = ''
		vnChoices = ''
		vnResult = self.goToNext()
		this.vnSelectedChoice = -1
		this.changeTextScrollSpeed(111)
	}

	// this function is triggered on key press/release
	this.changeTextScrollSpeed = (interval = 0) => {
		if (interval === this.vnTextScrollInterval) {
			return
		}
		// use this to stop it from triggering on every frame
		this.vnTextScrollInterval = interval
		clearInterval(vnTextScroll) // this resets the scroll time

		if (vnTextScrollIdx < 0) {
			// when below 0, its on standby for input to continue
			if (this.isFinishedParsing(vnResult)) {
				emiter.emit('finished')
				return
			}
			if (vnResult.constructor.name === 'TextResult') {
				vnText = vnResult.text
				vnTextScrollIdx = 0
				this.changeTextScrollSpeed(220)
				return
			}
			if (vnResult.constructor.name === 'OptionsResult') {
				// Add choices to text
				if (this.vnSelectedChoice === -1) {
					this.vnSelectedChoice = 0
					this.vnUpdateChoice()
					this.startTimeWait = new Date().getTime()
				}
			}
		}
		if (interval === 0) {
			return
		}
		vnTextScroll = setInterval(this.scrollUpdateText, interval)
	}

	self.goToNext = () => {
		const nextNode = VNdata.next().value
		if (!this.isFinishedParsing(nextNode)) {
			if (nextNode.constructor.name === 'TextResult') {
				if (node.title !== nextNode.data.title) {
					node = self.jsonCopy(nextNode.data)
					visitedNodes.push(nextNode.data.title)
					emiter.emit('startedNode', node)
				}
			}
			return nextNode
		}
	}

	this.isFinishedParsing = nextNode => {
		if (nextNode === undefined || vnResult === null) {
			if (!finished) {
				finished = true
				vnTextScrollIdx = -1
			}
			finished = true
			return finished
		} else {
			return false
		}
	}

	this.runCommand = () => {
		emiter.emit('commandCall', vnResult.text)
		commandsPassedLog.push(vnResult.text)
		commandsPassed = vnResult.text

		vnResult = self.goToNext()
		if (this.isFinishedParsing(vnResult)) {
			return
		}
		if (vnResult.constructor.name === 'TextResult') {
			vnText += vnResult.text
			this.changeTextScrollSpeed()
		}
	}

	this.scrollUpdateText = () => {
		if (this.isFinishedParsing(vnResult)) {
			return
		}
		if (vnTextScrollIdx < 0) {
			if (vnResult.constructor.name === 'CommandResult') {
				this.runCommand()
			}
		} else if (vnTextScrollIdx > vnText.length) {
			if (vnResult.constructor.name === 'TextResult') {
				vnResult = self.goToNext()
				if (this.isFinishedParsing(vnResult)) {
					return
				}
				if (vnResult.constructor.name === 'CommandResult') {
					this.runCommand()
				} else if (vnResult.constructor.name === 'TextResult') {
					vnTextScrollIdx = -1
				} else if (vnResult.constructor.name === 'OptionsResult') {
					vnTextScrollIdx = -1
				}
			} else if (vnResult.constructor.name === 'CommandResult') {
				this.runCommand()
			}
		} else if (vnResult.constructor.name === 'TextResult') {
			// update text
			vnTextScrollIdx += 1
			vnTextResult = vnText.substring(0, vnTextScrollIdx)
			self.updateVNHud()
		}
	}

	// trigger this only on text update
	self.updateVNHud = () => {
		let bbcodeHtml = vnTextResult
		if (vnResult.constructor.name === 'TextResult') {
			if (vnResult.text.includes('[')) {
				while (vnTextResult.lastIndexOf('[') > vnTextResult.lastIndexOf(']')) {
					vnTextScrollIdx += 1
					vnTextResult = vnText.substring(0, vnTextScrollIdx)
				}
				bbcodeHtml = bbcode.parse(vnTextResult)
			}
		}
		let RenderHtml =
			"<div style ='color: white; width:90%;position:fixed;bottom:10px;padding:10px;font:50px arial,calibri;border-radius: 25px;border: 3px solid #73AD21 ;background:rgba(1,1,1,0.5)'>"
		RenderHtml += bbcodeHtml + '<br>'
		if (vnChoices !== undefined) {
			RenderHtml += "<p style='padding:20px;font:30px arial,calibri'>" + vnChoices + '</p>'
		}
		RenderHtml += '</div>'
		document.getElementById(htmIDtoAttachYarnTo).innerHTML = RenderHtml
	}

	this.terminate = () => {
		document.getElementById(htmIDtoAttachYarnTo).innerHTML = ''
		VNdata = null
		vnResult = null
		finished = false
	}

	this.initYarn = (yarnDataObject, startChapter, htmlIdToAttachTo) => {
		htmIDtoAttachYarnTo = htmlIdToAttachTo
		this.yarnDataObject = yarnDataObject
		this.startChapter = startChapter
		yarnRunner.load(yarnDataObject)
		this.loadYarnChapter(startChapter)
	}

	this.loadYarnChapter = storyChapter => {
		finished = false
		this.storyChapter = storyChapter
		this.choices[this.storyChapter] = []
		this.visitedChapters.push(storyChapter)
		VNdata = yarnRunner.run(storyChapter)
		vnResult = self.goToNext()
		vnText = vnResult.text
		this.changeTextScrollSpeed(100)
	}

	// external function to check if a choice was made
	this.wasChoiceMade = (choiceName, chapterInWhichItWasMade = this.storyChapter) => {
		if (this.choices[chapterInWhichItWasMade].includes(choiceName)) {
			return true
		} else {
			return false
		}
	}

	// external function to check how many times a node has been visited
	this.timesNodeWasVisited = nodeName => {
		let counted = 0
		this.visitedNodes.forEach((visitedNode, i) => {
			if (visitedNode === nodeName) {
				counted += 1
			}
		})
		return counted
	}

	// we need this to make copies instead of references
	self.jsonCopy = src => {
		return JSON.parse(JSON.stringify(src))
	}
}