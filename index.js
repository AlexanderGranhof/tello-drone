const { delays, validCommands, commandLimits } = require("./tello-data.json");
const dgram = require("dgram");

module.exports = {
    /**
     * Connects to the drone and returns a new Drone object
     * @param {Object} config - the config object
     * @param {String} config.host - The IP of the Tello drone
     * @param {(String | Number)} config.port - The port of the UDP communication
     * @param {(String | Number)} config.statePort - The port of the UDP state communication
     */
    connect: config => new Drone(config)
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
 * @param {Object} config - the config object
 * @param {String} config.host - The IP of the Tello drone
 * @param {(String | Number)} config.port - The port of the UDP communication
 * @param {(String | Number)} config.statePort - The port of the UDP state communication
 * @param {Number} config.bufferOffset - Offset in the buffer where the message starts
 */
function Drone({ host = "192.168.10.1", port = "8889", statePort = "8890", bufferOffset = 0 } = {}) {
    this.HOST = host;
    this.MAIN_PORT = port;
    this.STATE_PORT = statePort;
    this.BUFFER_OFFSET = bufferOffset;
    this.droneIo = dgram.createSocket("udp4");
    this.droneState = dgram.createSocket("udp4");

    this.events = {
        connection: [],
        state: [],
        send: [],
        error: [],
        message: [],

        call: (event, ...args) => {
            if (!(event in this.events) || event == "call" || event == "attach") {
                throw new Error(`Invalid event: ${event}`);
            }

            args = args.map(data => (Buffer.isBuffer(data) ? data.toString() : data));
            if (event === "state") args[0] = parseDroneState(args[0]);

            for (let callback of this.events[event]) {
                callback(...args);
            }
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
     */
    this.on = (event, callback) => {
        this.events.attach(event, callback);
    };

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
    this.send = (command, options) => {
        if (options) {
            verifyCommand(command, options);

            for (let value of Object.values(options)) {
                command += ` ${value}`;
            }
        }
        this.droneIo.send(command, this.BUFFER_OFFSET, command.length, this.MAIN_PORT, this.HOST, this.events.call.bind(null, "send"));
    };

    this.droneIo.bind(this.MAIN_PORT);
    this.droneState.bind(this.STATE_PORT);

    // this.droneIo.on("message", ...args => this.events.call("message", ...args));
    // this.droneState.on("message", ...args => this.events.call("state", ...args));

    this.droneIo.on("message", this.events.call.bind(null, "message"));
    this.droneState.on("message", this.events.call.bind(null, "state"));
    this.droneState.on("error", this.events.call.bind(null, "state"));
    this.droneState.on("listening", this.events.call.bind(null, "connection"));

    this.send("command");
}

/**
 * Verifies that the command is correct and valid for the Tello drone
 * @param {String} command The drone command
 * @param {Object} options Optional object that goes along the command
 */
function verifyCommand(command, options) {
    assertType("string", command);

    if (!validCommands.all.includes(command)) {
        throw new Error(`Invalid command: ${command}`);
    }

    assertType("object", options);

    for (let prop in commandLimits[command]) {
        if (!(prop in options)) {
            throw new Error(`Expected ${prop} in options but recieved undefined`);
        }
    }

    for (let prop in options) {
        if (!(prop in commandLimits[command])) {
            throw new Error(`Unexpected ${prop} in options`);
        }
    }

    for (let prop in options) {
        let value = options[prop];
        let limit = commandLimits[command][prop];

        if ("max" in limit && "min" in limit) {
            if (!(value <= limit.max && value >= limit.min)) {
                throw new Error(`Invalid value ${prop}: ${value}, expected ${prop} to range between ${limit.min}, ${limit.max}`);
            }
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
        throw new Error("AssertType funciton expects a string");
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
