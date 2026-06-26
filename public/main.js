console.log("main.js loaded");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let wasmReady = false;
let cameraReady = false;

// =============================
// Initialize WASM
// =============================
Module.onRuntimeInitialized = () =>
{
    console.log("WASM ready");
    wasmReady = true;

    if (cameraReady)
        requestAnimationFrame(loop);
};

// =============================
// Start Back Camera
// =============================
async function startCamera()
{
    // Ask permission first
    await navigator.mediaDevices.getUserMedia({
        video: true
    });

    const devices = await navigator.mediaDevices.enumerateDevices();

    const cameras = devices.filter(
        d => d.kind === "videoinput"
    );

    console.log(cameras);

    let camera = cameras.find(d =>
    {
        const label = d.label.toLowerCase();

        return label.includes("back") ||
               label.includes("rear") ||
               label.includes("environment");
    });

    if (!camera)
        camera = cameras[cameras.length - 1];

    const stream = await navigator.mediaDevices.getUserMedia({
        video:
        {
            deviceId:
            {
                exact: camera.deviceId
            }
        }
    });

    video.srcObject = stream;

    video.onloadedmetadata = () =>
    {
        video.play();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        cameraReady = true;

        if (wasmReady)
            requestAnimationFrame(loop);
    };
}

startCamera();

// =============================
// Processing Loop
// =============================
function loop()
{
    // Draw current frame to canvas
    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Read pixels
    const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const data = imageData.data;

    // Allocate WASM memory
    const ptr = Module._malloc(data.length);

    // Copy pixels into WASM
    Module.HEAPU8.set(data, ptr);

    // Call your C++ function
    Module._process(
        ptr,
        canvas.width,
        canvas.height
    );

    // Copy processed image back
    imageData.data.set(
        Module.HEAPU8.subarray(
            ptr,
            ptr + data.length
        )
    );

    Module._free(ptr);

    // Display result
    ctx.putImageData(imageData, 0, 0);

    requestAnimationFrame(loop);
}
