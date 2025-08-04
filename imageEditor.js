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
var mLutTextureInfo = null;
var mVertices = [];
var mTexCoods = [];
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mRolling = 0.0;
var mScale = 1.0;
var mMirrorX = 1.0; // X镜像翻转(scaleX)
var mMirrorY = 1.0; // Y镜像翻转(scaleY)
var mTransX = 0.0;
var mTransY = 0.0;
var mProjectionMatrix = mat4.create();
var mModelMatrix = mat4.create();
var mViewMatrix = mat4.create();
var mMvpMatrix = mat4.create();
var mProgram = null;
var mContinuous = true;
var mThen = 0;
var mBuffers = null;
var mGl = null;

var mDumpFBO = null;
var mDumpOneFrame = false;

var mIsDragging = false; // 是否正在拖动
var mLastMouseX = 0; // 上一次鼠标的 X 坐标
var mLastMouseY = 0; // 上一次鼠标的 Y 坐标

var mUIImageEdit = null;

var mLineProgram = null;
let isCropping = false; // 是否处于裁剪模式
let cropBox = { x: 0, y: 0, width: 0, height: 0 }; // 裁剪框的初始位置和大小
let isDraggingCropBox = false; // 是否正在拖动裁剪框
let cropDragMode = null; // 当前裁剪框拖动模式（'move', 'resize-top', 'resize-bottom', etc.）

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

    // Add mouse wheel event listener
    canvas.addEventListener('wheel', onMouseWheel);
    // Add double-click event listener
    canvas.addEventListener('dblclick', onMouseDoubleClick);

    // 添加鼠标事件监听
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp); // 鼠标离开时也停止拖动

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

    mPlaneTextureInfo = loadTextureByUrl(mGl, './texture/image_edit.jpg');

    // init shader
    updateShader();
    loadLineShadersByPath('./shader/line.vs', './shader/line.fs');

    mBuffers = initBuffers(mGl);
    
    requestAnimationFrame(render);

    initImageEditBlog();
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
            uTextureHandle: mGl.getUniformLocation(shaderProgram, 'uTexture'),
            uLutTextureHandle: mGl.getUniformLocation(shaderProgram, 'uLutTexture'),
            uTileSizeHandle: mGl.getUniformLocation(shaderProgram, 'uTileSize'),
            uLutSizeHandle: mGl.getUniformLocation(shaderProgram, 'uLutSize')
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

    // 创建裁剪框顶点缓冲区
    const cropBoxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cropBoxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW); // 初始为空

    return {
        position: positionBuffer,
        uv: uvBuffer,
        cropBox: cropBoxBuffer
    };
}

function updateCropBoxBuffer(gl, cropBox) {
    const cropBoxVertices = [
        cropBox.x, cropBox.y, 0.0, // 左下角
        cropBox.x + cropBox.width, cropBox.y, 0.0, // 右下角
        cropBox.x + cropBox.width, cropBox.y + cropBox.height, 0.0, // 右上角
        cropBox.x, cropBox.y + cropBox.height, 0.0 // 左上角
    ];

    gl.bindBuffer(gl.ARRAY_BUFFER, mBuffers.cropBox);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cropBoxVertices), gl.DYNAMIC_DRAW);
}

function loadTextureByImage(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 加载图片到纹理
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // 设置纹理参数
    // if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
    //     gl.generateMipmap(gl.TEXTURE_2D);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // }

    gl.bindTexture(gl.TEXTURE_2D, null);

    return {
        texture: texture,
        width: image.width,
        height: image.height,
        aspectRatio: image.width / image.height
    };
}

// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
function loadTextureByUrl(gl, url) {
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
    //   if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
    //      // Yes, it's a power of 2. Generate mips.
    //      gl.generateMipmap(gl.TEXTURE_2D);
    //      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    //   }

        gl.bindTexture(gl.TEXTURE_2D, null);
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

function mirrorX() {
    mMirrorX = -1.0 * mMirrorX; // 切换镜像状态
}

function mirrorY() {
    mMirrorY = -1.0 * mMirrorY; // 切换镜像状态
}

function save() {
    mDumpOneFrame = true;
}

function loadImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // 创建纹理并加载图片
            const textureInfo = loadTextureByImage(mGl, img);
            mPlaneTextureInfo = textureInfo; // 更新全局纹理信息
            console.log("Image loaded successfully");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
    const orthogonalRotation = (mRolling % 180.0 != 0.0)
    const texWidth = orthogonalRotation ? mPlaneTextureInfo.height : mPlaneTextureInfo.width;
    const texHeight = orthogonalRotation ? mPlaneTextureInfo.width : mPlaneTextureInfo.height;
    if (0 == texWidth || 0 == texHeight) {
        console.info("drawScene: invalid texture size");
        return;
    }

    var viewportWidth = mViewportWidth;
    var viewportHeight = mViewportHeight;

    if (mDumpOneFrame) {
        if (null == mDumpFBO) {
            mDumpFBO = new FrameBufferObject(gl, gl.TEXTURE2, texWidth, texHeight);
        }
        mDumpFBO.bind();
        viewportWidth = texWidth;
        viewportHeight = texHeight;
        gl.viewport(0, 0, texWidth, texHeight);
    }

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
                   [mTransX, mTransY, 0.0]);  // amount to translate

    mat4.rotate(mModelMatrix,  // destination matrix
                mModelMatrix,  // matrix to rotate
                mPitching,     // amount to rotate in radians
                [1, 0, 0]);    // axis to rotate around
    mat4.rotate(mModelMatrix,  // destination matrix
                mModelMatrix,  // matrix to rotate
                mYawing,       // amount to rotate in radians
                [0, 1, 0]);    // axis to rotate around

    const rollRotation = mRolling * DEGREE_TO_RADIUS;
    // mat4.scale(mModelMatrix, mModelMatrix, [1, ratio, 1]);   // 预补偿
    mat4.rotate(mModelMatrix, 
                mModelMatrix,
                rollRotation,
                [0, 0, 1]);
    // mat4.scale(mModelMatrix, mModelMatrix, [1, 1 / ratio, 1]);// 恢复

    const scaleType = calcScaleWithRenderMode(texWidth, texHeight, 
        viewportWidth, viewportHeight, 
        RenderMode.FULL | RenderMode.FIT);
    const scaleWidth = orthogonalRotation ? scaleType.height * mScale * mMirrorY : scaleType.width * mScale * mMirrorX;
    const scaleHeight = orthogonalRotation ? scaleType.width * mScale * mMirrorX : scaleType.height * mScale * mMirrorY;

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
    gl.uniform1i(programInfo.uniformLocations.uTextureHandle, 0);

    if (null != mLutTextureInfo && mLutTextureInfo.width > 0 && mLutTextureInfo.height > 0) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, mLutTextureInfo.texture);
        gl.uniform1i(programInfo.uniformLocations.uLutTextureHandle, 1);
        gl.uniform1f(programInfo.uniformLocations.uTileSizeHandle, 8.0);
        gl.uniform2f(programInfo.uniformLocations.uLutSizeHandle, mLutTextureInfo.width, mLutTextureInfo.height);
    }

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
    
    const tempMatrix = mat4.create();
    mat4.multiply(tempMatrix, mViewMatrix, mModelMatrix);
    mat4.multiply(mMvpMatrix, mProjectionMatrix, tempMatrix);
    updateHtmlMvpMatrixByRender();

    const offset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, mVertices.length / 3);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // 如果处于裁剪模式，绘制裁剪框
    if (isCropping) {
        drawCropBox(gl);
    }

    if (mDumpOneFrame) {
        mDumpOneFrame = false;
        gl.viewport(0, 0, mViewportWidth, mViewportHeight); // 恢复

        if (null != mDumpFBO) {
            // 读取像素数据
            const pixels = new Uint8Array(texWidth * texHeight * 4);
            gl.readPixels(0, 0, texWidth, texHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            mDumpFBO.unbind();

            // 创建临时canvas处理图像数据
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = texWidth;
            tempCanvas.height = texHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            // 将像素数据放入ImageData
            const imageData = tempCtx.createImageData(texWidth, texHeight);
            imageData.data.set(pixels);
            tempCtx.putImageData(imageData, 0, 0);
            
            // 翻转Y轴(WebGL坐标系与canvas不同)
            tempCtx.scale(1, -1);
            tempCtx.drawImage(tempCanvas, 0, -texHeight);
            
            // 转换为数据URL并触发下载
            tempCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'webgl-render.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
        }
    }
}

