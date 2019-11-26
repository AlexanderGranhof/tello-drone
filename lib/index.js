const { Drone } = require("./classes.js")

module.exports = {
    /**
     * Connects to the drone and returns a new Drone object
     * @param {Object} config - The optional config object
     * @param {String} config.host - The IP of the Tello drone
     * @param {String} config.port - The port of the UDP communication
     * @param {String} config.statePort - The port of the UDP state communication
     * @param {Boolean} config.skipOK - Dont send the ok message
     */
    connect: config => new Drone(config),
};