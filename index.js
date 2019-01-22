const { delays, validCommands, commandLimits } = require("./tello-data.json");
const dgram = require("dgram");

module.exports = {
    /**
     * Connects to the drone and returns a new Drone object
     * @param {Object} config - The optional config object
     * @param {String} config.host - The IP of the Tello drone
     * @param {String} config.port - The port of the UDP communication
     * @param {String} config.statePort - The port of the UDP state communication
     * @param {Number} config.bufferOffset - Offset in the buffer where the message starts
     * @param {Boolean} config.skipOK - Dont send the ok message
     * @param {Boolean} config.async - Make the send method async
     */
    connect: config => new Drone(config),

    /**
     * The delay timings in ms for each command
     */
    DELAYS: delays
};

/**
 * Takes the drone state string as argument and returns the data as an object
 * @param {String} state - The raw drone state string
 * @returns {Object}
 */
function parseDroneState(state) {
    let data = {};

    state.split(";").map(item => {
        let [prop, value] = item.split(":");

        if (prop && value) {
            data[prop] = value;
        }
    });

    return data;
}

/**
 * A factory function that creates a new tello drone connection and returns a new object.
 * All options are optional
 * @param {Object} config - The optional config object
 * @param {String} config.host - The IP of the Tello drone
 * @param {String} config.port - The port of the UDP communication
 * @param {String} config.statePort - The port of the UDP state communication
 * @param {Number} config.bufferOffset - Offset in the buffer where the message starts
 * @param {Boolean} config.skipOK - Dont send the ok message
 * @param {Boolean} config.async - Make the send method async
 */
function Drone({
    host = "192.168.10.1",
    port = "8889",
    statePort = "8890",
    bufferOffset = 0,
    skipOK = false,
    async = false
} = {}) {
    assertType("string", host);
    assertType("string", port);
    assertType("string", statePort);
    assertType("number", bufferOffset);
    assertType("boolean", skipOK);
    assertType("boolean", async);

    this.HOST = host;
    this.MAIN_PORT = port;
    this.STATE_PORT = statePort;
    this.BUFFER_OFFSET = bufferOffset;
    this.droneIo = dgram.createSocket("udp4");
    this.droneState = dgram.createSocket("udp4");
    this.connected = false;

    this.events = {
        connection: [],
        state: [],
        send: [],
        message: [],
        _ok: [],

        call: (event, ...args) => {
            if (!(event in this.events) || event == "call" || event == "attach") {
                throw new Error(`Invalid event: ${event}`);
            }

            args = args.map(data => (Buffer.isBuffer(data) ? data.toString() : data));
            if (event === "state") args[0] = parseDroneState(args[0]);

            for (let callback of this.events[event]) {
                callback(...args);
            }

            if (event === "_ok") this.events._ok = [];
        },

        attach: (event, callback) => {
            assertType("string", event);
            assertType("function", callback);

            if (!(event in this.events) || event == "call" || event == "attach") {
                throw new Error(`Invalid event: ${event}`);
            }

            this.events[event].push(callback);
        }
    };

    /**
     * Attaches a callback function to an event
     * @param {String} event - The event name
     * @param {Function} callback - The callback function
     */
    this.on = (event, callback) => {
        this.events.attach(event, callback);
    };

    /**
     * Sends a command to the drone asynchronously and waits a predefined amount of time before resolving
     * @param {"command" | "takeoff" | "land" | "streamon" | "streamoff" | "emergency" | "up" | "down" | "left" | "right" | "forward" | "back" | "cw" | "ccw" | "flip" | "go" | "curve" | "speed" | "rc" | "wifi" | "speed?" | "battery?" | "time?" | "wifi?" | "sdk?" | "sn?"} command
     * @param {Object} options - The option object
     * @param {Number} options.value - Number of cm the drone should move in a certain direction
     * @param {Number} options.speed - How fast the drone should move. Max: 100, Min: 10.
     * @param {Number} options.x - Number of cm the drone should move in the x axis. Max: 500, Min: -500.
     * @param {Number} options.y - Number of cm the drone should move in the y axis. Max: 500, Min: -500.
     * @param {Number} options.z - Number of cm the drone should move in the z axis. Max: 500, Min: -500.
     * @param {Number} options.x1 - Starting x position for the curve command. Max: 500, Min: -500.
     * @param {Number} options.x2 - Ending x position for the curve command. Max: 500, Min: -500.
     * @param {Number} options.y1 - Starting y position for the curve command. Max: 500, Min: -500.
     * @param {Number} options.y2 - Ending y position for the curve command. Max: 500, Min: -500.
     */
    this.send = (command, options) =>
        async ? asyncSend.bind(this, command, options)() : syncSend.bind(this, command, options)();

    this.forceSend = (command, options) =>
        async
            ? forceSendAsync.bind(this, command, options)()
            : forceSendSync.bind(this, command, options)();

    this.droneIo.bind(this.MAIN_PORT);
    this.droneState.bind(this.STATE_PORT);

    this.droneState.on("message", this.events.call.bind(null, "state"));

    this.droneIo.on("message", (...args) => {
        let message = args[0].toString();

        if (message === "ok") {
            this.events.call("_ok");

            if (!this.connected) {
                this.connected = true;
                this.events.call("connection")
            }

            if (!skipOK) this.events.call("message", ...args);

        } else {
            this.events.call("message", ...args);
        }
    });

    // this.send("command")
}

