import { AddressInfo } from "net";
import { EventEmitter } from "events";
import dgram from "dgram";

export interface TelloDrone {
    HOST: string;
    MAIN_PORT: number;
    STATE_PORT: number;
    droneIO: dgram.Socket;
    droneState: dgram.Socket;
    connected: boolean;
    events: EventEmitter;
}

export interface DroneState {
    pitch: number,
    roll: number,
    yaw: number,
    vgx: number,
    vgy: number,
    vgz: number,
    templ: number,
    temph: number,
    tof: number,
    h: number,
    bat: number,
    baro: number,
    time: number,
    agx: number,
    agy: number,
    agz: number
}

export interface DroneOptions {
    host: string;
    port: number;
    statePort: number;
    skipOk: boolean;
}

export interface DroneEvents {
    connection: () => void;
    state: (state: DroneState, udpConnection: AddressInfo) => void;
    send: (error: Error, messageLength: Number) => void;
    message: (message: string, udpConnection: AddressInfo) => void;
}

// https://www.typescriptlang.org/docs/handbook/generics.html
export type DroneEventEmitter = <K extends keyof DroneEvents>(event: K, callback: DroneEvents[K]) => void
