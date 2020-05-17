import { AddressInfo } from "net";

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
};

export interface DroneEvents {
    connection: () => void;
    state: (state: DroneState, udpConnection: AddressInfo) => void;
    send: (error: Error, messageLength: Number) => void;
    message: (message: string, udpConnection: AddressInfo) => void;
}

// https://www.typescriptlang.org/docs/handbook/generics.html
export interface DroneEventEmitter<T> {
    on<K extends keyof T>(event: K, callback: T[K]): void;
}

