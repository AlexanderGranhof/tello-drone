const { validCommands, commandLimits } = require("./tello-data.json");

/**
 * Verifies that the command is correct and valid for the Tello drone
 * @param {String} command The drone command
 * @param {Object} options Optional object that goes along the command
 */
function verifyCommand(command, options) {
    assertType("string", command);

    //Check if the command is valid
    if (!validCommands.all.includes(command)) {
        return `Invalid command: ${command}`;
    } else if (!options) {
        //If the command is valid but expects options to go along with it
        if (command in commandLimits) {
            return `Expected an option object along with the command: ${command}`;
        }

        return;
    }

    assertType("object", options);

    //Check if there are any missing properties in the options object
    for (let prop in commandLimits[command]) {
        if (!(prop in options)) {
            return `Expected '${prop}' in options but recieved undefined`;
        }
    }

    //Check if there are any additional properties in the options object
    for (let prop in options) {
        if (!(prop in commandLimits[command])) {
            return `Unexpected '${prop}' in options`;
        }
    }

    for (let prop in options) {
        let value = options[prop];
        let limit = commandLimits[command][prop];

        //Check if the command has a limit on the value from the tello SDK
        if ("max" in limit && "min" in limit) {
            if (!(value <= limit.max && value >= limit.min)) {
                return `Invalid value ${prop}: ${value}, expected ${prop} to range between ${limit.min}, ${limit.max}`;
            }

            //If the command needs a single value, check if that is passed (stored as an array in tello-data.json)
        } else if (Array.isArray(limit)) {
            if (!limit.includes(value)) {
                return `Invalid value ${prop}: ${value} expected ${limit}`;
            }
        } else {
            return `Unexpected: ${[command, prop, options]}`;
        }
    }

    return
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

function formatCommand(command, options) {
    for (let value of Object.values(options)) {
        command += ` ${value}`;
    }

    return command
}

module.exports = {
    assertType,
    verifyCommand,
    parseDroneState,
    formatCommand
}