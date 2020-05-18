const assert = require("assert").strict;
import { verifyCommand, parseDroneState, formatCommand } from "../src/utility";
import { ValidCommands } from "../src/types/commands.types";

describe("tello-drone library", function () {
    it("Can parse a tello state (v???)", function () {
        const state = "mid:0;x:0;y:0;z:0;mpry:0,0,0;pitch:0;roll:0;yaw:0;vgx:0;vgy:0;vgz:0;templ:60;temph:62;tof:10;h:0;bat:94;baro:-16.92;time:0;agx:13.00;agy:-10.00;agz:-998.00;\r\n";
        const expected = { mid: 0, x: 0, y: 0, z: 0, mpry: [0, 0, 0], pitch: 0, roll: 0, yaw: 0, vgx: 0, vgy: 0, vgz: 0, templ: 60, temph: 62, tof: 10, h: 0, bat: 94, baro: -16.92, time: 0, agx: 13.00, agy: -10.00, agz: -998.00 };

        const actual = parseDroneState(state);

        assert.deepEqual(expected, actual);
    });

    it("Can parse a tello state (v01.04.91.01)", function () {
        const state = "pitch:0;roll:0;yaw:0;vgx:0;vgy:0;vgz:0;templ:74;temph:76;tof:10;h:0;bat:81;baro:70.96;time:0;agx:3.00;agy:-3.00;agz:-1000.00;";
        const expected = { pitch: 0, roll: 0, yaw: 0, vgx: 0, vgy: 0, vgz: 0, templ: 74, temph: 76, tof: 10, h: 0, bat: 81, baro: 70.96, time: 0, agx: 3.00, agy: -3.00, agz: -1000.00 };

        const actual = parseDroneState(state);

        assert.deepEqual(expected, actual);
    });

    it("Can verify valid and invalid commands", function () {
        // Valid commands / options

        const noOptionCommands = ["command", "takeoff", "land", "streamon"];
        const optionCommands = ["up", "down", "ccw", "flip", "curve"];
        const options = [{ value: 200 }, { value: 50 }, { value: 180 }, { value: "r" }, { x1: 250, y1: 100, x2: 100, y2: 50, speed: 30 }];

        for (const command of noOptionCommands) {
            assert.equal(verifyCommand(command as ValidCommands), undefined);
        }

        for (let i = 0; i < optionCommands.length; i++) {
            const command = optionCommands[i];
            const option = options[i];

            assert.equal(verifyCommand(command as ValidCommands, option), undefined);
        }

        // Invalid commands / args

        const invalidNoOptionCommands = ["im", "not", "a", "validCommand"];
        const invalidOptions = [{ value: 2000 }, { value: 5000 }, { value: 18000 }, { value: "j" }, { x1: 25000, y1: 10000, x2: 10000, y2: 5000, speed: 3000 }];

        for (const command of invalidNoOptionCommands) {
            // @ts-ignore we are intentionally failing
            assert.equal(verifyCommand(command) instanceof Error, true);
        }

        for (let i = 0; i < optionCommands.length; i++) {
            const command = optionCommands[i];
            const option = invalidOptions[i];

            // @ts-ignore we are intentionally failing
            assert.equal(verifyCommand(command, option) instanceof Error, true);
        }
    });

    it("Can format command with options", function () {
        const command = "ccw";
        const options = { x1: 250, y1: 100, x2: 100, y2: 50, speed: 30 };

        const result = formatCommand(command, options);

        assert.equal(result.split(" ").length, 1 + Object.values(options).length);
        assert.deepEqual(
            [command, ...Object.values(options)].map(val => val.toString()),
            result.split(" "),
        );
    });
});
