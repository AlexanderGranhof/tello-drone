const { verifyCommand, parseDroneState, formatCommand } = require("./utility.js")
const dgram = require("dgram");
const EventEmitter = require("events");
const assert = require("assert");

module.exports.Drone = class Drone {
    constructor({
        host = "192.168.10.1",
        port = "8889",
        statePort = "8890",
        bufferOffset = 0,
        skipOK = false,
    } = {}) {
        assert.equal(typeof host, "string");
        assert.equal(typeof port, "string");
        assert.equal(typeof statePort, "string");
        assert.equal(typeof bufferOffset, "number");
        assert.equal(typeof skipOK, "boolean");

        this.HOST = host;
        this.MAIN_PORT = port;
        this.STATE_PORT = statePort;
        this.BUFFER_OFFSET = bufferOffset;
        this.droneIO = dgram.createSocket("udp4");
        this.droneState = dgram.createSocket("udp4");
        this.connected = false;

        this.events = new EventEmitter();

        this.droneIO.bind(this.MAIN_PORT);
        this.droneState.bind(this.STATE_PORT);

        this.droneState.on("message", stateBuffer => 
            this.events.emit("state", parseDroneState(stateBuffer))
        );

        this.droneIO.on("message", (...args) => {
            let [event, connection] = args;
            
            event = Buffer.isBuffer(event) ? event.toString() : event;

            if (event !== "ok") {
                return this.events.emit("message", ...args);
            }

            this.events.emit("_ok");

            if (!this.connected) {
                this.connected = true;
                this.events.emit("connection")
            }

            if (!skipOK) this.events.emit("message", ...args);
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

        return new Promise((resolve, reject) => {
            if (error && !force) return reject(error);

            this.droneIO.send(
                command,
                this.BUFFER_OFFSET,
                command.length,
                this.MAIN_PORT,
                this.HOST,
                this.events.emit.bind(this.events, "send")
            );

            // If the command is a read command resolve immediately otherwise wait for OK from drone
            command.includes("?") ? resolve() : this.on("_ok", resolve);
        });
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
        this.events.on(event, callback)
    }
}