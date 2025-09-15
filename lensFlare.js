const DEGREE_TO_RADIUS = Math.PI / 180;
const LIGHT_POSITION = vec3.fromValues(0.0, 5.0, -5.0);

var mCameraPosition = [0.0, 0.0, 10.0];

var mPlaneTextureInfo = null;
var mVertices = [];
var mTexCoods = [];
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mRolling = 0.0;
var mTransX = 0.0;
var mTransY = 0.0;
var mProjectionMatrix = mat4.create();
var mModelMatrix = mat4.create();
var mViewMatrix = mat4.create();
var mMvpMatrix = mat4.create();
var mProgram = null;
var mBuffers = null;
var mGl = null;

// 鼠标拖动控制相机球形转
let mCameraRadius = 10.0; // 摄影机距离中心点的半径
let mCameraYaw = 0.0;     // 摄影机的水平角度（绕 Y 轴）
let mCameraPitch = 0.0;   // 摄影机的垂直角度（绕 X 轴）
const cameraTarget = [0.0, 0.0, 0.0]; // 摄影机始终看向的目标点
// 鼠标交互相关变量
let mIsDragging = false;
let mLastMouseX = 0;
let mLastMouseY = 0;
let mVelocityX = 0; // 鼠标释放后的惯性速度
let mVelocityY = 0;
let mDamping = 0.95; // 阻尼系数，控制旋转逐步变慢

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
  mat4.lookAt(mViewMatrix, mCameraPosition, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0));

  // Create a perspective matrix
  const fov = 45 * DEGREE_TO_RADIUS;   // in radians
  const aspect = mGl.canvas.clientWidth / mGl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 1000.0;
  mProjectionMatrix = mat4.create();
  mat4.perspective(mProjectionMatrix, fov, aspect, zNear, zFar);

  mPlaneTextureInfo = loadTextureByUrl(mGl, './texture/lensFlare/lensflare0_alpha.png');

  // init shader
  updateShader();

  mBuffers = initBuffers(mGl);

  // 初始化鼠标控制
  initMouseControls(canvas);
  
  // requestAnimationFrame(render);
  requestRender();
}

// Draw the scene repeatedly
function requestRender() {
  drawScene(mGl, mProgram, mBuffers, 0);
}

function initMouseControls(canvas) {
    canvas.addEventListener('mousedown', (event) => {
        mIsDragging = true;
        mLastMouseX = event.clientX;
        mLastMouseY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (mIsDragging) {
            const deltaX = event.clientX - mLastMouseX;
            const deltaY = event.clientY - mLastMouseY;

             // 更新相机的水平和垂直角度
            mCameraYaw += deltaX * 0.01; // 鼠标水平移动控制 Yaw
            mCameraPitch += deltaY * 0.01; // 鼠标垂直移动控制 Pitch

            // 限制 pitch 的范围，避免翻转
            mCameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, mCameraPitch));

            mLastMouseX = event.clientX;
            mLastMouseY = event.clientY;

            requestRender(); // 持续渲染
        }
    });

    canvas.addEventListener('mouseup', () => {
        mIsDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        mIsDragging = false;
    });

    // 鼠标滚轮交互
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault(); // 阻止页面滚动

        const delta = event.deltaY < 0 ? 1 : -1; // 滚轮方向
        const zoomSpeed = 0.5; // 缩放速度

        // 更新相机半径
        mCameraRadius += delta * zoomSpeed;
        mCameraRadius = Math.max(2.0, Math.min(50.0, mCameraRadius)); // 限制半径范围

        requestRender(); // 持续渲染
    }, { passive: false }); // 设置为非被动模式，允许调用 preventDefault

    // 鼠标双击交互
    canvas.addEventListener('dblclick', () => {
        mCameraRadius = 10.0;
        mCameraYaw = 0.0;
        mCameraPitch = 0.0;

        requestRender();
    });
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
          uMVPMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uMvpMatrix'),
          uCenterHandle: mGl.getUniformLocation(shaderProgram, 'uCenter'),
          uScaleHandle: mGl.getUniformLocation(shaderProgram, 'uScale'),
          uResolutionHandle: mGl.getUniformLocation(shaderProgram, 'uResolution'),
          uColorHandle: mGl.getUniformLocation(shaderProgram, 'uColor'),
          uTextureHandle: mGl.getUniformLocation(shaderProgram, 'uTexture'),
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
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
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

      requestRender();
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
  var vertices = [
    -0.5, -0.5,
     0.5, -0.5,
    -0.5,  0.5,
     0.5,  0.5
  ]   // [-1.0, -1.0, 1.0, -1.0, -1.0,  1.0, 1.0,  1.0];
  
  return vertices;
}

