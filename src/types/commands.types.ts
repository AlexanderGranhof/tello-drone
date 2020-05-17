export type ValidCommands =
    "command" |
    "takeoff" |
    "land" |
    "streamon" |
    "streamoff" |
    "emergency" |
    "up" |
    "down" |
    "left" |
    "right" |
    "forward" |
    "back" |
    "cw" |
    "ccw" |
    "flip" |
    "go" |
    "curve" |
    "speed" |
    "rc" |
    "wifi" |
    "speed?" |
    "battery?" |
    "time?" |
    "wifi?" |
    "sdk?" |
    "sn?"
    ;

export interface ValidCommandOptions {
    value?: number | string,
    x?: number,
    y?: number,
    z?: number,
    x1?: number,
    y1?: number,
    z1?: number,
    x2?: number,
    y2?: number,
    z2?: number,
    speed?: number,
    a?: number,
    b?: number,
    c?: number,
    d?: number
}