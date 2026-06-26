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
    try
    {
        const stream = await navigator.mediaDevices.getUserMedia({
            video:
            {
                facingMode:
                {
                    ideal: "environment"
                }
            },
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () =>
        {
            video.play();

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            console.log(
                "Camera resolution:",
                canvas.width,
                "x",
                canvas.height
            );

            cameraReady = true;

            if (wasmReady)
                requestAnimationFrame(loop);
        };
    }
    catch (err)
    {
        console.error(err);
        alert("Cannot access camera.");
    }
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