function drawCropBox(gl) {
    // 更新裁剪框顶点缓冲区
    updateCropBoxBuffer(gl, cropBox);

    // 使用默认的着色器程序
    gl.useProgram(mLineProgram.program);

    // 绑定裁剪框顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, mBuffers.cropBox);
    gl.vertexAttribPointer(
        mLineProgram.attribLocations.vertexPosition,
        3, // 每个顶点有 3 个分量 (x, y, z)
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(mLineProgram.attribLocations.vertexPosition);

    // 设置裁剪框颜色
    gl.uniform4f(gl.getUniformLocation(mLineProgram.program, 'uColor'), 0.0, 0.0, 1.0, 1.0);

    // 绘制裁剪框
    gl.drawArrays(gl.LINE_LOOP, 0, 4);

    gl.disableVertexAttribArray(mLineProgram.attribLocations.vertexPosition);
}

function updateHtmlMvpMatrixByRender() {
    document.getElementById("id_image_edit_mvpmatrix_m00").innerHTML = mMvpMatrix[0].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m01").innerHTML = mMvpMatrix[4].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m02").innerHTML = mMvpMatrix[8].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m03").innerHTML = mMvpMatrix[12].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m10").innerHTML = mMvpMatrix[1].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m11").innerHTML = mMvpMatrix[5].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m12").innerHTML = mMvpMatrix[9].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m13").innerHTML = mMvpMatrix[13].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m20").innerHTML = mMvpMatrix[2].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m21").innerHTML = mMvpMatrix[6].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m22").innerHTML = mMvpMatrix[10].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m23").innerHTML = mMvpMatrix[14].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m30").innerHTML = mMvpMatrix[3].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m31").innerHTML = mMvpMatrix[7].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m32").innerHTML = mMvpMatrix[11].toFixed(2);
    document.getElementById("id_image_edit_mvpmatrix_m33").innerHTML = mMvpMatrix[15].toFixed(2);
}

function onMouseWheel(event) {
    // 阻止默认滚动行为
    event.preventDefault();

    // 根据滚轮方向调整 mScale 值
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    if (mScale + delta < 1.0) {
        mTransX = 0.0; // 重置平移
        mTransY = 0.0; // 重置平移
    }
    mScale = Math.min(5.0, Math.max(1.0, mScale + delta));

    console.log(`mScale updated: ${mScale}`);
}

function onMouseDoubleClick(event) {
    // 切换 mScale 的值
    if (mScale !== 3.0) {
        mScale = 3.0;
    } else {
        mScale = 1.0;
    }

    console.log(`mScale updated on double-click: ${mScale}`);
}

function onMouseDown(event) {
    const mousePos = screenToWorld(event.clientX, event.clientY);

    if (isCropping && isMouseOnCropBox(mousePos)) {
        isDraggingCropBox = true;
        cropDragMode = getCropBoxDragMode(mousePos);
    } else {
        mIsDragging = true; // 开始拖动
        mLastMouseX = event.clientX; // 记录鼠标的初始位置
        mLastMouseY = event.clientY;
    }
}

function onMouseMove(event) {
    const mousePos = screenToWorld(event.clientX, event.clientY);

    if (isDraggingCropBox) {
        handleCropBoxDrag(mousePos);
    } else if (mIsDragging && mScale > 1.0) {
        handleImageDrag(event);
    }

    // 更新鼠标位置
    mLastMouseX = event.clientX;
    mLastMouseY = event.clientY;
}

function onMouseUp(event) {
    mIsDragging = false; // 停止拖动
    isDraggingCropBox = false;
    cropDragMode = null;
}

