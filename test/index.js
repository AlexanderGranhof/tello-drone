const assert = require("assert");
const { parseDroneState } = require("../lib/utility");

describe("tello-drone library", () => {
    it("Can parse a tello state (v???)", () => {
        const state = 'mid:0;x:0;y:0;z:0;mpry:0,0,0;pitch:0;roll:0;yaw:0;vgx:0;vgy:0;vgz:0;templ:60;temph:62;tof:10;h:0;bat:94;baro:-16.92;time:0;agx:13.00;agy:-10.00;agz:-998.00;\r\n';
        const expected = {mid:0,x:0,y:0,z:0,mpry: [0,0,0],pitch:0,roll:0,yaw:0,vgx:0,vgy:0,vgz:0,templ:60,temph:62,tof:10,h:0,bat:94,baro:-16.92,time:0,agx:13.00,agy:-10.00,agz:-998.00};

        const actual = parseDroneState(state);

        assert.deepEqual(expected, actual)
    });

    it("Can parse a tello state (v01.04.91.01)", () => {
        const state = 'pitch:0;roll:0;yaw:0;vgx:0;vgy:0;vgz:0;templ:74;temph:76;tof:10;h:0;bat:81;baro:70.96;time:0;agx:3.00;agy:-3.00;agz:-1000.00;';
        const expected = {pitch:0,roll:0,yaw:0,vgx:0,vgy:0,vgz:0,templ:74,temph:76,tof:10,h:0,bat:81,baro:70.96,time:0,agx:3.00,agy:-3.00,agz:-1000.00,};

        const actual = parseDroneState(state);

        assert.deepEqual(expected, actual)
    });
})