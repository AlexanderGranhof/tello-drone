# tello-drone

### Disclaimer:

Im a student learning how to work and publish packages on NPM. This is a simple package that allows you to communicate with a DJI Tello drone in a much easier way. Any feedback / help / improvement is appreaciated and i will hopefully be able to look into fixing bugs and such when i can.

This project is currently a work in progress, but as of 1.0.1 it can communicate with a tello drone with the sample code bellow.

## Changelog
You can see the latest changes in the **CHANGELOG.md** file in the root of this repository

## v3.0.0 Breaking changes
- Package is now only async.
- Removed offsetBuffer and async option from config.
- Removed DELAYS attribute from the tello-data.json and the tello package.

### v3.0.0 General changes
- Replaced large sections of the code that could be replaced with native node modules, such as events and assert.
- Added testing and linting

## Information

The goal of this package is to provide an independent (no dependecies), simple and easy-to-use interface between nodejs and a tello drone. You can communicate with the drone asynchronously. When you connect to the drone it **automatically sends the 'command' command**, so that is not nececary.

## Error handling

The drone gives no feedback on errors. Command verification is already built in, it will throw an error if a command is invalid.
If you recieve back an error and the drone does not execute the command, the most common reason in my experience is low battery.
Charging the battery and trying again solves that error issue.

## Methods and options

Note that all the parameters for a command needs to be an object as a second parameter to the send command. You can reference the [tello documentation here](https://dl-cdn.ryzerobotics.com/downloads/tello/20180910/Tello%20SDK%20Documentation%20EN_1.3.pdf) to what parameters needs to go along with a specific command. Its important that the parameters in the object **needs to be in the same order** as in the tello documentation. For commands that only has a single value (usually x in the tello documentation) you only need to pass in an object such as `{ value: 60 }`.

Below is a general description of all the parameters and events:

```js
const Tello = require("tello-drone");

// All option parameters are optional, default values shown
const drone = new Tello({
      host: "192.168.10.1",     // manually set the host.
      port: "8889",             // manually set the port.
      statePort: "8890",        // manually set the state port.
      skipOK: false,            // dont send the OK message.
})

// Sends a command to the drone
drone.send("battery?")

// Sends a command to the drone without verifying the command
drone.forceSend("battery?")

// Attaches a callback to a specific event
drone.on(event, callback)

/** All events of the on method
 * connection   - Fired when connected to the drone.             callback()
 * state        - Fired when the drone sends its state message.  callback(stateObject, udpConnection)
 * send         - Fired when a command is sent.                  callback(error, messageLength)
 * message      - Fired when the drone sends a status message.   callback(message, udpConnection)
 */

```

# Code example

```js
const Tello = require("tello-drone");

const drone = new Tello();

drone.on("connection", () => {
    console.log("Connected to drone");
});

drone.on("state", state => {
    console.log("Recieved State > ", state);
});

drone.on("send", (err, length) => {
    if (err) console.log(err);

    console.log(`Sent command is ${length} long`);
});

drone.on("message", message => {
    console.log("Recieved Message > ", message);
});

drone.on("connection", async () => {
    try {
        await drone.send("takeoff");
        await drone.send("flip", { value: "f" });
        await drone.send("land");
    } catch (error) {
        console.log(error)
        drone.send("land")
        //A short delay so that the land command can be sent before exiting
        setTimeout(process.exit)
    }
});
```

# Video demo

[![Youtube video, broken :/](http://img.youtube.com/vi/pxh4rlVNd4E/0.jpg)](http://www.youtube.com/watch?v=pxh4rlVNd4E "NPM tello-drone v2.0.0 demo")

## Avaliable commands to send

Tellos official SDK documentation with all commands:

#### Check your firmware version for the right manual (most likely 1.3)

1.0: https://dl-cdn.ryzerobotics.com/downloads/tello/0228/Tello+SDK+Readme.pdf

1.3: https://dl-cdn.ryzerobotics.com/downloads/tello/20180910/Tello%20SDK%20Documentation%20EN_1.3.pdf

2.0: https://dl-cdn.ryzerobotics.com/downloads/Tello/Tello%20SDK%202.0%20User%20Guide.pdf

Here are the most used ones:
**command, takeoff, land, up, down, left, right, forward, back, flip, speed, speed?, battery?**
