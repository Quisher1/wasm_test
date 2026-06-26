console.log("main.js loaded");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let wasmReady = false;
let cameraReady = false;

// WASM initialization
Module.onRuntimeInitialized = () =>
{
    console.log("WASM ready");
    wasmReady = true;

    if (cameraReady)
        requestAnimationFrame(loop);
};

// Start camera
async function startCamera()
{
    try
    {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () =>
        {
            video.play();

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            cameraReady = true;

            console.log(
                `Camera ready: ${canvas.width} x ${canvas.height}`
            );

            if (wasmReady)
                requestAnimationFrame(loop);
        };
    }
    catch (err)
    {
        console.error("Cannot access camera:", err);
    }
}

startCamera();

function loop()
{
    // Draw current camera frame
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

    // Copy image to WASM
    Module.HEAPU8.set(data, ptr);

    // Process image
    Module._process(
        ptr,
        canvas.width,
        canvas.height
    );

    // Copy processed image back
    const result = Module.HEAPU8.subarray(
        ptr,
        ptr + data.length
    );

    imageData.data.set(result);

    // Display processed image
    ctx.putImageData(imageData, 0, 0);

    Module._free(ptr);

    requestAnimationFrame(loop);
}
