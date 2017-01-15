(function (ext) {
    var embeditAppID = "dbhfnkcnljcbbpocflmbfcobkmagpgpf";
    //port connecting to chrome app
    var hPort;
    //connection status
    var hStatus = 0;
    var isDuo;
    //sensor info
    var sensorvalue = new Array(32);
    //when a new message is recieved, save all the info
    var onMsgCircuitPlayground = function (msg) {
        sensorvalue = msg;
    };

    function fitTo255(num) {
        return Math.max(Math.min(num, 255.0), 0.0);
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

    function hexToR(h) {
        return parseInt((cutHex(h)).substring(0, 2), 16)
    }

    function hexToG(h) {
        return parseInt((cutHex(h)).substring(2, 4), 16)
    }

    function hexToB(h) {
        return parseInt((cutHex(h)).substring(4, 6), 16)
    }

    function cutHex(h) {
        return (h.charAt(0) == "#") ? h.substring(1, 7) : h
    }


    //gets the connection status fo the circuit playground
    var getCircuitPlaygroundStatus = function () {
        //console.log("status"); 
        chrome.runtime.sendMessage(embeditAppID, {message: "STATUS"}, function (response) {
            if (response === undefined) { //Chrome app not found
                console.log("Chrome app not found");
                hStatus = 0;
                setTimeout(getCircuitPlaygroundStatus, 2000);
            }
            else if (response.status === false) { //Chrome app says not connected
                if (hStatus !== 1) {
                    console.log("Not connected");
                    hPort = chrome.runtime.connect(embeditAppID);
                    hPort.onMessage.addListener(onMsgCircuitPlayground);
                }
                hStatus = 1;
                setTimeout(getCircuitPlaygroundStatus, 2000);
            }
            else {// successfully connected
                if (hStatus !== 2) {
                    console.log("Connected");
                    isDuo = response.duo;
                    console.log("isDuo: " + isDuo);
                    hPort = chrome.runtime.connect(embeditAppID);
                    hPort.onMessage.addListener(onMsgCircuitPlayground);
                }
                hStatus = 2;
                setTimeout(getCircuitPlaygroundStatus, 2000);
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


    ext.turnOffNeopixels = function () {
        setNeopixels(["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"], 0);
    }

    ext.smile = function () {
        setNeopixels(["#0000ff", "#000000", "#ffff00", "#ffff00", "#ffff00", "#ffff00", "#ffff00", "#ffff00", "#000000", "#0000ff"], 200);
    }


    ext.setRowLed = function (lednum, color) {
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        lednum = lednum - 1;
        var realRed = 0;
        var realGreen = 0;
        var realBlue = 0;
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
            message: "R".charCodeAt(0),
            lednum: lednum,
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };

    ext.setColLed = function (lednum, color) {
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        lednum = lednum - 1;
        var realRed = 0;
        var realGreen = 0;
        var realBlue = 0;
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
            message: "C".charCodeAt(0),
            lednum: lednum,
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };

    ext.setFullLed = function (color) {
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var lednum = 1;
        var realRed = 0;
        var realGreen = 0;
        var realBlue = 0;
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
            message: "F".charCodeAt(0),
            lednum: lednum,
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };

    ext.setPixLed = function (lednumx, lednumy, color) {
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var realRed = 0;
        var realGreen = 0;
        var realBlue = 0;
        lednumx = lednumx - 1;
        lednumy = lednumy - 1;
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
            message: "P".charCodeAt(0),
            lednumx: lednumx,
            lednumy: lednumy,
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };

    ext.setTriLedHex = function (lednum, hexColor) {
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var realRed = hexToR(hexColor);
        var realGreen = hexToR(hexColor);
        var realBlue = hexToR(hexColor);
        var report = {
            message: "O".charCodeAt(0),
            lednum: lednum,
            red: realRed,
            green: realGreen,
            blue: realBlue
        };
        hPort.postMessage(report);
    };

    ext.setLed = function (b_switch) {
        //var realPort = portnum - 1;
        //var portString = realPort.toString();
        //var realIntensity = fitTo255(Math.floor(intensitynum * 2.55));
        //var realPort = 1 - 1; //convert from zero-indexed
        //var portString = realPort.toString(); //convert to string
        var led_set = 0;
        if (b_switch == 'On') {
            led_set = 1;
        }
        else {
            led_set = 0;
        }
        var report = {
            message: "L".charCodeAt(0),
            intensity: led_set
        };
        hPort.postMessage(report);
    };

    ext.setTone = function (tone) {
        //var realPort = portnum - 1;
        //var portString = realPort.toString();
        //var realIntensity = fitTo255(Math.floor(intensitynum * 2.55));
        var realPort = 1 - 1; //convert from zero-indexed
        var portString = realPort.toString(); //convert to string
        var led_set = 0;

        var report = {
            message: "P".charCodeAt(0),
            port: portString.charCodeAt(0),
            intensity: tone
        };
        hPort.postMessage(report);
    };

    ext.setupServo = function (serv, servo_num) {
        //var realPort = portnum - 1; //convert to zero-indexed number
        //var portString = realPort.toString(); //convert to string
        var servo_setup = 1;
        //setup servos
        if (serv == 'Start') {
            servo_setup = 1;
        }
        else {
            servo_setup = 0;
        }
        console.log("Setup Servo: " + servo_setup + "  " + servo_num);
        var report = {
            message: "s".charCodeAt(0),
            servo_num: servo_num,
            servo_setup: servo_setup
        };
        hPort.postMessage(report);
    };

    ext.setServo = function (servo_num, ang) {
        //var realPort = portnum - 1; //convert to zero-indexed number
        //var portString = realPort.toString(); //convert to string

        //set servo bounds
        if (ang < 5) {
            ang = 5;
        }
        if (ang > 175) {
            ang = 175;
        }
        console.log("Set Servo: " + servo_num + "  " + ang);
        var report = {
            message: "S".charCodeAt(0),
            servo_num: servo_num,
            angle: ang
        };
        hPort.postMessage(report);
    };

    //getters for sensor information

    /*Capsense x4	0-3
     Light			4
     Microphone		5
     Temperature		6
     Pushbutton x2	7,8
     Switch			9
     Acc x3			10,11,12
     */
    ext.getTemp = function (deg) {
        //returns temperature in Celsius degrees
        if (deg == '°F') {
            return sensorvalue[6];
        }
        else {
            return Math.round((sensorvalue[6] - 32) * 0.555);
        }

    };

    ext.getSound = function (port) {
        //returns microphone value
        return sensorvalue[5];
    };

    ext.getLight = function (port) {
        //returns light sensor value

        console.log("light: " + sensorvalue[4]);
        return sensorvalue[4];
    };

    ext.getPush = function (port) {
        //returns push button status
        if (port == 1) {
            return sensorvalue[7];
        }
        if (port == 2) {
            return sensorvalue[8];
        }

    };

    ext.getSwitch = function (port) {
        //returns switch status
        return sensorvalue[9];
    };

    ext.getAcc = function (axis) {
        //returns accerolerometer values
        if (axis == 'x')
            return sensorvalue[10];
        else if (axis == 'y')
            return sensorvalue[11];
        else
            return sensorvalue[12];
    };

    ext.getRaw = function (port) {
        //converts to 0 to 100 scale
        return sensorvalue[port];//Math.floor(sensorvalue[port - 1] / 2.55);
    };

    ext.getCap = function (port) {
        //converts to 0 to 100 scale
        var cap1 = sensorvalue[port];//Math.floor(sensorvalue[port - 1] / 2.55); 
        console.log("cap " + port + ": " + cap1);
        if (cap1 > 80) {
            return 1;
        }
        else {
            return 0;
        }
    };

    ext.mapVal = function (val, bMin, bMax) {
        var aMin = 0;
        var aMax = 255;

        var output = (((bMax - bMin) * (val - aMin)) / (aMax - aMin)) + bMin;
        return Math.round(output);
    };

    ext.hSpeak = function (phrase) {
        //uses Chrome text to speech API to speak the phrase
        var report = {message: "SPEAK", val: phrase};
        hPort.postMessage(report);
    };

    ext._shutdown = function () {
        //sends disconnect
        var report = {message: "R".charCodeAt(0)};
        hPort.postMessage(report);
    };

    ext.resetAll = function () {
        //sends reset to Circuit Playground
        var report = {message: "X".charCodeAt(0)};
        hPort.postMessage(report);
    };


    function appNotConnected() {
        var elm = document.createElement("div");
        elm.setAttribute("id", "app-not-connected-popup");
        elm.innerHTML = "<div style='position:fixed;top:0;right:0;bottom:0;left:0;background:red;display: flex; justify-content: center; align-items: center;'><div style='color:white; font-size:300%;'>App Not Connected</div></div>";
        document.body.appendChild(elm);
    }

    function appConnected() {

        var elem = document.getElementById('app-not-connected-popup');

        if (elem) {
            elem.parentNode.removeChild(elem);
        }
    }

    ext._getStatus = function () {
        var currStatus = hStatus;

        switch (currStatus) {
            case 1:
                appConnected();
                return {status: 1, msg: 'Circuit Playground Not Connected'};
                break;
            case 2:
                appConnected();
                return {status: 2, msg: 'Connected'};
                break;
            default:
            {
                appNotConnected();
                return {status: 1, msg: 'Chrome App Not Connected'};
            }
        }

    };


    ext.isDark = function () {
        return (sensorvalue[4] < 20);
    };


    /*Capsense x4	0-3
     Light			4
     Microphone		5
     Temperature		6
     Pushbutton x2	7,8
     Switch			9
     Acc x3			10,11,12
     */


    function mock() {
        return false;
    }


    var base_blocks = [
        ['h', 'when %b', 'mock', '']
        //['b', 'button %m.digital ?', 'mock', 'on'],
        //['b', 'shaken ?', 'mock']
    ];

    var level1 = {
        id: "1",
        blocks: [
            ['h', 'when button %m.buttons pressed', 'mock', 1],
            [' ', 'play rainbow', 'mock'],
            [' ', 'turn all leds off', 'mock'],
            [' ', 'turn led %m.leds leds off', 'mock', 1],
            [' ', 'set led %n to %c', 'mock', 1,1],
            ['b', 'noise?', 'mock'],
            ['b', 'dark?', 'mock'],
            //['b', 'tilted %m.tilt_directions ?', 'mock','left'],
            ['b', 'shaken?', 'mock']
        ],
        menus: {
            //loudness:['noisy','silent'],
            //brightness:['dark','light'],
            leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            //tilt_directions: ['left','right'],
            digital: ['on', 'off'],
            buttons: [1, 2]
        },
        url: 'http://www.embeditelectronics.com/blog/learn/'
    };

    var level2 = {
        id: "2",
        blocks: [
            ['b', 'digital pin %m.digital_pins on ?', 'mock', 6],
            ['r', 'analog pin %m.analog_pins', 'mock', 6],
            ['r', 'accelerometer %m.axis', 'mock', 'x'],
            ['r', 'loudness', 'mock'],
            ['r', 'brightness', 'mock'],
            ['r', 'tempreture', 'mock'],


            [' ', 'set let %m.leds to (R:%n,G:%n,B:%n)', 'mock', 1, 255, 0, 0],
            [' ', 'set digital pin %m.digital_pins to %m.binary', 'mock', 6, 'on'],
            [' ', 'set analog pin %m.analog_pins to %n %', 'mock', 6, 50]
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

    var levels = [level1, level2];
    var level_param = (new URLSearchParams(window.location.search)).get('level') || 1;
    var current_level = levels[level_param - 1];

    var descriptor = {
        blocks: base_blocks.concat(current_level.blocks),
        menus: current_level.menus,
        url: current_level.url
    };


    getCircuitPlaygroundStatus();
    ScratchExtensions.register('Circuit Playground', descriptor, ext);


})({});