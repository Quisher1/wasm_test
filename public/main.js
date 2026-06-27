console.log("main.js loaded");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let wasmReady = false;
let cameraReady = false;

// =========================
// WASM
// =========================
Module.onRuntimeInitialized = () =>
{
    console.log("WASM ready");
    wasmReady = true;

    if (cameraReady)
        requestAnimationFrame(loop);
};

// =========================
// Camera
// =========================
async function startCamera()
{
    try
    {
        // Get permission
        const tempStream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Stop temporary stream
        tempStream.getTracks().forEach(track => track.stop());

        const cameras = devices.filter(
            d => d.kind === "videoinput"
        );

        console.table(cameras);

        let rearCamera = cameras.find(c =>
        {
            const label = c.label.toLowerCase();

            return label.includes("back") ||
                   label.includes("rear") ||
                   label.includes("environment");
        });

        let stream;

        if (rearCamera)
        {
            console.log("Using:", rearCamera.label);

            stream = await navigator.mediaDevices.getUserMedia({
                video:
                {
                    deviceId:
                    {
                        exact: rearCamera.deviceId
                    }
                },
                audio: false
            });
        }
        else
        {
            console.log("Rear camera label not found. Trying facingMode.");

            stream = await navigator.mediaDevices.getUserMedia({
                video:
                {
                    facingMode:
                    {
                        ideal: "environment"
                    }
                },
                audio: false
            });
        }

        video.srcObject = stream;

        video.onloadedmetadata = () =>
        {
            video.play();

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            cameraReady = true;

            console.log(
                "Resolution:",
                canvas.width,
                "x",
                canvas.height
            );

            if (wasmReady)
                requestAnimationFrame(loop);
        };
    }
    catch (e)
    {
        console.error(e);
    }
}

startCamera();

// =========================
// WASM Loop
// =========================
function loop()
{
    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const ptr = Module._malloc(imageData.data.length);

    Module.HEAPU8.set(imageData.data, ptr);

    Module._process(
        ptr,
        canvas.width,
        canvas.height
    );

    imageData.data.set(
        Module.HEAPU8.subarray(
            ptr,
            ptr + imageData.data.length
        )
    );

    Module._free(ptr);

    ctx.putImageData(imageData, 0, 0);

    requestAnimationFrame(loop);
}