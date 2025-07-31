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

function loadTextureByImage(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 加载图片到纹理
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // 设置纹理参数
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

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
    
    const tempMatrix = mat4.create();
    mat4.multiply(tempMatrix, mViewMatrix, mModelMatrix);
    mat4.multiply(mMvpMatrix, mProjectionMatrix, tempMatrix);
    updateHtmlMvpMatrixByRender();

    const offset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, mVertices.length / 3);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);

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
    mIsDragging = true; // 开始拖动
    mLastMouseX = event.clientX; // 记录鼠标的初始位置
    mLastMouseY = event.clientY;
}

function onMouseMove(event) {
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

    // 更新鼠标位置
    mLastMouseX = event.clientX;
    mLastMouseY = event.clientY;

    console.log(`transX: ${mTransX}, transY: ${mTransY}`);
}

function onMouseUp(event) {
    mIsDragging = false; // 停止拖动
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