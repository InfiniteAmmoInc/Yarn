# Yarn

Dialogue editor created for "Night in the Woods" (and other projects) by @NoelFB and @infinite_ammo with contributions from @seiyria and @beeglebug. It is heavily inspired by and based on the amazing Twine software: http://twinery.org/

![Screenshot](http://infiniteammo.com/Yarn/screenshot.jpg)

# Builds

Win64: http://infiniteammo.com/Yarn/Yarn-2016-08-15-win.zip

MacOS: http://infiniteammo.com/Yarn/Yarn-2016-08-15-mac.zip

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

# How to Run the Yarn Source as an App

Download http://nwjs.io/ for your platform and extract the contents.

Win64: Download the latest nwjs for Windows 64bit. Extract the content to wherever you like. Drag the yarn folder into nw.exe and it should run yarn! (if not ensure that the yarn folder has package.json in it). Alternatively run nw.exe and navigate to C:/path_to_yarn/Yarn/app/index.html 

MacOS: Place source code in a new folder named "app.nw" inside the extracted nwjs.app's "Contents/Resources/" folder.
(to explore an app's folder structure, right click and select "Show Package Contents")

Linux: Download latest nwjs for linux. Extract the content to wherver you like. In that folder make a new folder named "package.nw". Clone yarn into the package.nw folder so that readme, licence and most imporatantly package.json are in the package.nw folder. Now open terminal, navigate to the folder where you extracted nwjs and run the "nw" executable.

# Yarn Icon

Yarn logo/icon created by @Mr_Alistair.

![Icon](http://infiniteammo.com/Yarn/yarn-icon.png)
