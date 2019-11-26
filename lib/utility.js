const { validCommands, commandLimits } = require("./data/tello-data.json");
const assert = require("assert");

/**
 * Verifies that the command is correct and valid for the Tello drone
 * @param {String} command The drone command
 * @param {Object} options Optional object that goes along the command
 */
function verifyCommand(command, options) {
    assert.strictEqual(typeof command, "string");

    //Check if the command is valid
    if (!validCommands.all.includes(command)) {
        throw new Error(`invalid command: ${command}`);
    } else if (!options) {
        //If the command is valid but expects options to go along with it
        if (command in commandLimits) {
            throw new Error(`Expected an option object along with the command: ${command}`);
        }

        return;
    }

    assert.strictEqual(typeof options, "object");
    assert.strictEqual(Array.isArray(options), false);
    assert.strictEqual(options === null, false);

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
                throw new Error(`invalid value ${prop}: ${value}, expected ${prop} to range between ${limit.min}, ${limit.max}`);
            }

            //If the command needs a single value, check if that is passed (stored as an array in tello-data.json)
        } else if (Array.isArray(limit)) {
            if (!limit.includes(value)) {
                throw new Error(`invalid value ${prop}: ${value} expected ${limit}`);
            }
        } else {
            throw new Error(`Unexpected: ${[command, prop, options]}`);
        }
    }

    return
}

/**
 * Takes the drone state string as argument and returns the data as an object
 * @param {String} state - The raw drone state string
 * @returns {Object}
 */
function parseDroneState(state) {
    state = Buffer.isBuffer(state) ? state.toString() : state;

    const reducer = (finalDataObject, nextDataPoint) => {
        if (!nextDataPoint.includes(":")) {
            return finalDataObject
        }
        
        let [key, value] = nextDataPoint.split(":");
        
        const isCommaSeperated = value.includes(",");
        
        if (isCommaSeperated) {
            value = value.split(",").map(val => isNaN(parseFloat(val)) ? val : parseFloat(val));
        } else {
            value = isNaN(parseFloat(value)) ? value : parseFloat(value)
        }
        
        return {...finalDataObject, [key]: value}
    };
    
    return state.split(";").reduce(reducer, {})
};

function formatCommand(command, options) {
    for (let value of Object.values(options)) {
        command += ` ${value}`;
    }

    return command
}

module.exports = {
    verifyCommand,
    parseDroneState,
    formatCommand
}