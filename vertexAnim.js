const DEGREE_TO_RADIUS = Math.PI / 180;
const CAMERA_POSITION = vec3.fromValues(0.0, 0.0, 10.0);
const PLANE_WIDTH = 3;
const PLANE_HEIGHT = 3;
var mPlaneTexture = null;
var mVertices = [];
var mTexCoods = [];
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mAngle = 0.0;
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

    mPlaneTexture = loadTexture(mGl, './texture/ming.jpg');

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
            textureCoord: mGl.getAttribLocation(shaderProgram, 'aTexCoord')
        },
        uniformLocations: {
            uProjectionMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            uViewMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            uWidthSpanHandle: mGl.getUniformLocation(shaderProgram, 'uWidthSpan'),
            uHeightSpanHandle: mGl.getUniformLocation(shaderProgram, 'uHeightSpan'),
            uAngleHandle: mGl.getUniformLocation(shaderProgram, 'uAngle'),
            uTexSamplerHandle: mGl.getUniformLocation(shaderProgram, 'uTexSampler')
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
    const rows = 8;
    const cols = 8;
    mVertices = createPlaneVertices(4, 3, rows, cols);
    mTexCoods = generateTexCoord(rows, cols);

    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mTexCoods), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        uv: uvBuffer
    };
}

// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 255, 255, 255]);
    // 1表示翻转，0表示不翻转，参考 https://juejin.im/post/5d4423c4f265da038f47ef87
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);
  
    const image = new Image();
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);
  
      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         // Yes, it's a power of 2. Generate mips.
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
         gl.generateMipmap(gl.TEXTURE_2D);
      } else {
         // No, it's not a power of 2. Turn off mips and set
         // wrapping to clamp to edge
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
    };
    image.src = url;
  
    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function createPlaneVertices(width, height, rows, cols) {
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

function generateTexCoord(rows, cols) {
    var result = [];
    var sizeW = 1.0 / rows;
    var sizeH = 1.0 / cols;
    var index = 0;
    for(var i = 0; i < cols; i++) {
        for(var j = 0; j < rows; j++) {
            var s = j * sizeW;
            var t = i * sizeH;
            
            result[index++] = s;
            result[index++] = t;
            
            result[index++] = s;
            result[index++] = t + sizeH;
            
            result[index++] = s + sizeW;
            result[index++] = t;
            
            
            result[index++] = s + sizeW;
            result[index++] = t;
            
            result[index++] = s;
            result[index++] = t + sizeH;
            
            result[index++] = s + sizeW;
            result[index++] = t + sizeH;    			
        }
    }

    return result;
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
    // mYawing -= deltaTime * 0.38;
    // mPitching += deltaTime * 0.1;
    mAngle += 0.6 * (Math.PI / 16);

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

    // Tell WebGL how to pull out the texture coordinates from the texture 
    // coordinate buffer into the textureCoord attribute.
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.textureCoord);
    }
    
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Specify the diffuseTexture to map onto the faces.
    // Tell WebGL we want to affect diffuseTexture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the diffuseTexture to diffuseTexture unit 0
    gl.bindTexture(gl.TEXTURE_2D, mPlaneTexture);
    // Tell the shader we bound the diffuseTexture to diffuseTexture unit 0
    gl.uniform1i(programInfo.uniformLocations.uTexSamplerHandle, 0);

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
    gl.uniform1f(programInfo.uniformLocations.uWidthSpanHandle, PLANE_WIDTH);
    gl.uniform1f(programInfo.uniformLocations.uHeightSpanHandle, PLANE_HEIGHT);
    gl.uniform1f(programInfo.uniformLocations.uAngleHandle, mAngle);

    const offset = 0;
    gl.drawArrays(gl.TRIANGLES, offset, mVertices.length / 3);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
}