function forceSendSync(command) {
    this.droneIo.send(
        command,
        this.BUFFER_OFFSET,
        command.length,
        this.MAIN_PORT,
        this.HOST,
        this.events.call.bind(null, "send")
    );
}

function forceSendAsync(command) {
    return new Promise((resolve, reject) => {
        let _command = command;

        this.droneIo.send(
            Buffer.from(_command),
            this.BUFFER_OFFSET,
            _command.length,
            this.MAIN_PORT,
            this.HOST,
            this.events.call.bind(null, "send")
        );

        // If the command is a read command resolve immediately otherwise wait for OK from drone
        command.includes("?") ? resolve() : this.on("_ok", resolve);
    });
}

/**
 * Sends a command to the drone asynchronously and waits a predefined amount of time before resolving
 * @param {"command" | "takeoff" | "land" | "streamon" | "streamoff" | "emergency" | "up" | "down" | "left" | "right" | "forward" | "back" | "cw" | "ccw" | "flip" | "go" | "curve" | "speed" | "rc" | "wifi" | "speed?" | "battery?" | "time?" | "wifi?" | "sdk?" | "sn?"} command
 * @param {Object} options - The option object
 * @param {Number} options.value - Number of cm the drone should move in a certain direction
 * @param {Number} options.speed - How fast the drone should move. Max: 100, Min: 10.
 * @param {Number} options.x - Number of cm the drone should move in the x axis. Max: 500, Min: -500.
 * @param {Number} options.y - Number of cm the drone should move in the y axis. Max: 500, Min: -500.
 * @param {Number} options.z - Number of cm the drone should move in the z axis. Max: 500, Min: -500.
 * @param {Number} options.x1 - Starting x position for the curve command. Max: 500, Min: -500.
 * @param {Number} options.x2 - Ending x position for the curve command. Max: 500, Min: -500.
 * @param {Number} options.y1 - Starting y position for the curve command. Max: 500, Min: -500.
 * @param {Number} options.y2 - Ending y position for the curve command. Max: 500, Min: -500.
 */

function asyncSend(command, options) {
    return new Promise((resolve, reject) => {
        let _command = command;

        let error = verifyCommand(_command, options, true);

        if (error) reject(error);

        if (options) {
            for (let value of Object.values(options)) {
                _command += ` ${value}`;
            }
        }

        this.droneIo.send(
            Buffer.from(_command),
            this.BUFFER_OFFSET,
            _command.length,
            this.MAIN_PORT,
            this.HOST,
            this.events.call.bind(null, "send")
        );

        // If the command is a read command resolve immediately otherwise wait for OK from drone
        command.includes("?") ? resolve() : this.on("_ok", resolve);
    });
}

