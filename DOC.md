# Command documentation

### Connecting to the drone
Make sure you are connected to the drone's wifi. Then you can run the following:
```js
const tello = require("tello-drone");

const drone = tello.connect();
```

### Takeoff
Tello auto takeoff
```js
await drone.send("takeoff");
```

### Land
Tello auto land
```js
await drone.send("land");
```

### Streamon
Set video stream on.
Note that getting the video data from the library is currently not supported. Its recommended to use ffmpeg or something similar.
```js
await drone.send("streamon");
```

### Streamoff
Set video stream off.
```js
await drone.send("streamoff");
```

### Emergency
Stop all motors immediately.
```js
await drone.send("emergency")
```

### Up
Tello fly up with distance X cm. X must be between 20-500
```js
await drone.send("up", { value: 50 })
```

### Down
Tello fly down with distance X cm. X must be between 20-500
```js
await drone.send("down", { value: 50 })
```

### Left
Tello fly left with distance X cm. X must be between 20-500
```js
await drone.send("left", { value: 50 })
```

### Right
Tello fly right with distance X cm. X must be between 20-500
```js
await drone.send("right", { value: 50 })
```

### Forward
Tello fly forward with distance X cm. X must be between 20-500
```js
await drone.send("forward", { value: 50 })
```

### Back
Tello fly back with distance X cm. X must be between 20-500
```js
await drone.send("back", { value: 50 })
```

### CW
Tello rotate X degree clockwise. X must be between 1-3600
```js
await drone.send("cw", { value: 80 })
```

### CCW
Tello rotate X degree counter-clockwise. X must be between 1-3600
```js
await drone.send("cw", { value: 80 })
```

### Flip
Tello fly flip x. X must be one of the following values: `"l", "r", "f", "b"`
```js
await drone.send("flip", { value: "f" })
```

### Go
Tello fly to x y z in speed (cm/s).
x: 20-500
y: 20-500
z: 20-500
speed: 10-100
```js
await drone.send("go", { x: 50, y: 90, z: 20, speed: 30 })
```
