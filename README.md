# Yarn

Dialogue editor created for "Night in the Woods" (and other projects) by @NoelFB and @infinite_ammo with contributions from @seiyria and @beeglebug. It is heavily inspired by and based on the amazing Twine software: http://twinery.org/

This is a port to electron, made possible by Todor Imreorov. It adds a number of new features, such as:
- Integration of bondage.js (yarnspinner port in javascript) inside Yarn - this allows testing yarn stories directly insode yarn.
- Helper menu to create node links - with a search filter
- Helper menu to test yarn story from a specific node - with a search filter (via bondage.js)
- Tester interface that supports rendering of bbcode- enabling rich text (font colors, styles,images and even links) with typing animation. The tester is written in a very reusable way (as a class with methods)- so it is easy to integrate in html5 games!

![yarn-testerbbcode](https://user-images.githubusercontent.com/6495061/41685950-2b8b3580-74da-11e8-89ea-c7d23dea19da.gif)

# Builds

Win64: https://github.com/blurymind/Yarn/releases/tag/untagged-1933231011a749959b56

MacOS: in Progress

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

With the difference that there is now a helper menu to create links:
![yarn-linkmaking](https://user-images.githubusercontent.com/6495061/41685764-7bf48d1a-74d9-11e8-89bc-b7bae39470f6.gif)

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