/**
 * Sends a command to the drone
 * @param {"command" | "takeoff" | "land" | "streamon" | "streamoff" | "emergency" | "up" | "down" | "left" | "right" | "forward" | "back" | "cw" | "ccw" | "flip" | "go" | "curve" | "speed" | "rc" | "wifi" | "speed?" | "battery?" | "time?" | "wifi?" | "sdk?" | "sn?"} command
 * @param {Object} options - The option object
 * @param {Number} options.value - Number of cm the drone should move in a certain direction
 * @param {Number} options.speed - How fast the drone should move. Max: 100, Min: 10.
 * @param {Number} options.x - Number of cm the drone should move in the x axis. Max: 500, Min: -500.
 * @param {Number} options.y - Number of cm the drone should move in the y axis. Max: 500, Min: -500.
 * @param {Number} options.z - Number of cm the drone should move in the z axis. Max: 500, Min: -500.
 * @param {Number} options.x1 - Starting x position for the curve command. Max: 500, Min: -500.
 * @param {Number} options.x2 - Ending x position for the curve command. Max: 500, Min: -500.
 * @param {Number} options.y1 - Starting y position for the curve command. Max: 500, Min: -500.
 * @param {Number} options.y2 - Ending y position for the curve command. Max: 500, Min: -500.
 */
function syncSend(command, options) {
    verifyCommand(command, options);

    if (options) {
        for (let value of Object.values(options)) {
            command += ` ${value}`;
        }
    }

    this.droneIo.send(
        command,
        this.BUFFER_OFFSET,
        command.length,
        this.MAIN_PORT,
        this.HOST,
        this.events.call.bind(null, "send")
    );
}

/**
 * Verifies that the command is correct and valid for the Tello drone
 * @param {String} command The drone command
 * @param {Object} options Optional object that goes along the command
 */
function verifyCommand(command, options, returns = false) {
    assertType("string", command);

    //Check if the command is valid
    if (!validCommands.all.includes(command)) {
        throw new Error(`Invalid command: ${command}`);
    } else if (!options) {
        //If the command is valid but expects options to go along with it
        if (command in commandLimits) {
            throw new Error(`Expected an option object along with the command: ${command}`);
        }

        return;
    }

    assertType("object", options);

    //Check if there are any missing properties in the options object
    for (let prop in commandLimits[command]) {
        if (!(prop in options)) {
            throw new Error(`Expected '${prop}' in options but recieved undefined`);
        }
    }

    //Check if there are any additional properties in the options object
    for (let prop in options) {
        if (!(prop in commandLimits[command])) {
            throw new Error(`Unexpected '${prop}' in options`);
        }
    }

    for (let prop in options) {
        let value = options[prop];
        let limit = commandLimits[command][prop];

        //Check if the command has a limit on the value from the tello SDK
        if ("max" in limit && "min" in limit) {
            if (!(value <= limit.max && value >= limit.min)) {
                throw new Error(
                    `Invalid value ${prop}: ${value}, expected ${prop} to range between ${
                    limit.min
                    }, ${limit.max}`
                );
            }

            //If the command needs a single value, check if that is passed (stored as an array in tello-data.json)
        } else if (Array.isArray(limit)) {
            if (!limit.includes(value)) {
                throw new Error(`Invalid value ${prop}: ${value} expected ${limit}`);
            }
        } else {
            throw new Error(`Unexpected: ${[command, prop, options]}`);
        }
    }
}

/**
 * Verifies that the actual value is the expected type. Throws error if it fails
 * @param {String} expected
 * @param {any} actual
 */
function assertType(expected, actual) {
    const errString = `Expected ${expected}, recieved: ${actual}, ${typeof actual}`;

    if (typeof expected !== "string") {
        throw new Error("AssertType function expects a string as expected parameter");
    }

    if (expected === "array") {
        if (!Array.isArray(actual)) {
            throw new Error(errString);
        }

        return;
    }

    if (expected === "object") {
        if (!(actual instanceof Object)) {
            throw new Error(errString);
        }

        return;
    }

    if (typeof actual !== expected) {
        throw new Error(errString);
    }
}
