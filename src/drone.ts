import dgram from "dgram";
import { EventEmitter } from "events";
import { parseDroneState, verifyCommand, formatCommand } from "./utility";
import { ValidCommandOptions, ValidCommands } from "./types/commands.types";
import { DroneEventEmitter, DroneOptions } from "./types/drone.types";

class Drone {
    HOST: string;
    MAIN_PORT: number;
    STATE_PORT: number;
    droneIO: dgram.Socket;
    droneState: dgram.Socket;
    connected: boolean;
    events: EventEmitter;

    constructor(options: DroneOptions) {
        /*
            Leaving these asserts out for now, since changing the ports from string to number
            as per following the dgram docs, it will cause errors. Right now the goal is to port JS to TS
            and not fix bugs. Will be added in 3.1.x release.
        */
        // assert.equal(typeof options.host, "string");
        // assert.equal(typeof options.port, "number");
        // assert.equal(typeof options.statePort, "number");
        // assert.equal(typeof options.skipOk, "boolean");

        const defaultOptions = {
            host: "192.168.10.1",
            port: 8889,
            statePort: 8890,
            skipOk: true,
        };
        const {
            host, port, statePort, skipOk,
        } = { ...defaultOptions, ...options };

        this.HOST = host;
        this.MAIN_PORT = port;
        this.STATE_PORT = statePort;

        this.droneIO = dgram.createSocket("udp4");
        this.droneState = dgram.createSocket("udp4");

        this.droneIO.bind(this.MAIN_PORT);
        this.droneState.bind(this.STATE_PORT);

        this.connected = false;

        this.events = new EventEmitter();

        this.droneState.on("message", stateBuffer => {
            this.events.emit("state", parseDroneState(stateBuffer));
        });

        this.droneIO.on("message", (...args) => {
            const [messageBuffer] = args;
            const parsedMessage = Buffer.isBuffer(messageBuffer) ? messageBuffer.toString() : messageBuffer;

            if (parsedMessage !== "ok") {
                return this.events.emit("message", parsedMessage);
            }

            this.events.emit("_ok");

            if (!this.connected) {
                this.connected = true;
                this.events.emit("connection");
            }

            if (!skipOk) this.events.emit("message", parsedMessage);
        });

        // Add a minor delay so that the events can be attached first
        setTimeout(() => this.send("command"));
    }

    send(command: ValidCommands, options?: ValidCommandOptions, force = false): Promise<void> {
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

            // I need to really double check this below, but i will not change it for now since im only porting to TS

            // If the command is a read command resolve immediately
            if (formattedCommand.includes("?")) {
                return resolve();
            }

            // otherwise wait for OK from drone
            this.events.once("_ok", resolve);
        });
    }

    forceSend(command: ValidCommands, options: ValidCommandOptions) {
        return this.send.call(this, command, options, true);
    }

    on: DroneEventEmitter = (event, callback) => {
        this.events.on(event, callback);
    }
}

export = Drone;
