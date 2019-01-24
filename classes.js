const { assertType, verifyCommand, parseDroneState, formatCommand } = require("./utility.js")
const dgram = require("dgram");

class TelloEventHandler {
    constructor(events = ["connection", "state", "send", "message", "_ok"]) {
        this.events = {};

        for (let event of events) {
            this.events[event] = [];
        }
    }


    call(event, ...args) {
        if (!(event in this.events) || event == "call" || event == "attach") {
            throw new Error(`invalid event: ${event}`);
        }

        // if data is a buffer => convert to string
        args = args.map(data => (Buffer.isBuffer(data) ? data.toString() : data));

        if (event === "state") args[0] = parseDroneState(args[0]);

        for (let callback of this.events[event]) {
            callback(...args);
        }

        if (event === "_ok") this.events._ok = [];
    }

    /**
     * Attaches a callback function to an event
     * @param {String} event - The event name
     * @param {Function} callback - The callback function
     */
    attach(event, callback) {
        assertType("string", event);
        assertType("function", callback);

        if (!(event in this.events) || event == "call" || event == "attach") {
            throw new Error(`invalid event: ${event}`);
        }

        this.events[event].push(callback);
    }
}

module.exports.Drone = class Drone {
    constructor({
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
        this.async = async;


        this.events = new TelloEventHandler();

        this.droneIo.bind(this.MAIN_PORT);
        this.droneState.bind(this.STATE_PORT);

        this.droneState.on("message", this.events.call.bind(this.events, "state"));

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

        //Add a minor delay so that the events can be attached first
        setTimeout(this.send.bind(this, "command"))
    }

    /**
     * Sends a command to the drone via UDP
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
    send(command, options, force) {
        let error = verifyCommand(command, options);

        if (options) {
            command = formatCommand(command, options)
        }

        if (this.async) {
            return new Promise((resolve, reject) => {
                if (error && !force) return reject(error);

                this.droneIo.send(
                    command,
                    this.BUFFER_OFFSET,
                    command.length,
                    this.MAIN_PORT,
                    this.HOST,
                    this.events.call.bind(this.events, "send")
                );

                // If the command is a read command resolve immediately otherwise wait for OK from drone
                command.includes("?") ? resolve() : this.on("_ok", resolve);
            });
        } else {
            if (error && !force) throw new Error(error);

            this.droneIo.send(
                command,
                this.BUFFER_OFFSET,
                command.length,
                this.MAIN_PORT,
                this.HOST,
                this.events.call.bind(this.events, "send")
            );
        }
    }

    /**
     * Sends a command to the drone via UDP without verifying the command
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
    forceSend(command, options) {
        this.send.bind(this, command, options, true)()
    }

    on(event, callback) {
        this.events.attach(event, callback)
    }
}