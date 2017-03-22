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

    var prevXYZ = {};
    var prevTime = new Date();
    ext.isShaking = function () {

        var res = false;

        var threshold = 15; //default velocity threshold for shake to register
        var timeout = 1000; //default interval between events

        var current = {
            x: circuitData[CIRCUIT.SENSORS.ACCELEROMETER.X],
            y: circuitData[CIRCUIT.SENSORS.ACCELEROMETER.Y],
            z: circuitData[CIRCUIT.SENSORS.ACCELEROMETER.Z]
        };

        // For the first time
        if ((prevXYZ.x === null) && (prevXYZ.y === null) && (prevXYZ.z === null)) {
            prevXYZ.x = current.x;
            prevXYZ.y = current.y;
            prevXYZ.z = current.z;
            return;
        }

        var deltaX = Math.abs(prevXYZ.x - current.x);
        var deltaY = Math.abs(prevXYZ.y - current.y);
        var deltaZ = Math.abs(prevXYZ.z - current.z);

        if (((deltaX > threshold) && (deltaY > threshold)) || ((deltaX > threshold) && (deltaZ > threshold)) || ((deltaY > threshold) && (deltaZ > threshold))) {
            //calculate time in milliseconds since last shake registered
            var currentTime = new Date();
            var timeDifference = currentTime.getTime() - prevTime.getTime();

            if (timeDifference > timeout) {
                res = true;
                prevTime = new Date();
            }
        }

        prevXYZ.x = current.x;
        prevXYZ.y = current.y;
        prevXYZ.z = current.z;

        return res;

    };


    function isOff(hex) {
        return hex == "#000000";
    }

    function setNeopixelRGB(lednum, r, g, b) {
        hPort.postMessage({
            message: "O".charCodeAt(0),
            lednum: lednum,
            red: r,
            green: g,
            blue: b
        });
    }

    function setNeopixelHex(lednum, hex) {
        var color = hexToRgb(hex);
        setNeopixelRGB(lednum, color.r, color.g, color.b);
    }

    function setNeopixelColor(lednum, color) {
        var hex = decimalColorToHex(color);
        setNeopixelHex(lednum, hex);
    }

    function setNeopixels(hexArray, interval) {

        var offs = 0;

        for (var i = 0; i < hexArray.length; i++) {

            var hex = hexArray[i];

            if (isOff(hex)) {
                offs++;
                setNeopixelHex(i, hex);
            }
            else {
                var _interval = (i + 1 - offs) * interval; // wait interval also before the first led
                setTimeout(setNeopixelHex, _interval, i, hex);
            }
        }


    }

    function normalizeAnalog(value) {
        // the given value is between 0 and 255
        return (value * 100 / 255).toFixed(2);
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
        },
        ANALOG: {
            PIN9: 13,
            PIN10: 14,
            PIN12: 15
        }
    };


    ext.getLoudness = function () {
        return normalizeAnalog(circuitData[CIRCUIT.SENSORS.MICROPHONE]);
    };

    ext.getBrightness = function () {
        return normalizeAnalog(circuitData[CIRCUIT.SENSORS.LIGHT]);
    };

    ext.getTemperature = function () {
        return normalizeAnalog(circuitData[CIRCUIT.SENSORS.TEMPERATURE]);
    };

    ext.getPush = function (buttonIndex) {
        return circuitData[CIRCUIT.BUTTONS[buttonIndex - 1]];
    };

    ext.getAcc = function (axis) {
        return normalizeAnalog(circuitData[CIRCUIT.SENSORS.ACCELEROMETER[axis]]);
    };

    ext.getSwitch = function () {
        //returns switch status
        return circuitData[CIRCUIT.SWITCH];
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

    //ext.when = function (b) {
    //    return b;
    //};

    ext.isButtonPressed = function (buttonIndex) {
        return ext.getPush(buttonIndex);
    };

    ext.rainbow = function () {
        setNeopixels(["#9400D3", "#0000FF", "#00FF00", "#FFFF00", "#FF0000", "#FF0000", "#FFFF00", "#00FF00", "#0000FF", "#9400D3"], 200);
    };

    ext.turnLedOff = function (lednum) {
        setNeopixelHex(lednum, '#000000');
    };

    function _turnAllLedsOff() {
        for (var i = 0; i < 10; i++) {
            ext.turnLedOff(i);
        }
    }

    ext.turnAllLedsOff = function () {
        _turnAllLedsOff();
    };

    ext.isNoise = function () {
        return (ext.getLoudness() > 50);
    };

    ext.isDark = function () {
        return (ext.getBrightness() < 20);
    };


    ext.setNeopixelRGB = setNeopixelRGB;
    ext.setNeopixelColor = setNeopixelColor;


    // ANALOG

    ext.readAnalog = function (pin) {
        return normalizeAnalog(circuitData[CIRCUIT.ANALOG["PIN" + pin]]);
    };

    ext.setAnalogPinRW = function (pin, state) {

        var servo_num = (pin == 9) ? 1 : 2; // Servo#1 is on pin#9 , Servo#2 is on pin#10
        var servo_setup = (state == 'read') ? 0 : 1; // 0:read , 1:servo

        var report = {
            message: "s".charCodeAt(0),
            servo_num: servo_num,
            servo_setup: servo_setup
        };

        hPort.postMessage(report);

    };

    ext.setServo = function (pin, angle) {

        var servo_num = (pin == 9) ? 1 : 2; // Servo#1 is on pin#9 , Servo#2 is on pin#10
        angle %= 180;

        var report = {
            message: "S".charCodeAt(0),
            servo_num: servo_num,
            angle: angle
        };

        hPort.postMessage(report);

    };

    ext.analogToVoltage = function (analog) {

        var volt = analog * 0.01294;//convert to 0 to 3.3v value
        volt = +analog_value.toFixed(2);

        return volt;
    };


    ext.useless = function () {
        return "NOT FOR USAGE";
    };

    var environments = {
        "en": {
            levels: []
        }
    };

    environments.en.root_level = {
        id: "0",
        blocks: [

            ['b', 'button %m.buttons pressed?', 'isButtonPressed', 1],

            //['b', '%m.CATEGORY_TITLE_LEDS', 'useless', '--- LEDS ---------------'],
            [' ', 'set led %n to %c', 'setNeopixelColor', 1, '#ff0000'],
            [' ', 'set led %n to ( R:%n , G:%n , B:%n )', 'setNeopixelRGB', 1, 255, 0, 0],
            [' ', 'turn led %n off', 'turnLedOff', 1],
            [' ', 'turn all leds off', 'turnAllLedsOff'],
            [' ', 'play rainbow', 'rainbow'],

            //['b', '%m.CATEGORY_TITLE_SENSORS', 'useless', '--- ON BOARD SENSORS ---'],
            ['r', 'accelerometer %m.axis', 'getAcc', 'X'],
            ['r', 'loudness', 'getLoudness'],
            ['r', 'brightness', 'getBrightness'],
            ['r', 'temperature', 'getTemperature'],
            ['b', 'shaking?', 'isShaking'],

            //['b', '%m.CATEGORY_TITLE_ANALOG_SERVO', 'useless', '--- ANALOG & SERVO -----'],
            [' ', 'setup pin %m.analog_servo_pins to %m.analog_pin_state', 'setAnalogPinRW', 9, 'servo'],
            ['r', 'analog pin %m.analog_pins', 'readAnalog', 9],
            [' ', 'set servo on pin %m.analog_servo_pins to angle %n', 'setServo', 9, 90]

            //['r', 'convert %n (analog) to volt', 'analogToVoltage', 90],

            //['b', 'noise?', 'isNoise'],
            //['b', 'dark?', 'isDark'],

        ],
        menus: {
            buttons: [1, 2],
            analog_pins: [9, 10, 12],
            analog_servo_pins: [9, 10],
            analog_pin_state: ['read', 'servo'],
            leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            digital: ['on', 'off'],
            axis: ['X', 'Y', 'Z']
            //CATEGORY_TITLE_LEDS: ['--- LEDS ---------------'],
            //CATEGORY_TITLE_SENSORS: ['--- ON BOARD SENSORS ---'],
            //CATEGORY_TITLE_ANALOG_SERVO: ['--- ANALOG & SERVO -----']
        }
    };

    environments.en.levels[0] = {
        id: "1",
        blocks: [],
        menus: {},
        url: 'http://www.embeditelectronics.com/blog/learn/'
    };

    environments.en.levels[1] = {
        id: "2",
        blocks: [
            //['b', '--- ADVANCED ----------', 'useless'],
            [' ', 'set led %n to ( R:%n , G:%n , B:%n )', 'setNeopixelRGB', 1, 255, 0, 0]
        ],
        menus: {},
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