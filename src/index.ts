console.log("1.1");
document.addEventListener('DOMContentLoaded', onDocumentReady);

function onDocumentReady() {
    console.log("onDocumentReady");


    Promise.all([
        fetch("../assets/shaders/ray_vert.glsl"),
        fetch("../assets/shaders/ray_frag.glsl")
    ]).then(
        result => Promise.all(result.map(
            (response) => response.text()
        ))
    ).then(
        onShadersLoaded
    );
}

let canvas: HTMLCanvasElement;
let gl: WebGL2RenderingContext;

let cameraUniformLocation: WebGLUniformLocation;
const camPos: [number, number, number] = [5, 4, -5];

let viewDirUniformLocation: WebGLUniformLocation;
const viewDir: [number, number, number] = [1, 1, 1];

let lightUniformLocation: WebGLUniformLocation;
const lightPos: [number, number, number] = [0, 0, 0];

let debugNormalsUniformLocation: WebGLUniformLocation;
let debugNormals = 0;

const dimension = 16;
const worldBounds: [number, number, number] = [dimension, dimension, dimension];


function onShadersLoaded([vertexShader, fragmentShader]: string[]) {
    canvas = document.querySelector("#glCanvas")! as HTMLCanvasElement;
    gl = canvas.getContext("webgl2")!;
    
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
    gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    // Debug Normals
    debugNormalsUniformLocation = gl.getUniformLocation(program, "debugNormals")!;
    gl.uniform1ui(debugNormalsUniformLocation, debugNormals);

    // RESOLUTION

    const resolutionUniformLocation = gl.getUniformLocation(program, "uResolution");
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // CAMERA
    cameraUniformLocation = gl.getUniformLocation(program, "uCamera")!;
    gl.uniform3f(cameraUniformLocation, camPos[0], camPos[1], camPos[2]);

    viewDirUniformLocation = gl.getUniformLocation(program, "uViewDir")!;
    gl.uniform3f(viewDirUniformLocation, viewDir[0], viewDir[1], viewDir[2]);

    // LIGHT TODO: ARRAY

    lightUniformLocation = gl.getUniformLocation(program, "uLight")!;
    gl.uniform3f(lightUniformLocation, lightPos[0], lightPos[1], lightPos[2]);

    // VOXEL SIZE 
    const voxelSize = 1;
    const voxelSizeUniformLocation = gl.getUniformLocation(program, "voxelSize");
    gl.uniform1f(voxelSizeUniformLocation, voxelSize);

    // WORLD BOUNDS & CREATE DATA

    const worldBoundsUniformLocation = gl.getUniformLocation(program, "worldBounds");
    gl.uniform3f(worldBoundsUniformLocation, dimension, dimension, dimension);

    const filledDim = 4;
    const dataArray = new Uint8Array(Math.pow(dimension, 3));

    const lowerFunc = (cur: number) => cur >= filledDim / 2;
    const upperFunc = (cur: number) => cur <= filledDim ;
    const tDimToFlat = (x: number, y: number, z: number) => x + (y * dimension) + (z * Math.pow(dimension, 2));


    const getRandom = () => Math.random() * Math.pow(( dimension - 1 ), 3);
    const amount = getRandom();

    for(let i = 0; i < amount; i++) {
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
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, texture);

    gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.R8UI,
        dimension,
        dimension,
        dimension,
        0,
        gl.RED_INTEGER,
        gl.UNSIGNED_BYTE,
        dataArray
    );

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

const inputTable: {[key: string]: boolean} = {};

function onKeydown(keyEvent: KeyboardEvent) {
    inputTable[keyEvent.key] = true;

    if(keyEvent.key === 'y') {
        debugNormals = debugNormals ? 0 : 1;
        gl.uniform1ui(debugNormalsUniformLocation, debugNormals);
    }
}

function onKeyup(keyEvent: KeyboardEvent) {
    inputTable[keyEvent.key] = false;
}

function initKeybindings() {
    document.addEventListener('keypress', onKeydown);
    document.addEventListener('keyup', onKeyup);
}

let lastTime: number;
let count = 0;

const samples = 60;
const sampleSize = Array(samples).map(_ => 0);

function onRender() {
    window.requestAnimationFrame(onRender);

    count++;
    const now = Date.now();
    const deltaTime = now - lastTime;
    lastTime = now;

    sampleSize[count % samples] = 1000 / deltaTime;

    const accumulated = sampleSize.reduce( (prev, cur) => prev + cur);
    const averageTime = Math.round(accumulated / samples);
    // console.log("Average fps: ", averageTime);

    // console.log("FPS: ", 1000 / deltaTime);
    // CLEAR
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //DRAW
    gl.drawArrays(
        gl.TRIANGLES,
        0,
        3
    );

    onUpdate(1 / deltaTime);
}

