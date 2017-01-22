(function (ext) {
    var embeditAppID = "dbhfnkcnljcbbpocflmbfcobkmagpgpf";
    //port connecting to chrome app
    var hPort;
    //connection status
    var currentStatus = 0;
    var isDuo;
    //sensor info
    var circuitData = new Array(32);
    //when a new message is recieved, save all the info


    // currently the chrome app is not working on mac, so I use this to mock the circuitData
    circuitData = [3, 4, 3, 11, 13, 83, 80, 0, 0, 1, 212, 56, 102, 0, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null];


    //gets the connection status fo the circuit playground
    var getCircuitPlaygroundStatus = function () {
        chrome.runtime.sendMessage(embeditAppID, {message: "STATUS"}, function (response) {


            //Chrome app not found
            if (response === undefined) {
                console.log("Chrome app not found");
                currentStatus = 0;
                setTimeout(getCircuitPlaygroundStatus, 2000);
                return;
            }

            //Chrome app says not connected
            if (response.status === false) {
                //console.log("Not connected");
                //hPort = chrome.runtime.connect(embeditAppID);
                //hPort.onMessage.addListener(onMsgCircuitPlayground);
                currentStatus = 1;
            }
            // successfully connected
            else if (response.status === true) {
                console.log("Connected");
                isDuo = response.duo;
                console.log("isDuo: " + isDuo);
                hPort = chrome.runtime.connect(embeditAppID);

                hPort.onMessage.addListener(function (msg) {
                    circuitData = msg;
                });

                currentStatus = 2;
            }

        });
    };


    //all the below functions take in a portnum, it is assumed that the port
    //has the appropriate device connected to it.

    ext.setRingLed = function (lednum, color) {
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var realRed = 0;
        var realGreen = 0;
        var realBlue = 0;
        lednum = lednum - 1;
        //'Red','Green','Blue','Orange','Yellow','Violet','White', 'Off'
        switch (color) {
            case "Red":
                realRed = 255;
                break;
            case "Green":
                realGreen = 255;
                break;
            case "Blue":
                realBlue = 255;
                break;
            case "Orange":
                realRed = 255;
                realGreen = 153;
                break;
            case "Yellow":
                realRed = 255;
                realGreen = 255;
                break;
            case "Violet":
                realRed = 153;
                realBlue = 153;
                break;
            case "Teal":
                realGreen = 255;
                realBlue = 255;
                break;
            case "White":
                realRed = 255;
                realGreen = 255;
                realBlue = 255;
                break;
            default:
                realRed = 0;
        }

        var report = {
            message: "O".charCodeAt(0),
            lednum: lednum,
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };


    var prevTime = new Date();
    var prevAxis = {x: 0, y: 0, z: 0};
    var SHAKE_THRESHOLD = 800;

    ext.isShaking = function () {


        var currentTime = new Date();
        var currentAxis = {
            x: circuitData[CIRCUIT.SENSORS.ACCELEROMETER.X],
            y: circuitData[CIRCUIT.SENSORS.ACCELEROMETER.Y],
            z: circuitData[CIRCUIT.SENSORS.ACCELEROMETER.Z]
        };

        var timeDiff = currentTime.getTime() - prevTime.getTime();

        var speed = Math.abs((currentAxis.x - prevAxis.x) + (currentAxis.y - prevAxis.y) + (currentAxis.z - prevAxis.z)) / timeDiff * 10000;
        console.log(speed);

        prevTime = currentTime;
        prevAxis = currentAxis;

        return (timeDiff > 100) && (speed > SHAKE_THRESHOLD);
    };


    function isOff(hex) {
        return hex == "#000000";
    }

    function setNeopixel(lednum, hex) {

        var color = hexToRgb(hex);

        hPort.postMessage({
            message: "O".charCodeAt(0),
            lednum: lednum,
            red: color.r,
            green: color.g,
            blue: color.b
        });
    }

    function setNeopixels(hexArray, interval) {

        var offs = 0;

        for (var i = 0; i < hexArray.length; i++) {

            hex = hexArray[i];

            if (isOff(hex)) {
                offs++;
                setNeopixel(i, hex);
            }
            else {
                var _interval = (i + 1 - offs) * interval; // wait interval also before the first led
                setTimeout(setNeopixel, _interval, i, hex);
            }
        }


    }

    //getters for sensor information

    /*Capsense x4	0-3
     Light			4
     Microphone		5
     Temperature		6
     Pushbutton x2	7,8
     Switch			9
     Acc x3			10,11,12
     */

    var CIRCUIT = {
        SWITCH: 9,
        CAPSENSE: [0, 1, 2, 3],
        BUTTONS: [7, 8],
        SENSORS: {
            LIGHT: 4,
            MICROPHONE: 5,
            TEMPERATURE: 6,
            ACCELEROMETER: {
                X: 10,
                Y: 11,
                Z: 12
            }
        }
    };


    ext.getTemp = function (deg) {

        function toCelsius(f) {
            return Math.round((f - 32) * 0.555);
        }

        var temp = circuitData[CIRCUIT.SENSORS.TEMPERATURE];

        return deg == '°F' ? temp : toCelsius(temp);
    };

    ext.getSound = function (port) {
        return circuitData[CIRCUIT.SENSORS.MICROPHONE];
    };

    ext.getLight = function (port) {
        return circuitData[CIRCUIT.SENSORS.LIGHT];
    };

    ext.getPush = function (buttonIndex) {
        return circuitData[CIRCUIT.BUTTONS[buttonIndex - 1]];
    };

    ext.getSwitch = function (port) {
        //returns switch status
        return circuitData[CIRCUIT.SWITCH];
    };

    ext.getAcc = function (axis) {
        return circuitData[CIRCUIT.SENSORS.ACCELEROMETER[axis]];
    };

    ext.getCap = function (port) {
        var CAP_THRESHOLD = 80;
        return circuitData[port] > CAP_THRESHOLD;
    };

    ext._getStatus = function () {

        if (currentStatus == 0) {

            if (!elementExists('#app-not-connected-popup')) {
                var popupElm = "<div id=\'app-not-connected-popup\'\n     style=\'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.8);display: flex; justify-content: center; align-items: center;\'>\n\n\n    <div style=\'color:gray;  margin:10%; background:white;border-radius: 4px; box-shadow:0 2px 2px rgba(0,0,0,0.5); text-align: center;\'>\n\n        <header style=\'background: #607D8B; padding: 10px; border-radius: 4px 4px 0 0 \'>\n            <span style=\'color:#ffffff; font-size:150%;\'>App Not Connected</span>\n        </header>\n\n        <div style=\'padding:20px;\'>\n\n            Please\n            <a\n                    href=\'https://chrome.google.com/webstore/detail/dbhfnkcnljcbbpocflmbfcobkmagpgpf\'\n                    target=\'_blank\'\n                    style=\'background: #4CAF50; color: white; font-weight: bold; text-transform: uppercase; padding: 2px 20px; border-radius: 4px; border-bottom: 2px solid #2E7D32; cursor: pointer;\'>click\n                here</a> to install and launch the <em>Embedit Scratch Connection App</em> and then <strong> check back\n            here.</strong>\n\n            <img src=\"https://media.giphy.com/media/26xBMKr8SJsuikHcI/giphy.gif\"\n                 style=\'display: block;height:100px;margin:20px auto\'>\n\n        </div>\n\n    </div>\n</div>";
                $('body').append(popupElm);
            }

            return {status: 1, msg: 'Chrome App Not Connected'};
        }
        else {

            // Remove the popup
            $('#app-not-connected-popup').remove();

            if (currentStatus == 1)
                return {status: 1, msg: 'Circuit Playground Not Connected'};

            if (currentStatus == 2)
                return {status: 2, msg: 'Connected'};
        }
    };

    ext._shutdown = function () {
        //sends disconnect 
        var report = {message: "R".charCodeAt(0)};
        hPort.postMessage(report);
    };


    function mock() {
        return false;
    }

    //ext.when = function (b) {
    //    return b;
    //};

    ext.isButtonPressed = function (buttonIndex) {
        return ext.getPush(buttonIndex);
    };

    ext.rainbow = function () {
        setNeopixels(["#9400D3", "#0000FF", "#00FF00", "#FFFF00", "#FF0000", "#FF0000", "#FFFF00", "#00FF00", "#0000FF", "#9400D3"], 200);
    };

    ext.turnLedOff = function (ledIndex) {
        setNeopixel(ledIndex - 1, '#000000');
    };

    ext.setLed = function (ledIndex, color) {
        var hex = decimalColorToHex(color);
        setNeopixel(ledIndex - 1, hex);
    };

    ext.isNoise = function () {
        return (ext.getSound() > 50);
    };

    ext.isDark = function () {
        return (ext.getLight() < 20);
    };


    var environments = {
        "en": {
            levels: []
        }
    };

    environments.en.root_level = {
        id: "0",
        blocks: [
            //['h', 'when %b', 'when', false],
            ['b', 'button %m.buttons pressed?', 'isButtonPressed', 1]
        ],
        menus: {buttons: [1, 2]}
    };

    environments.en.levels[0] = {
        id: "1",
        blocks: [
            [' ', 'play rainbow', 'rainbow'],
            [' ', 'turn led %n off', 'turnLedOff', 1],
            [' ', 'set led %n to %c', 'setLed', 1, '#ff0000'],
            ['b', 'noise?', 'isNoise'],
            ['b', 'dark?', 'isDark'],
            ['b', 'shaking?', 'isShaking']
        ],
        menus: {
            leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            digital: ['on', 'off']
        },
        url: 'http://www.embeditelectronics.com/blog/learn/'
    };

    environments.en.levels[1] = {
        id: "2",
        blocks: [
            ['b', 'digital pin %n on ?', 'mock', 6],
            ['r', 'analog pin %n', 'mock', 6],
            ['r', 'accelerometer %m.axis', 'mock', 'x'],
            ['r', 'loudness', 'mock'],
            ['r', 'brightness', 'mock'],
            ['r', 'tempreture', 'mock'],

            [' ', 'set let %n to ( R:%n , G:%n , B:%n )', 'mock', 1, 255, 0, 0],
            [' ', 'set digital pin %n to %b', 'mock', 6, 'on'],
            [' ', 'set analog pin %n to %n %', 'mock', 6, 50],

            ['b', 'shaken?', 'mock']

        ],
        menus: {
            leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            analog_pins: [6, 9, 10, 12],
            digital_pins: [6, 9, 10, 12],
            axis: ['x', 'y', 'z'],
            binary: ['on', 'off']
        },
        url: 'http://www.embeditelectronics.com/blog/learn/'
    };


    var level_param = (new URLSearchParams(window.location.search)).get('level') || 1;
    var lang_param = (new URLSearchParams(window.location.search)).get('lang') || 'en';

    var current_environment = environments[lang_param];
    var current_level = current_environment.levels[level_param - 1];

    var descriptor = {
        blocks: current_environment.root_level.blocks.concat(current_level.blocks),
        menus: Object.assign({}, current_environment.root_level.menus, current_level.menus),
        url: current_level.url
    };


    setInterval(getCircuitPlaygroundStatus, 2000);
    ScratchExtensions.register('Circuit Playground', descriptor, ext);


    // HELPER FUNCTIONS ****************************************************************

    function elementExists(id) {
        return $(id).length > 0;
    }

    //convert scratch hex color to rgb for neopixels
    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function decimalColorToHex(number) {
        return "#" + ((number) >>> 0).toString(16).slice(-6);
    }


})({});