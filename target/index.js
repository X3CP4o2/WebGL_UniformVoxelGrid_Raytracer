"use strict";
document.addEventListener('DOMContentLoaded', onDocumentReady);
function onDocumentReady() {
    console.log("onDocumentReady");
    Promise.all([
        fetch("../assets/shaders/ray_vert.glsl"),
        fetch("../assets/shaders/ray_frag.glsl")
    ]).then(result => Promise.all(result.map((response) => response.text()))).then(onShadersLoaded);
}
let canvas;
let gl;
let cameraUniformLocation;
const camPos = [5, 4, -5];
const dimension = 16;
const worldBounds = [dimension, dimension, dimension];
function onShadersLoaded([vertexShader, fragmentShader]) {
    canvas = document.querySelector("#glCanvas");
    gl = canvas.getContext("webgl2");
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const program = createShaderProgram(gl, [vertexShader, fragmentShader]);
    gl.useProgram(program);
    // POSITION
    const positionAttributeLocation = gl.getAttribLocation(program, "iPosition");
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positionArray = new Float32Array([
        -1, -1,
        3, -1,
        -1, 3
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positionArray, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    // RESOLUTION
    const resolutionUniformLocation = gl.getUniformLocation(program, "uResolution");
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    // CAMERA
    cameraUniformLocation = gl.getUniformLocation(program, "uCamera");
    gl.uniform3f(cameraUniformLocation, camPos[0], camPos[1], camPos[2]);
    // LIGHT TODO: ARRAY
    const lightUniformLocation = gl.getUniformLocation(program, "uLight");
    gl.uniform3f(lightUniformLocation, 5, 4, -5);
    // VOXEL SIZE 
    const voxelSize = 1;
    const voxelSizeUniformLocation = gl.getUniformLocation(program, "voxelSize");
    gl.uniform1f(voxelSizeUniformLocation, voxelSize);
    // WORLD BOUNDS & CREATE DATA
    const worldBoundsUniformLocation = gl.getUniformLocation(program, "worldBounds");
    gl.uniform3f(worldBoundsUniformLocation, dimension * voxelSize, dimension * voxelSize, dimension * voxelSize);
    const filledDim = 4;
    const dataArray = new Uint8Array(Math.pow(dimension, 3));
    const lowerFunc = (cur) => cur >= filledDim / 2;
    const upperFunc = (cur) => cur <= filledDim;
    const tDimToFlat = (x, y, z) => x + (y * dimension) + (z * Math.pow(dimension, 2));
    const getRandom = () => Math.random() * Math.pow((dimension - 1), 3);
    const amount = getRandom();
    for (let i = 0; i < amount; i++) {
        const index = Math.floor(getRandom());
        dataArray[index] = Math.floor(Math.random() * 4);
    }
    // for (let x = 0; x < dimension; x++) {
    //     for (let y = 0; y < dimension; y++) {
    //         for (let z = 0; z < dimension; z++) {
    //             // lowerFunc(x) && lowerFunc(y) && lowerFunc(z) &&
    //             if ( upperFunc(x) && upperFunc(y) && upperFunc(z)) {
    //                 const index = tDimToFlat(x, y, z);
    //                 dataArray[
    //                     index
    //                 ] = index % 4;
    //             }
    //         }
    //     }
    // }
    const testIndex = 0;
    console.log("Color at ", testIndex, " : ", dataArray[tDimToFlat(testIndex, testIndex, testIndex)]);
    // CREATE TEXTURE
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8UI, dimension, dimension, dimension, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, dataArray);
    // gl.generateMipmap(gl.TEXTURE_3D);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const textureLocation = gl.getUniformLocation(program, "uVoxelData");
    gl.uniform1f(textureLocation, 0);
    console.log("Loaded");
    lastTime = Date.now();
    initKeybindings();
    window.requestAnimationFrame(onRender);
}
const inputTable = {};
function onKeydown(keyEvent) {
    inputTable[keyEvent.key] = true;
}
function onKeyup(keyEvent) {
    inputTable[keyEvent.key] = false;
}
function initKeybindings() {
    document.addEventListener('keypress', onKeydown);
    document.addEventListener('keyup', onKeyup);
}
let lastTime;
let count = 0n;
let accumulated = 0;
let high = 0;
function onRender() {
    window.requestAnimationFrame(onRender);
    count++;
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;
    if (deltaTime > high) {
        high = deltaTime;
    }
    // console.log("FPS: ", 1000 / deltaTime);
    // CLEAR
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    //DRAW
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    setTimeout(() => onUpdate(1 / deltaTime));
}
function onUpdate(deltaTime) {
    const speed = 1;
    let changed = false;
    if (inputTable["a"]) {
        camPos[0] = camPos[0] - speed * deltaTime;
        changed = true;
    }
    if (inputTable["d"]) {
        camPos[0] = camPos[0] + speed * deltaTime;
        changed = true;
    }
    if (inputTable["q"]) {
        camPos[1] = camPos[1] + speed * deltaTime;
        changed = true;
    }
    if (inputTable["e"]) {
        camPos[1] = camPos[1] - speed * deltaTime;
        changed = true;
    }
    if (inputTable["w"]) {
        camPos[2] = camPos[2] + speed * deltaTime;
        changed = true;
    }
    if (inputTable["s"]) {
        camPos[2] = camPos[2] - speed * deltaTime;
        changed = true;
    }
    if (changed) {
        gl.uniform3f(cameraUniformLocation, camPos[0], camPos[1], camPos[2]);
    }
}
function createShaderProgram(gl, shaders) {
    const vertexShaderObj = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObj, shaders[0]);
    gl.compileShader(vertexShaderObj);
    const fragmentShaderObj = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObj, shaders[1]);
    gl.compileShader(fragmentShaderObj);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShaderObj);
    gl.attachShader(shaderProgram, fragmentShaderObj);
    gl.linkProgram(shaderProgram);
    return shaderProgram;
}
