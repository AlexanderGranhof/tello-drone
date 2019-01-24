const { delays } = require("./tello-data.json");
const { Drone } = require("./classes.js")

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