// 处理裁剪框拖动
function handleCropBoxDrag(mousePos) {
    const { x, y, width, height } = cropBox;

    switch (cropDragMode) {
        case 'move':
            const lastMousePos = screenToWorld(mLastMouseX, mLastMouseY);
            const deltaX = mousePos.x - lastMousePos.x;
            const deltaY = mousePos.y - lastMousePos.y;

            cropBox.x += deltaX;
            cropBox.y += deltaY;
            break;
        case 'resize-left':
            cropBox.width += cropBox.x - mousePos.x;
            cropBox.x = mousePos.x;
            break;
        case 'resize-right':
            cropBox.width = mousePos.x - cropBox.x;
            break;
        case 'resize-top':
            cropBox.height = mousePos.y - cropBox.y;
            break;
        case 'resize-bottom':
            cropBox.height += cropBox.y - mousePos.y;
            cropBox.y = mousePos.y;
            break;
        case 'resize-top-left':
            cropBox.width += cropBox.x - mousePos.x;
            cropBox.x = mousePos.x;
            cropBox.height = mousePos.y - cropBox.y;
            break;
        case 'resize-top-right':
            cropBox.width = mousePos.x - cropBox.x;
            cropBox.height = mousePos.y - cropBox.y;
            break;
        case 'resize-bottom-left':
            cropBox.width += cropBox.x - mousePos.x;
            cropBox.x = mousePos.x;
            cropBox.height += cropBox.y - mousePos.y;
            cropBox.y = mousePos.y;
            break;
        case 'resize-bottom-right':
            cropBox.width = mousePos.x - cropBox.x;
            cropBox.height += cropBox.y - mousePos.y;
            cropBox.y = mousePos.y;
            break;
    }

    // 限制裁剪框的最小尺寸
    cropBox.width = Math.max(cropBox.width, 0.1);
    cropBox.height = Math.max(cropBox.height, 0.1);

    // 更新裁剪框缓冲区
    updateCropBoxBuffer(mGl, cropBox);
}

