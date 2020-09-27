const DEGREE_TO_RADIUS = Math.PI / 180;
const CAMERA_POSITION = vec3.fromValues(0.0, 0.0, 10.0)
var mVertices = [];
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mScale = 1.0;
var mProjectionMatrix = mat4.create();
var mModelMatrix = mat4.create();
var mViewMatrix = mat4.create();
var mProgram = null;
var mContinuous = true;
var mThen = 0;
var mBuffers = null;
var mGl = null;

function main() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    mGl = canvas.getContext("webgl") || canvas.getContext('experimental-webgl');

    // Only continue if WebGL is available and working
    if (!mGl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    mViewportWidth = canvas.clientWidth;
    mViewportHeight = canvas.clientHeight;
    mGl.viewport(0, 0, mViewportWidth, mViewportHeight);

    // create view matrix
    mViewMatrix = mat4.create();
    mat4.lookAt(mViewMatrix, CAMERA_POSITION, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0));

    // Create a perspective matrix
    const fov = 45 * DEGREE_TO_RADIUS;   // in radians
    const aspect = mGl.canvas.clientWidth / mGl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000.0;

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mProjectionMatrix = mat4.create();
    mat4.perspective(mProjectionMatrix, fov, aspect, zNear, zFar);

    // init shader
    updateShader();

    mBuffers = initBuffers(mGl);
    
    requestAnimationFrame(render);
}

// Draw the scene repeatedly
function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - mThen;
    mThen = now;
    // draw scene
    drawScene(mGl, mProgram, mBuffers, deltaTime);

    if (mContinuous)
        requestAnimationFrame(render);
}

function updateShader() {
    // Vertex shader program
    const vsSource = document.getElementById('id_vertex_shader').value;
    // Fragment shader program
    const fsSource = document.getElementById('id_fragment_shader').value;

    // Initialize a shader program
    const vertexShader = loadShader(mGl, mGl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(mGl, mGl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    const shaderProgram = mGl.createProgram();
    mGl.attachShader(shaderProgram, vertexShader);
    mGl.attachShader(shaderProgram, fragmentShader);
    mGl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!mGl.getProgramParameter(shaderProgram, mGl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + mGl.getProgramInfoLog(shaderProgram));
        return null;
    }

    // Collect all the info needed to use the shader program
    mProgram = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: mGl.getAttribLocation(shaderProgram, 'aPosition'),
        },
        uniformLocations: {
            uProjectionMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            uViewMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uViewMatrix'),
        },
    };
}

// creates a shader of the given type, uploads the source and compiles it.
function loadShader(mGl, type, source) {
    const shader = mGl.createShader(type);
  
    // Send the source to the shader object
    mGl.shaderSource(shader, source);
  
    // Compile the shader program
    mGl.compileShader(shader);
  
    // See if it compiled successfully
    if (!mGl.getShaderParameter(shader, mGl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + mGl.getShaderInfoLog(shader));
        mGl.deleteShader(shader);
        return null;
    }
  
    return shader;
}

function initBuffers(gl) {
    // Now create an array of positions for the plane
    mVertices = createPlane(3, 3, 1, 1);

    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mVertices), gl.STATIC_DRAW);

    return {
        position: positionBuffer
    };
}

function createPlane(width, height, rows, cols) {
    const widthSize = width / rows;
    const heightSize = height / cols;
    // const vCnt = cols * rows * 6;
    var vertices = [];
    var count = 0;
    for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
            var zsx = -widthSize * cols / 2 + i * widthSize;
            var zsy = heightSize * rows / 2 - j * heightSize;
            var zsz = 0;

            vertices[count++] = zsx;
            vertices[count++] = zsy;
            vertices[count++] = zsz;
            
            vertices[count++] = zsx;
            vertices[count++] = zsy - heightSize;
            vertices[count++] = zsz;
            
            vertices[count++] = zsx + widthSize;
            vertices[count++] = zsy;
            vertices[count++] = zsz;
            
            vertices[count++] = zsx + widthSize;
            vertices[count++] = zsy;
            vertices[count++] = zsz;
            
            vertices[count++] = zsx;
            vertices[count++] = zsy - heightSize;
            vertices[count++] = zsz;
                            
            vertices[count++] = zsx + widthSize;
            vertices[count++] = zsy - heightSize;
            vertices[count++] = zsz; 
        }
    }
    
    return vertices;
}

function onKeyPress(event) {
    switch (String.fromCharCode(event.keyCode)) {
        case 'P':
        case 'p':
            pause();
            break;
        case 'R':
        case 'r':
            resume();
            break;
        default:
            break;
    }
}

function pause() {
    mContinuous = false;
}

function resume() {
    mContinuous = true;
    requestAnimationFrame(render);
}

function drawScene(gl, programInfo, buffers, deltaTime) {
    // Update the rotation for the next draw
    mYawing -= deltaTime * 0.38;
    mPitching += deltaTime * 0.1;

    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the drawing position to the "identity" point, which is the center of the scene.
    mModelMatrix = mat4.create();
    mat4.translate(mModelMatrix,     // destination matrix
                   mModelMatrix,     // matrix to translate
                   [-0.0, 0.0, -0.0]);  // amount to translate

    mat4.rotate(mModelMatrix,  // destination matrix
                mModelMatrix,  // matrix to rotate
                mPitching,     // amount to rotate in radians
                [1, 0, 0]);    // axis to rotate around
    mat4.rotate(mModelMatrix,  // destination matrix
                mModelMatrix,  // matrix to rotate
                mYawing,       // amount to rotate in radians
                [0, 1, 0]);    // axis to rotate around
    mat4.scale(mModelMatrix, mModelMatrix, [mScale, mScale, mScale]);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }
    
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uProjectionMatrixHandle,
        false, mProjectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uViewMatrixHandle,
        false, mViewMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uModelMatrixHandle,
        false, mModelMatrix);

    const offset = 0;
    gl.drawArrays(gl.TRIANGLES, offset, mVertices.length / 3);
}