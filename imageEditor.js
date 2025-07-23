const DEGREE_TO_RADIUS = Math.PI / 180;
const CAMERA_POSITION = vec3.fromValues(0.0, 0.0, 10.0);
// 定义渲染模式常量
const RenderMode = {
    FULL:        1 << 0,  // 二进制: 00000001 (默认全屏模式)
    FIT:         1 << 1,  // 二进制: 00000010 (填充模式)
    FILL:        1 << 2,  // 二进制: 00000100 (适应模式)
    KEEP_SCALE:  1 << 3,  // 二进制: 00001000 (保持原始比例)
    WIDTH_FILL:  1 << 4,  // 二进制: 00010000 (宽度填充)
    HEIGHT_FILL: 1 << 5   // 二进制: 00100000 (高度填充)
  };

var mPlaneTextureInfo = null;
var mVertices = [];
var mTexCoods = [];
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mRolling = 0.0;
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
    // mat4.lookAt(mViewMatrix, CAMERA_POSITION, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0));

    // Create a perspective matrix
    // const fov = 45 * DEGREE_TO_RADIUS;   // in radians
    // const aspect = mGl.canvas.clientWidth / mGl.canvas.clientHeight;
    // const zNear = 0.1;
    // const zFar = 1000.0;

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mProjectionMatrix = mat4.create();
    // mat4.perspective(mProjectionMatrix, fov, aspect, zNear, zFar);

    mPlaneTextureInfo = loadTexture(mGl, './texture/image_edit.jpg');

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
    const rows = 12;
    const cols = 12;
    mVertices = createPlaneVertices();
    mTexCoods = generateTexCoord();

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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); 
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);
  
    const image = new Image();
    // 存储宽高的对象
    const textureInfo = {
        texture: texture,
        width: 0,  // 将在onload中更新
        height: 0,
        aspectRatio: 0
    };
    image.onload = function() {
      // 记录原始宽高
      textureInfo.width = image.width;
      textureInfo.height = image.height;
      textureInfo.aspectRatio = image.width / image.height;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);
  
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         // Yes, it's a power of 2. Generate mips.
         gl.generateMipmap(gl.TEXTURE_2D);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }
    };

    // 错误处理
    image.onerror = function() {
        console.error(`Failed to load texture: ${url}`);
    };

    image.src = url;
  
    return textureInfo;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function createPlaneVertices() {
    var vertices = [-1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0,  1.0, 0.0, 1.0,  1.0, 0.0];
    
    return vertices;
}

function generateTexCoord() {
    var result = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
    
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

function rotate() {
    mRolling = (mRolling + 90.0) % 360.0;
}

function calcScaleWithRenderMode(srcWidth, srcHeight, dstWidth, dstHeight, renderMode) {
    if (srcWidth == 0 || srcHeight == 0 || dstWidth == 0 || dstHeight == 0) {
        console.error("calcScaleWithRenderMode: invalid size");
        return { width: 0, height: 0 };
    }

    const srcRatio = srcWidth / srcHeight;
    const dstRatio = dstWidth / dstHeight;
    const sdwRatio = srcWidth / dstWidth;
    const sdhRatio = srcHeight / dstHeight;
    const srcHwRatio = srcHeight / srcWidth;
    const dstHwRatio = dstHeight / dstWidth;

    if ((renderMode & RenderMode.FULL) == RenderMode.FULL) {
        if ((renderMode & RenderMode.FILL) == RenderMode.FILL) {
            if (sdwRatio < sdhRatio) {
                return { width: 1, height: dstRatio / srcRatio };
            } else {
                return { width: srcRatio / dstRatio, height: 1 };
            }
        } else if ((renderMode & RenderMode.FIT) == RenderMode.FIT) {
            if ((renderMode & RenderMode.KEEP_SCALE) == RenderMode.KEEP_SCALE) {
                return { width: srcWidth / dstWidth, height: srcHeight / dstHeight };
            } else {
                if (sdwRatio > sdhRatio) {
                    return { width: 1, height: dstRatio / srcRatio };
                } else {
                    return { width: srcRatio / dstRatio, height: 1 };
                }
            }
        } else {
            console.error("wrong render mode 1");
            return { width: 1, height: 1 };
        }
    } else if ((renderMode & RenderMode.WIDTH_FILL) == RenderMode.WIDTH_FILL) {
        return { width: 1, height: srcHwRatio / dstHwRatio };
    } else if ((renderMode & RenderMode.HEIGHT_FILL) == RenderMode.HEIGHT_FILL) {
        return { width: dstHwRatio / srcHwRatio, height: 1 };
    } else {
        console.error("wrong render mode 2");
        return { width: 1, height: 1 };
    }
}

function drawScene(gl, programInfo, buffers, deltaTime) {
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

    const ratio = mViewportWidth / mViewportHeight;
    const rollRotation = mRolling * DEGREE_TO_RADIUS;
    const orthogonalRotation = (mRolling % 180.0 != 0.0)
    // mat4.scale(mModelMatrix, mModelMatrix, [1, ratio, 1]);   // 预补偿
    mat4.rotate(mModelMatrix, 
                mModelMatrix,
                rollRotation,
                [0, 0, 1]);
    // mat4.scale(mModelMatrix, mModelMatrix, [1, 1 / ratio, 1]);// 恢复

    const texWidth = orthogonalRotation ? mPlaneTextureInfo.height : mPlaneTextureInfo.width;
    const texHeight = orthogonalRotation ? mPlaneTextureInfo.width : mPlaneTextureInfo.height;
    const scaleType = calcScaleWithRenderMode(texWidth, texHeight, 
        mViewportWidth, mViewportHeight, 
        RenderMode.FULL | RenderMode.FIT);
    const scaleWidth = orthogonalRotation ? scaleType.height * mScale : scaleType.width * mScale;
    const scaleHeight = orthogonalRotation ? scaleType.width * mScale : scaleType.height * mScale;
    mat4.scale(mModelMatrix, mModelMatrix, [scaleWidth, scaleHeight, mScale]);

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
    gl.bindTexture(gl.TEXTURE_2D, mPlaneTextureInfo.texture);
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

    const offset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, mVertices.length / 3);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
}