function handleImageDrag(event) {
    if (!mIsDragging || mScale <= 1.0) return; // 如果没有拖动或未放大，则不处理移动事件
    const displayedImgSize = getDisplayedImageSize();
    if (displayedImgSize.displayWidth <= 0 || displayedImgSize.displayHeight <= 0) {
        console.warn("Image size is zero, cannot drag.");
        return;
    }

    // 计算鼠标移动的距离
    const deltaX = event.clientX - mLastMouseX;
    const deltaY = event.clientY - mLastMouseY;
    // 更新图片的位置
    mTransX += deltaX / mViewportWidth * 2; // 转换为 OpenGL 坐标
    mTransY -= deltaY / mViewportHeight * 2; // Y 轴方向需要反转

    /** 限制平移范围 **/ 
    // 计算缩放后的图像实际显示尺寸（分辨率）
    const scaledDisplayedImgWidth = displayedImgSize.displayWidth * mScale;
    const scaledDisplayedImgHeight = displayedImgSize.displayHeight * mScale;
    // 图像左下角在屏幕左下角时的屏幕坐标
    const imgLeftBottomScreen = {
        x: scaledDisplayedImgWidth / 2.0,
        y: (mViewportHeight - scaledDisplayedImgHeight / 2.0)
    };
    // 图像右上角在屏幕右上角时的屏幕坐标
    const imgRightTopScreen = {
        x: (mViewportWidth - scaledDisplayedImgWidth / 2.0) ,
        y: scaledDisplayedImgHeight / 2.0
    };
    // 图像右下角在屏幕右下角时的屏幕坐标
    const imgRightBottomScreen = {
        x: (mViewportWidth - scaledDisplayedImgWidth / 2.0),
        y: (mViewportHeight - scaledDisplayedImgHeight / 2.0)
    };
    // 图像左上角在屏幕左上角时的屏幕坐标
    const imgLeftTopScreen = {
        x: scaledDisplayedImgWidth / 2.0,
        y: scaledDisplayedImgHeight / 2.0
    };

    if (scaledDisplayedImgWidth > mViewportWidth && scaledDisplayedImgHeight > mViewportHeight) {
        const realLeftBottomOpenGLWorld = screenToWorld(imgRightTopScreen.x, imgRightTopScreen.y);
        const realRightTopOpenGLWorld = screenToWorld(imgLeftBottomScreen.x, imgLeftBottomScreen.y);
        console.log(`imgScaledWidthHeight over: realLeftBottomOpenGLWorld: ${JSON.stringify(realLeftBottomOpenGLWorld)}`);
        console.log(`imgScaledWidthHeight over: realRightTopOpenGLWorld: ${JSON.stringify(realRightTopOpenGLWorld)}`);
        if (mTransX < realLeftBottomOpenGLWorld.x) {
            mTransX = realLeftBottomOpenGLWorld.x;
        }
        if (mTransX > realRightTopOpenGLWorld.x) {
            mTransX = realRightTopOpenGLWorld.x;
        }
        if (mTransY < realLeftBottomOpenGLWorld.y) {
            mTransY = realLeftBottomOpenGLWorld.y;
        }
        if (mTransY > realRightTopOpenGLWorld.y) {
            mTransY = realRightTopOpenGLWorld.y;
        }
    } else if (scaledDisplayedImgWidth > mViewportWidth) {
        const realLeftBottomOpenGLWorld = screenToWorld(imgRightBottomScreen.x, imgRightBottomScreen.y);
        const realRightTopOpenGLWorld = screenToWorld(imgLeftTopScreen.x, imgLeftTopScreen.y);
        console.log(`imgScaledWidth over: realLeftBottomOpenGLWorld: ${JSON.stringify(realLeftBottomOpenGLWorld)}`);
        console.log(`imgScaledWidth over: realRightTopOpenGLWorld: ${JSON.stringify(realRightTopOpenGLWorld)}`);
        if (mTransX < realLeftBottomOpenGLWorld.x) {
            mTransX = realLeftBottomOpenGLWorld.x;
        }
        if (mTransX > realRightTopOpenGLWorld.x) {
            mTransX = realRightTopOpenGLWorld.x;
        }
        if (mTransY < realLeftBottomOpenGLWorld.y) {
            mTransY = realLeftBottomOpenGLWorld.y;
        }
        if (mTransY > realRightTopOpenGLWorld.y) {
            mTransY = realRightTopOpenGLWorld.y;
        }
    } else if (scaledDisplayedImgHeight > mViewportHeight) { 
        const realLeftBottomOpenGLWorld = screenToWorld(imgLeftTopScreen.x, imgLeftTopScreen.y);
        const realRightTopOpenGLWorld = screenToWorld(imgRightBottomScreen.x, imgRightBottomScreen.y);
        console.log(`imgScaledHeight over: realLeftBottomOpenGLWorld: ${JSON.stringify(realLeftBottomOpenGLWorld)}`);
        console.log(`imgScaledHeight over: realRightTopOpenGLWorld: ${JSON.stringify(realRightTopOpenGLWorld)}`);
        if (mTransX < realLeftBottomOpenGLWorld.x) {
            mTransX = realLeftBottomOpenGLWorld.x;
        }
        if (mTransX > realRightTopOpenGLWorld.x) {
            mTransX = realRightTopOpenGLWorld.x;
        }
        if (mTransY < realLeftBottomOpenGLWorld.y) {
            mTransY = realLeftBottomOpenGLWorld.y;
        }
        if (mTransY > realRightTopOpenGLWorld.y) {
            mTransY = realRightTopOpenGLWorld.y;
        }
    } else {
        console.warn("Image size is scaled, should not happend here!");
    }

    console.log(`transX: ${mTransX}, transY: ${mTransY}`);
}

function toggleCrop(event) {
    isCropping = !isCropping; // 切换裁剪模式
    if (isCropping) {
        // 初始化裁剪框为图片当前显示部分
        const displayedImgSize = getDisplayedImageSize();
        cropBox = {
            x: -displayedImgSize.displayWidth / mViewportWidth,
            y: -displayedImgSize.displayHeight / mViewportHeight,
            width: 2.0 * displayedImgSize.displayWidth / mViewportWidth,
            height: 2.0 * displayedImgSize.displayHeight / mViewportHeight
        };
        console.log("Crop mode enabled:", cropBox);
    } else {
        console.log("Crop mode disabled");
    }
}

// 判断鼠标是否在裁剪框上
function isMouseOnCropBox(mousePos) {
    const { x, y, width, height } = cropBox;
    const margin = 0.05; // 边缘检测范围
    return (
        mousePos.x >= x - margin &&
        mousePos.x <= x + width + margin &&
        mousePos.y >= y - margin &&
        mousePos.y <= y + height + margin
    );
}