function generateTexCoord() {
  var result = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
  
  return result;
}

function drawScene(gl, programInfo, buffers, deltaTime) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 根据球坐标计算相机位置
    const cameraX = mCameraRadius * Math.cos(mCameraPitch) * Math.sin(mCameraYaw);
    const cameraY = mCameraRadius * Math.sin(mCameraPitch);
    const cameraZ = mCameraRadius * Math.cos(mCameraPitch) * Math.cos(mCameraYaw);
    mCameraPosition = [cameraX, cameraY, cameraZ];

    // 更新视图矩阵
    mat4.lookAt(mViewMatrix, mCameraPosition, cameraTarget, [0.0, 1.0, 0.0]);

    drawLensFlare(gl, programInfo, buffers, deltaTime);

     // 如果鼠标未拖拽，应用惯性旋转
    if (!mIsDragging) {
        if (Math.abs(mVelocityX) > 0.01 || Math.abs(mVelocityY) > 0.01) {
            mCameraYaw += mVelocityX * 0.01;
            mCameraPitch += mVelocityY * 0.01;

            // 限制 pitch 的范围
            mCameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, mCameraPitch));

            // 应用阻尼
            mVelocityX *= mDamping;
            mVelocityY *= mDamping;

            requestAnimationFrame(requestRender); // 持续渲染
        }
    }
}

function drawLensFlare(gl, programInfo, buffers, deltaTime) {
    const tempMatrix = mat4.create();
    mat4.multiply(tempMatrix, mViewMatrix, mModelMatrix);
    mat4.multiply(mMvpMatrix, mProjectionMatrix, tempMatrix);
    updateHtmlMvpMatrixByRender();

    // 1. 计算光源屏幕坐标
    const lightScreen = worldToScreen(LIGHT_POSITION, mMvpMatrix);
    const screenCenter = [0.5, 0.5];   // [mViewportWidth / 2, mViewportHeight / 2];
    const flareVec = [screenCenter[0] - lightScreen[0], screenCenter[1] - lightScreen[1]];

    // 启用 Alpha 混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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
    mat4.rotate(mModelMatrix, 
                mModelMatrix,
                rollRotation,
                [0, 0, 1]);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 2;
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

    const center = [
        lightScreen[0] + flareVec[0] * 0.3,
        lightScreen[1] + flareVec[1] * 0.3
    ];
    gl.uniform2fv(programInfo.uniformLocations.uCenterHandle, center);
    gl.uniform2fv(programInfo.uniformLocations.uScaleHandle, [0.5, 0.5]);
    gl.uniform2fv(programInfo.uniformLocations.uResolutionHandle, [mViewportWidth, mViewportHeight]);
    gl.uniform4fv(programInfo.uniformLocations.uColorHandle, [1,1,1,1]);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uMVPMatrixHandle,
        false, mMvpMatrix);

    const offset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, mVertices.length / 2);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // 禁用 Alpha 混合
    gl.disable(gl.BLEND);
}

// 不是像素坐标
function worldToScreen(pos, mvpMatrix) {
    // pos: [x, y, z]
    let v = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
    vec4.transformMat4(v, v, mvpMatrix);
    v[0] /= v[3];
    v[1] /= v[3];
    // 转换到像素坐标
    return [
        (v[0] * 0.5 + 0.5),
        (1.0 - (v[1] * 0.5 + 0.5))
    ];
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