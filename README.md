# Yarn

Dialogue editor created for "Night in the Woods" (and other projects) by @NoelFB and @infinite_ammo with contributions from @seiyria and @beeglebug. It is heavily inspired by and based on the amazing Twine software: http://twinery.org/

This is a port to electron, made possible by Todor Imreorov. It adds a number of new features, such as:
- Integration of bondage.js (yarnspinner port in javascript) inside Yarn - this allows testing yarn stories directly inside yarn, as well as rendering of rich text bbcode. The tester is written in a very reusable way (as a class with methods)- so it is easy to integrate in html5 games!  
- Helper menu to create node links - with a search filter
- Support for multiple app instances and file drag and drop
- Automatic creation of nodes with correct name and path when writing any new story threads that have no node created yet
- Ability to copy/paste nodes
-  Ability to run as a web app with propper file open and save functionality

# BBcode styling in editor, Spellchecking, Autocompletion, and more!
- Optional syntax autocompletion (autoclose tags)
- preview of bbcode tag effects and goto in trimmed nodes
- optional spell checking
- optional word guessing and autocompletion
- optional preview bbcode in editor mode
- a color picker (using spectrum.js) to set font color in bbcode
- new context menu
- misspelled word suggestions in the new context menu - if you have selected a misspelled word
- similar word suggestions in the new context menu (thesaurus)
- nodelink suggestions as you type in the right places
- Night mode - Toggling it will invert all the light colors which the editor currently uses
- A context menu command to visit other nodes via their links in the editor and even create new ones
- Button to go back to the previous edited node. If there is no previous - save and close the current one
![yarn-0 3 5-newfeatures](https://user-images.githubusercontent.com/6495061/50045609-b646e900-008d-11e9-9f17-2ac6b01908f6.gif)

# Builds

Win64 and MacOS: https://github.com/blurymind/Yarn/releases/latest

# To compile and run web app on localhost from source:
Make sure you have nodejs installed. Then from the root folder

npm install
npm start

# To build web app:
npm run build

# To compile and run electron app:
cd electron
nmp install
npm start

# To build an electron yarn executable yourself:
cd electron
npm run build-windows
or
npm run build-linux

# Examples

Games built with Unity and Yarn.

Lost Constellation: http://finji.itch.io/lost-constellation

![Screenshot](http://infiniteammo.com/Yarn/lost-constellation.jpg)

Knights and Bikes: https://www.kickstarter.com/projects/foamsword/knights-and-bikes

![Screenshot](http://infiniteammo.com/Yarn/knights-and-bikes.jpg)

Sunflower (Demo): http://infiniteammo.com/Sunflower

![Screenshot](http://infiniteammo.com/Yarn/sunflower.jpg)

Far From Noise by George Batchelor (@georgebatch): http://www.georgebatchelor.com/#!far-from-noise/c1ceg

![Screenshot](http://infiniteammo.com/Yarn/far-from-noise.png)

YarnTest: http://infiniteammo.com/YarnTest/

Test drive your Yarn files here ^

# How to Connect Nodes

Node connections work similar to Twine.

![Screenshot](http://infiniteammo.com/Yarn/node-connections.jpg)

# Shortcut Options

Shortcut options are a new method of creating dialogue branches that does not require creating new nodes.

![Screenshot](http://infiniteammo.com/Yarn/shortcut-options.jpg)

# How to Import Twine Files

One way to import Twine files into Yarn is to export a "Twee" file from Twine. (txt format) Open this txt file in Yarn as you would any other file.

Note: This method of importing will not preserve node locations, just each node's title, body and tags.

# How to Run Your Dialogue in Unity

You can find basic Yarn parsing and playback example code here:

https://github.com/InfiniteAmmoInc/yarn-test

You can find a more advanced Yarn interpreter here: 

https://github.com/thesecretlab/YarnSpinner

# Yarn Icon

Yarn logo/icon created by @Mr_Alistair.

![Icon](http://infiniteammo.com/Yarn/yarn-icon.png)
