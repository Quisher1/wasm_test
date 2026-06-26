console.log("main.js loaded");

const img = document.getElementById("img");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let wasmReady = false;
let imageReady = false;

let imageData = null;

function tryRun()
{
    if (!wasmReady || !imageReady)
        return;

    console.log("running C++");

    const data = imageData.data;

    const ptr = Module._malloc(data.length);

    Module.HEAPU8.set(data, ptr);

    Module._process(
        ptr,
        canvas.width,
        canvas.height
    );

    const result =
        Module.HEAPU8.subarray(
            ptr,
            ptr + data.length
        );

    imageData.data.set(result);

    ctx.putImageData(imageData, 0, 0);

    Module._free(ptr);

    console.log("processing finished");
}

// WASM init (ONLY ONCE)
Module.onRuntimeInitialized = () =>
{
    console.log("wasm ready");
    wasmReady = true;
    // tryRun();
    loop();
};

// IMAGE load
function processImage()
{
    console.log("image loaded");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    imageReady = true;

    tryRun();
}

// IMPORTANT: avoid double handler confusion
if (img.complete)
{
    processImage();
}
else
{
    img.onload = processImage;
}



function loop()
{
    const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const data = imageData.data;

    const ptr = Module._malloc(data.length);

    Module.HEAPU8.set(data, ptr);

    Module._process(
        ptr,
        canvas.width,
        canvas.height
    );

    const result =
        Module.HEAPU8.subarray(
            ptr,
            ptr + data.length
        );

    imageData.data.set(result);

    ctx.putImageData(imageData, 0, 0);

    Module._free(ptr);

    requestAnimationFrame(loop);
}