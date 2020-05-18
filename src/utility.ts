import assert from "assert";
import { validCommands, commandLimits } from "./data/tello-data.json";
import { ValidCommands, ValidCommandOptions } from "./types/commands.types";

const limits = Object.keys(commandLimits);
const commands = [...validCommands.control, ...validCommands.read, ...validCommands.set];

export function verifyCommand(command: ValidCommands, options?: ValidCommandOptions) {
    assert.strictEqual(typeof command, "string");

    const givenOptions = options || {};
    const currentCommandLimits = (commandLimits as any)[command] || {};

    if (!commands.includes(command)) {
        return new Error(`invalid command: '${command}'`);
    }

    const commandRequiresOptions = limits.includes(command);
    const hasGivenOptions = !!Object.keys(givenOptions).length;

    if (!hasGivenOptions) {
        if (limits.includes(command)) {
            return new Error(`Expected an option object along with the command: '${command}'`);
        }
    }

    if (commandRequiresOptions) {
        const allRequiredOptions: string[] = Object.keys(currentCommandLimits);
        const givenOptionKeys = Object.keys(givenOptions);
        
        // Check if we are missing any options
        for (const option of allRequiredOptions) {
            if (!givenOptionKeys.includes(option)) {
                return new Error(`expected '${option}' in options but recieved undefined`);
            }
        }
    }

    if (hasGivenOptions) {
        const allRequiredOptions: string[] = Object.keys(currentCommandLimits);
        const givenOptionKeys = Object.keys(givenOptions);
        const commandValueIsEnum = Array.isArray(currentCommandLimits);

        // Check if we have any extra options that dont belong
        for (const option of givenOptionKeys) {
            if (!allRequiredOptions.includes(option)) {
                return new Error(`unexpected '${option}' in options`);
            }
        }

        for (const [key, value] of Object.entries(givenOptions)) {
            const optionsLimits = currentCommandLimits[key];
            const optionLimitKeys = Object.keys(optionsLimits);
            const hasMinMax = optionLimitKeys.includes("min") || optionLimitKeys.includes("max");

            // If we dont have an array (enum) or a min max property, something is not right
            if (optionsLimits === undefined) {
                return new Error(`Unexpected error with following parameters: ${[command, key, `[${Object.entries(givenOptions)}]`]}, no option limits found`);
            }

            // Check if value is within min and max value
            if (hasMinMax) {
                const max = optionsLimits.max;
                const min = optionsLimits.min;
    
                const hasExceeded = typeof max === "number" && value > max
                const hasDeceed = typeof max === "number" && value < min
    
                if (hasExceeded || hasDeceed) {
                    return new Error(`invalid value ${key}: ${value}, expected ${key} to range between ${min}, ${max}`)
                }

            }
            
            // Check if the value is one of the enum
            if (commandValueIsEnum && !optionsLimits.includes(value)) {
                return new Error(`invalid value ${key}: ${value} expected [${currentCommandLimits.toString()}]`); 
            }
        }
    }
}

export function parseDroneState(state: Buffer | string) {
    const stringState = Buffer.isBuffer(state) ? state.toString() : state;

    const reducer = (finalDataObject: object, nextDataPoint: string) => {
        if (!nextDataPoint.includes(":")) {
            return finalDataObject;
        }

        let [key, value] = nextDataPoint.split(":");
        let formattedValue;
        const isCommaSeperated = value.includes(",");

        if (isCommaSeperated) {
            formattedValue = value.split(",").map(val => (
                Number.isNaN(parseFloat(val)) ? val : parseFloat(val)
            ));
        } else {
            formattedValue = Number.isNaN(parseFloat(value)) ? value : parseFloat(value);
        }

        return { ...finalDataObject, [key]: formattedValue === undefined ? value : formattedValue };
    };

    return stringState.split(";").reduce(reducer, {});
}

export function formatCommand(command: ValidCommands, options: ValidCommandOptions) {
    let formattedCommand = command;

    for (const value of Object.values(options)) {
        formattedCommand += ` ${value}`;
    }

    return formattedCommand;
}
