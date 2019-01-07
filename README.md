# tello-drone

### Disclaimer:
Im a student learning how to work and publish packages on NPM. This is a simple package that allows you to communicate with a DJI Tello drone in a much easier way. Any feedback / help / improvement is appreaciated and i will hopefully be able to look into fixing bugs and such when i can.

This project is currently a work in progress, but as of 1.0.1 it can communicate with a tello drone with the sample code bellow.

# Example

```js
const tello = require("tello-drone");

const drone = tello.connect();

drone.on("connection", () => {
    console.log("Listening");
});

drone.on("state", state => {
    console.log("Recieved State > ", state);
});

drone.on("error", err => {
    console.log("Recieved Error > ", err);
});

drone.on("send", (err, length) => {
    if (err) console.log(err);

    console.log(`Sent command is ${length} long`);
});

drone.on("message", message => {
    console.log("Recieved Message > ", message);
});

drone.send("battery?");

```

## Avaliable commands to send
Tellos official SDK documentation with all commands:

https://dl-cdn.ryzerobotics.com/downloads/Tello/Tello%20SDK%202.0%20User%20Guide.pdf

Here are the most used ones:
**command, takeoff, land, up, down, left, right, forward, back, flip, speed, speed?, battery?**