// 获取裁剪框拖动模式
function getCropBoxDragMode(mousePos) {
    const { x, y, width, height } = cropBox;
    const margin = 0.05;

    if (Math.abs(mousePos.x - x) < margin && Math.abs(mousePos.y - y) < margin) {
        return 'resize-bottom-left'; // 左下角
    } else if (Math.abs(mousePos.x - (x + width)) < margin && Math.abs(mousePos.y - y) < margin) {
        return 'resize-bottom-right'; // 右下角
    } else if (Math.abs(mousePos.x - x) < margin && Math.abs(mousePos.y - (y + height)) < margin) {
        return 'resize-top-left'; // 左上角
    } else if (Math.abs(mousePos.x - (x + width)) < margin && Math.abs(mousePos.y - (y + height)) < margin) {
        return 'resize-top-right'; // 右上角
    } else if (Math.abs(mousePos.x - x) < margin) {
        return 'resize-left'; // 左边
    } else if (Math.abs(mousePos.x - (x + width)) < margin) {
        return 'resize-right'; // 右边
    } else if (Math.abs(mousePos.y - y) < margin) {
        return 'resize-bottom'; // 下边
    } else if (Math.abs(mousePos.y - (y + height)) < margin) {
        return 'resize-top'; // 上边
    } else {
        return 'move'; // 移动整个裁剪框
    }
}

function toggleFilterOptions() {
    const filterOptions = document.getElementById('filterOptions');
    if (filterOptions.style.display == 'none' || filterOptions.style.display == '') {
        filterOptions.style.display = 'block';
    } else {
        filterOptions.style.display = 'none';
    }
}

function onFilterChange(event) {
    const selectedFilter = event.target.value;
    console.log(`Selected filter: ${selectedFilter}`);
    // 在这里添加切换滤镜的逻辑
    applyFilter(selectedFilter);
}

function applyFilter(filter) {
    if (filter == 'filter1') {
        // 如果是 filter1，不加载任何 LUT 纹理
        mLutTextureInfo = null;
        console.log('Filter 1 selected: No LUT applied.');
        // 更新 Shader 内容
        updateShaders('./shader/base.vs', './shader/base.fs');
    } else {
        // 根据滤镜类型加载对应的 LUT 图片
        let lutImagePath = '';
        switch (filter) {
            case 'filter2':
                lutImagePath = './texture/lut_yellow.png';
                break;
            case 'filter3':
                lutImagePath = './texture/lut_purple.png';
                break;
            case 'filter4':
                lutImagePath = './texture/lut_2.png';
                break;
            case 'filter5':
                lutImagePath = './texture/lut_3.png';
                break;
            case 'filter6':
                lutImagePath = './texture/lut_4.png';
                break;
            default:
                console.error(`Unknown filter: ${filter}`);
                return;
        }

        // 加载 LUT 图片并转换为纹理信息
        const image = new Image();
        image.onload = function () {
            mLutTextureInfo = loadTextureByImage(mGl, image);
            console.log(`Filter ${filter} applied: Loaded LUT from ${lutImagePath}, width = ${mLutTextureInfo.width}, 
                height = ${mLutTextureInfo.height}, lutTexId = ${mLutTextureInfo.texture}`);
        };
        image.onerror = function () {
            console.error(`Failed to load LUT image: ${lutImagePath}`);
        };
        image.src = lutImagePath;
        
        // 更新 Shader 内容
        updateShaders('./shader/base.vs', './shader/filter/lut/lut_filter.fs');
    }
}

function updateShaders(vertexShaderPath, fragmentShaderPath) {
    // 加载顶点着色器
    const vertexShaderPromise = fetch(vertexShaderPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load vertex shader: ${vertexShaderPath}`);
            }
            return response.text();
        })
        .then(vertexShaderCode => {
            document.getElementById('id_vertex_shader').value = vertexShaderCode;
            console.log(`Vertex shader updated from ${vertexShaderPath}`);
        })
        .catch(error => console.error(error));

    // 加载片段着色器
    const fragmentShaderPromise = fetch(fragmentShaderPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load fragment shader: ${fragmentShaderPath}`);
            }
            return response.text();
        })
        .then(fragmentShaderCode => {
            document.getElementById('id_fragment_shader').value = fragmentShaderCode;
            console.log(`Fragment shader updated from ${fragmentShaderPath}`);
        })
        .catch(error => console.error(error));

    // 等待两个 Shader 文件都加载完成后调用 updateShader()
    Promise.all([vertexShaderPromise, fragmentShaderPromise])
    .then(() => {
        console.log('Both shaders loaded, updating shader program...');
        updateShader(); // 调用 updateShader 函数
    })
    .catch(error => console.error('Error loading shaders:', error));
}

