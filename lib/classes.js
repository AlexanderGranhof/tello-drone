const dgram = require("dgram");
const EventEmitter = require("events");
const assert = require("assert");

const { verifyCommand, parseDroneState, formatCommand } = require("./utility.js");

module.exports.Drone = class Drone {
    /**
     * Connects to the drone and returns a new Drone object
     * @param {Object} config - The optional config object
     * @param {String} config.host - The IP of the Tello drone
     * @param {String} config.port - The port of the UDP communication
     * @param {String} config.statePort - The port of the UDP state communication
     * @param {Boolean} config.skipOK - Dont send the ok message
     */
    constructor({
        host = "192.168.10.1",
        port = "8889",
        statePort = "8890",
        skipOK = false,
    } = {}) {
        assert.equal(typeof host, "string");
        assert.equal(typeof port, "string");
        assert.equal(typeof statePort, "string");
        assert.equal(typeof skipOK, "boolean");

        this.HOST = host;
        this.MAIN_PORT = port;
        this.STATE_PORT = statePort;
        this.droneIO = dgram.createSocket("udp4");
        this.droneState = dgram.createSocket("udp4");
        this.connected = false;

        this.events = new EventEmitter();

        this.droneIO.bind(this.MAIN_PORT);
        this.droneState.bind(this.STATE_PORT);

        this.droneState.on("message", stateBuffer => (
            this.events.emit("state", parseDroneState(stateBuffer))
        ));

        this.droneIO.on("message", (...args) => {
            let [message] = args;

            message = Buffer.isBuffer(message) ? message.toString() : message;

            if (message !== "ok") {
                return this.events.emit("message", message);
            }

            this.events.emit("_ok");

            if (!this.connected) {
                this.connected = true;
                this.events.emit("connection");
            }

            if (!skipOK) this.events.emit("message", message);
        });

        // Add a minor delay so that the events can be attached first
        setTimeout(this.send.bind(this, "command"));
    }

    /**
     * Sends a command to the drone via UDP
     * @param {
     * "command" | "takeoff" | "land" | "streamon" | "streamoff" | "emergency" | "up" | "down" | "left" | "right" | "forward" |
     * "back" |"cw" | "ccw" | "flip" | "go" | "curve" | "speed" | "rc" | "wifi" | "speed?" | "battery?" | "time?" | "wifi?" | "sdk?" | "sn?"
     * } command
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
        const error = verifyCommand(command, options);
        let formattedCommand = command;

        if (options) {
            formattedCommand = formatCommand(command, options);
        }

        return new Promise((resolve, reject) => {
            if (error && !force) return reject(error);

            this.droneIO.send(
                formattedCommand,
                0,
                formattedCommand.length,
                this.MAIN_PORT,
                this.HOST,
                this.events.emit.bind(this.events, "send"),
            );

            // If the command is a read command resolve immediately
            if (formattedCommand.includes("?")) {
                return resolve();
            }

            // otherwise wait for OK from drone
            this.events.once("_ok", resolve);
        });
    }

    /**
     * Sends a command to the drone via UDP without verifying the command
     * @param {"command" | "takeoff" | "land" | "streamon" | "streamoff" | "emergency" | "up" | "down" | "left" | "right" | "forward" |
     * "back" | "cw" | "ccw" | "flip" | "go" | "curve" | "speed" | "rc" | "wifi" | "speed?" | "battery?" | "time?" | "wifi?" | "sdk?" | "sn?"
     * } command
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
        this.send.bind(this, command, options, true)();
    }

    /**
     * Attaches a callback to a specific event
     *
     * connection   - Fired when connected to the drone.             callback()
     *
     * state        - Fired when the drone sends its state message.  callback(stateObject, udpConnection)
     *
     * send         - Fired when a command is sent.                  callback(error, messageLength)
     *
     * message      - Fired when the drone sends a status message.   callback(message, udpConnection)
     *
     * @param {String} event - Event name
     * @param {Function} callback - Callback fired upon event
     */
    on(event, callback) {
        this.events.on(event, callback);
    }
};
