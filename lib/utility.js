const assert = require("assert");
const { validCommands, commandLimits } = require("./data/tello-data.json");

/**
 * Verifies that the command is correct and valid for the Tello drone
 * @param {String} command The drone command
 * @param {Object} options Optional object that goes along the command
 */
function verifyCommand(command, options) {
    assert.strictEqual(typeof command, "string");

    // Check if the command is valid
    if (!validCommands.all.includes(command)) {
        return new Error(`invalid command: ${command}`);
    }

    if (!options) {
        // If the command is valid but expects options to go along with it
        if (command in commandLimits) {
            return new Error(`Expected an option object along with the command: ${command}`);
        }
    }

    // If command has no limits, no need to check
    if (command in commandLimits) {
        // Check if there are any missing properties in the options object
        for (const prop of Object.keys(commandLimits[command])) {
            if (!(prop in options)) {
                return new Error(`Expected '${prop}' in options but recieved undefined`);
            }
        }
    }

    if (options) {
        assert.strictEqual(typeof options, "object");
        assert.strictEqual(Array.isArray(options), false);
        assert.strictEqual(options === null, false);

        // Check if there are any additional properties in the options object
        for (const prop of Object.keys(options)) {
            if (!(prop in commandLimits[command])) {
                return new Error(`Unexpected '${prop}' in options`);
            }
        }

        for (const [prop, value] of Object.entries(options)) {
            const limit = commandLimits[command][prop];

            // Check if the command has a limit on the value from the tello SDK
            if ("max" in limit && "min" in limit) {
                if (!(value <= limit.max && value >= limit.min)) {
                    return new Error(`invalid value ${prop}: ${value}, expected ${prop} to range between ${limit.min}, ${limit.max}`);
                }

            /* If the command needs a single value,
             * check if that is passed (stored as an array in tello-data.json)
             */
            } else if (Array.isArray(limit)) {
                if (!limit.includes(value)) {
                    return new Error(`invalid value ${prop}: ${value} expected ${limit}`);
                }
            } else {
                return new Error(`Unexpected: ${[command, prop, options]}`);
            }
        }
    }
}

/**
 * Takes the drone state string as argument and returns the data as an object
 * @param {String} state - The raw drone state string
 * @returns {Object}
 */
function parseDroneState(state) {
    const stringState = Buffer.isBuffer(state) ? state.toString() : state;

    const reducer = (finalDataObject, nextDataPoint) => {
        if (!nextDataPoint.includes(":")) {
            return finalDataObject;
        }

        // eslint-disable-next-line prefer-const
        let [key, value] = nextDataPoint.split(":");
        const isCommaSeperated = value.includes(",");

        if (isCommaSeperated) {
            value = value.split(",").map(val => (
                Number.isNaN(parseFloat(val)) ? val : parseFloat(val)
            ));
        } else {
            value = Number.isNaN(parseFloat(value)) ? value : parseFloat(value);
        }

        return { ...finalDataObject, [key]: value };
    };

    return stringState.split(";").reduce(reducer, {});
}

/**
 * Format a tello command with options
 * @param {String} command - Tello command
 * @param {Object} options - Options for tello command
 */
function formatCommand(command, options) {
    let formattedCommand = command;

    for (const value of Object.values(options)) {
        formattedCommand += ` ${value}`;
    }

    return formattedCommand;
}

module.exports = {
    verifyCommand,
    parseDroneState,
    formatCommand,
};