function loadLineShadersByPath(vertexShaderPath, fragmentShaderPath) {
    // 加载顶点着色器（返回实际代码）
    const vertexShaderPromise = fetch(vertexShaderPath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load vertex shader: ${vertexShaderPath}`);
            return response.text();
        })
        .then(vertexShaderCode => {
            console.log(`Vertex shader loaded from ${vertexShaderPath}`);
            return vertexShaderCode;
        })
        .catch(error => {
            console.error('Vertex shader load error:', error);
            throw error; // 重新抛出以中断Promise.all
        });

    // 加载片段着色器（返回实际代码）
    const fragmentShaderPromise = fetch(fragmentShaderPath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load fragment shader: ${vertexShaderPath}`);
            return response.text();
        })
        .then(fragmentShaderCode => {
            console.log(`Fragment shader loaded from ${fragmentShaderPath}`);
            return fragmentShaderCode;
        })
        .catch(error => {
            console.error('Fragment shader load error:', error);
            throw error;
        });

    // 合并处理
    Promise.all([vertexShaderPromise, fragmentShaderPromise])
        .then(([vsSource, fsSource]) => {
            console.log('Both shaders loaded successfully');
            
            const vertexShader = loadShader(mGl, mGl.VERTEX_SHADER, vsSource);
            const fragmentShader = loadShader(mGl, mGl.FRAGMENT_SHADER, fsSource);

            const shaderProgram = mGl.createProgram();
            mGl.attachShader(shaderProgram, vertexShader);
            mGl.attachShader(shaderProgram, fragmentShader);
            mGl.linkProgram(shaderProgram);

            if (!mGl.getProgramParameter(shaderProgram, mGl.LINK_STATUS)) {
                throw new Error(`Shader link failed: ${mGl.getProgramInfoLog(shaderProgram)}`);
            }

            mLineProgram = {
                program: shaderProgram,
                attribLocations: {
                    vertexPosition: mGl.getAttribLocation(shaderProgram, 'aPosition')
                },
                uniformLocations: {
                    uProjectionMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uColor')
                }
            };
        })
        .catch(error => {
            console.error('Shader initialization failed:', error);
            throw error; // 允许外部继续处理错误
        });
}

// 计算 fitCenter 后的图片实际显示尺寸（分辨率）
function getDisplayedImageSize() {
    const viewAspect = mViewportWidth / (mViewportHeight > 0 ? mViewportHeight : 1);
    const imageAspect = mPlaneTextureInfo 
        ? mPlaneTextureInfo.width / (mPlaneTextureInfo.height > 0 ? mPlaneTextureInfo.height : 1) 
        : 1;

    let displayWidth, displayHeight;
    if (imageAspect > viewAspect) {
        displayWidth = mViewportWidth;
        displayHeight = mViewportWidth / imageAspect;
    } else {
        displayWidth = mViewportHeight * imageAspect;
        displayHeight = mViewportHeight;
    }

    return { displayWidth, displayHeight };
}

// 将屏幕坐标转换为 OpenGL 世界坐标 [-1, 1]
function screenToWorld(dx, dy) {
    if (mViewportWidth <= 0 || mViewportHeight <= 0) {
        return { x: 0.0, y: 0.0 };
    }
    const screenCenterX = mViewportWidth / 2.0;
    const screenCenterY = mViewportHeight / 2.0;
    return {
        x: (dx - screenCenterX) / screenCenterX,
        y: (screenCenterY - dy) / screenCenterY
    };
}

function initImageEditBlog() {
    if (null == mUIImageEdit) {
        mUIImageEdit = document.getElementById("id_image_edit_blog");
        var markdownReader = new XMLHttpRequest();
        markdownReader.open('get', './blog/imageEdit.md', false);
        markdownReader.send();

        let convertor = new showdown.Converter();
        let htmlContent = convertor.makeHtml(markdownReader.responseText);
        mUIImageEdit.innerHTML = htmlContent;
    }
    mUIImageEdit.style.display = 'block';
}