function onUpdate(deltaTime: number) {
    // deltaTime = 1;
    const speed = 1;

    let camChanged = false;

    if(inputTable["a"]) {
        camPos[0] = camPos[0] - speed * deltaTime;
        camChanged = true;
    }
    if(inputTable["d"]) {
        camPos[0] = camPos[0] + speed * deltaTime;
        camChanged = true;
    }   

    if(inputTable["q"]) {
        camPos[1] = camPos[1] + speed * deltaTime;
        camChanged = true;
    }
    if(inputTable["e"]) {
        camPos[1] = camPos[1] - speed * deltaTime;
        camChanged = true;
    }   

    if(inputTable["w"]) {
        camPos[2] = camPos[2] + speed * deltaTime;
        camChanged = true;
    }
    if(inputTable["s"]) {
        camPos[2] = camPos[2] - speed * deltaTime;
        camChanged = true;
    }

    let lightChanged = false;

    if(inputTable["f"]) {
        lightPos[0] = lightPos[0] - speed * deltaTime;
        lightChanged = true;
    }

    if(inputTable["h"]) {
        lightPos[0] = lightPos[0] + speed * deltaTime;
        lightChanged = true;
    }

    if(inputTable["r"]) {
        lightPos[1] = lightPos[1] + speed * deltaTime;
        lightChanged = true;
    }
    if(inputTable["z"]) {
        lightPos[1] = lightPos[1] - speed * deltaTime;
        lightChanged = true;
    }

    if(inputTable["t"]) {
        lightPos[2] = lightPos[2] + speed * deltaTime;
        lightChanged = true;
    }
    if(inputTable["g"]) {
        lightPos[2] = lightPos[2] - speed * deltaTime;
        lightChanged = true;
    }

    let viewDirChanged = false;

    // if(inputTable["1"]) {
    //     const r = Math.sqrt( Math.pow(viewDir[0], 2) + Math.pow(viewDir[1], 2) );
    //     const theta = Math.atan(viewDir[1] / viewDir[0]);

    //     const rotation = Math.PI / 4;

    //     viewDir[0] = r * Math.cos(theta + (rotation * deltaTime) );
    //     viewDir[1] = r * Math.sin(theta + (rotation * deltaTime) );

    //     viewDirChanged = true;
    // }

    // if(inputTable["2"]) {
    //     const r = Math.sqrt( Math.pow(viewDir[0], 2) + Math.pow(viewDir[2], 2) );
    //     const theta = Math.atan(viewDir[2] / viewDir[0]);

    //     const rotation = Math.PI / 8;

    //     viewDir[0] = r * Math.cos(theta + (rotation * deltaTime) );
    //     viewDir[2] = r * Math.sin(theta + (rotation * deltaTime) );

    //     viewDirChanged = true;
    // }

    // if(inputTable["3"]) {
    //     const r = Math.sqrt( Math.pow(viewDir[1], 2) + Math.pow(viewDir[2], 2) );
    //     const theta = Math.atan(viewDir[2] / viewDir[1]);

    //     const rotation = Math.PI / 8;

    //     viewDir[1] = r * Math.cos(theta + (rotation * deltaTime) );
    //     viewDir[2] = r * Math.sin(theta + (rotation * deltaTime) );

    //     viewDirChanged = true;
    // }

    
    if(camChanged) {
        camPos.forEach((val, index) => camPos[index] = Math.fround(val));
        console.log("CAM: ", camPos);
        gl.uniform3f(cameraUniformLocation, camPos[0], camPos[1], camPos[2]);
    }

    if(lightChanged) {
        lightPos.forEach((val, index) => lightPos[index] = Math.fround(val));
        console.log("Light: ", lightPos);
        gl.uniform3f(lightUniformLocation, lightPos[0], lightPos[1], lightPos[2]);
    }

    if(viewDirChanged) {
        console.log("ViewDir: ", viewDir);
        gl.uniform3f(viewDirUniformLocation, viewDir[0], viewDir[1], viewDir[2]);
    }
}

function createShaderProgram(gl: WebGL2RenderingContext, shaders: [string, string]) {

    const vertexShaderObj = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShaderObj, shaders[0]);
    gl.compileShader(vertexShaderObj);

    const fragmentShaderObj = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShaderObj, shaders[1]);
    gl.compileShader(fragmentShaderObj);

    const shaderProgram = gl.createProgram()!;

    gl.attachShader(shaderProgram, vertexShaderObj);
    gl.attachShader(shaderProgram, fragmentShaderObj);
    gl.linkProgram(shaderProgram);

    return shaderProgram;
}