const DEGREE_TO_RADIUS = Math.PI / 180;
const LIGHT_POSITION = vec3.fromValues(0.0, 5.0, -5.0);

var mCameraPosition = [0.0, 0.0, 10.0];

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

var mSkyboxTexture;
var mProgram = null;
var mBuffers = null;
var mGl = null;

let mCubeTextures = {};
let mCubeBuffers;
let mCubeProgramInfo;

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

  // init shader
  updateShader();
  mBuffers = initBuffers(mGl);
  // 加载天空盒纹理
  loadSkyboxTexture(mGl, {
    posX: './texture/SkyBox/posX.png',
    negX: './texture/SkyBox/negX.png',
    posY: './texture/SkyBox/posY.png',
    negY: './texture/SkyBox/negY.png',
    posZ: './texture/SkyBox/posZ.png',
    negZ: './texture/SkyBox/negZ.png',
  }).then(texture => {
    mSkyboxTexture = texture;
    requestRender(); // 确保纹理就绪后再渲染
  });

  mCubeBuffers = createCubeBuffers(mGl);
  loadCubeTextures(mGl);
  loadCubeShaderByPath('./shader/base.vs', './shader/base.fs');

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

function loadSkyboxTexture(gl, urls) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    // 1. 初始化所有面为1x1像素
    const placeholder = new Uint8Array([0, 0, 255, 255]); // 蓝色占位
    const targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    ];
    targets.forEach(target => {
        gl.texImage2D(target, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    });

    // 2. 异步加载所有图片
    const facePromises = targets.map((target, i) => {
        const url = Object.values(urls)[i];
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ target, img });
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    });

    // 3. 统一处理所有面
    return Promise.all(facePromises)
        .then(faces => {
            // 校验所有面尺寸一致
            const baseWidth = faces[0].img.width;
            const baseHeight = faces[0].img.height;
            
            faces.forEach(({ img }) => {
                if (img.width !== baseWidth || img.height !== baseHeight) {
                    throw new Error(`All cubemap faces must have same dimensions. 
                        Found ${img.width}x${img.height} vs ${baseWidth}x${baseHeight}`);
                }
            });

            // 更新纹理数据
            faces.forEach(({ target, img }) => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            });

            // 统一设置参数（仅在所有面就绪后执行一次）
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            // gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            // gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            // gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            return texture;
        })
        .catch(error => {
            console.error('Cubemap loading failed:', error);
            gl.deleteTexture(texture);
            throw error;
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
          vertexPosition: mGl.getAttribLocation(shaderProgram, 'aPosition')
      },
      uniformLocations: {
          uSkybox: mGl.getUniformLocation(shaderProgram, 'uSkybox'),
          uViewDirectionProjectionInverse: mGl.getUniformLocation(shaderProgram, 'uViewDirectionProjectionInverse'),
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
  const positions = [
        -1, -1,
        1, -1,
        -1,  1,
        -1,  1,
        1, -1,
        1,  1,
    ];

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        vertexCount: positions.length / 2,
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

function createCubeBuffers(gl) {
    // 每个面的顶点数据（逆时针顺序，法线朝内）
    const positions = [
        // +X 面（调整顶点顺序）
        100, -100, -100,  // 左下
        100, -100,  100,  // 右下 → 原第三顶点
        100,  100, -100,  // 左上 → 原第二顶点
        100,  100,  100,  // 右上

        // -X 面（同样调整）
        -100, -100,  100,
        -100, -100, -100,
        -100,  100,  100,
        -100,  100, -100,

        // +Y 面
        -100,  100, -100,
         100,  100, -100,
        -100,  100,  100,
         100,  100,  100,

        // -Y 面
        -100, -100,  100,
         100, -100,  100,
        -100, -100, -100,
         100, -100, -100,

        // +Z 面（调整顶点顺序）
        -100, -100,  100,
        100, -100,  100,
        -100,  100,  100,
        100,  100,  100,

        // -Z 面（调整顶点顺序）
        100, -100, -100,
        -100, -100, -100,
        100,  100, -100,
        -100,  100, -100
    ];

    // 每个面的纹理坐标
    const texCoords = [
        // +X 面
        0, 0,  1, 0,  0, 1,  1, 1,  // 翻转 Y 轴

        // -X 面
        1, 0,  0, 0,  1, 1,  0, 1,  // 翻转 Y 轴

        // +Y 面
        0, 1,  1, 1,  0, 0,  1, 0,

        // -Y 面
        0, 1,  1, 1,  0, 0,  1, 0,

        // +Z 面
        0, 0,  1, 0,  0, 1,  1, 1,  // 翻转 Y 轴

        // -Z 面
        1, 0,  0, 0,  1, 1,  0, 1,  // 翻转 Y 轴
    ];

    // 创建顶点缓冲区
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // 创建纹理坐标缓冲区
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        texCoord: texCoordBuffer,
        vertexCount: 6 * 4, // 每个面 4 个顶点，共 6 个面
    };
}

function loadCubeTextures(gl) {
    const faces = {
        posX: './texture/SkyBox/posX.png',
        negX: './texture/SkyBox/negX.png',
        posY: './texture/SkyBox/posY.png',
        negY: './texture/SkyBox/negY.png',
        posZ: './texture/SkyBox/posZ.png',
        negZ: './texture/SkyBox/negZ.png',
        debug: './texture/terrain.jpg'
    };

    for (const [key, url] of Object.entries(faces)) {
        mCubeTextures[key] = loadTextureByUrl(gl, url, requestRender);
    }
}

function loadCubeShaderByPath(vertexShaderPath, fragmentShaderPath) {
    // 同时加载顶点和片段着色器
    Promise.all([
        fetch(vertexShaderPath).then(handleShaderResponse),
        fetch(fragmentShaderPath).then(handleShaderResponse)
    ])
    .then(([vertexShaderCode, fragmentShaderCode]) => {
        console.log('Shaders loaded successfully:');
        console.log(`Vertex shader from ${vertexShaderPath} (${vertexShaderCode.length} chars)`);
        console.log(`Fragment shader from ${fragmentShaderPath} (${fragmentShaderCode.length} chars)`);
        
        // 直接将源码传递给更新函数
        updateCubeShader(vertexShaderCode, fragmentShaderCode);
    })
    .catch(error => {
        console.error('Shader loading failed:', error);
    });

    // 统一的响应处理函数
    function handleShaderResponse(response) {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    }
}

function updateCubeShader(vsSource, fsSource) {
    // Initialize a shader program
    const vertexShader = loadShader(mGl, mGl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(mGl, mGl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const cubeProgram = mGl.createProgram();
    mGl.attachShader(cubeProgram, vertexShader);
    mGl.attachShader(cubeProgram, fragmentShader);
    mGl.linkProgram(cubeProgram);

    // If creating the shader program failed, alert
    if (!mGl.getProgramParameter(cubeProgram, mGl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + mGl.getProgramInfoLog(cubeProgram));
        return null;
    }

    mCubeProgramInfo = {
        program: cubeProgram,
        attribLocations: {
            vertexPosition: mGl.getAttribLocation(cubeProgram, 'aPosition'),
            textureCoord: mGl.getAttribLocation(cubeProgram, 'aTexCoord')
        },
        uniformLocations: {
            uModelMatrix: mGl.getUniformLocation(cubeProgram, 'uModelMatrix'),
            uViewMatrix: mGl.getUniformLocation(cubeProgram, 'uViewMatrix'),
            uProjectionMatrix: mGl.getUniformLocation(cubeProgram, 'uProjectionMatrix'),
            uTexSampler: mGl.getUniformLocation(cubeProgram, 'uTexSampler'),
        },
    };
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

    drawSkybox(gl, mProgram, mBuffers);
    // drawCube(gl, mCubeProgramInfo, mCubeBuffers);

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

function drawSkybox(gl, programInfo, buffers) {
    if (null == programInfo || !mSkyboxTexture) {
        console.log('drawSkybox, No program info or no skybox texture.');
        return;
    }

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(programInfo.program);

    // 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // 绑定天空盒纹理
    gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_CUBE_MAP, mSkyboxTexture.texture); // bug2
    gl.uniform1i(programInfo.uniformLocations.uSkybox, 0);

    // 矩阵计算（移除平移部分）
    const viewMatrix = mat4.clone(mViewMatrix);
    viewMatrix[12] = viewMatrix[13] = viewMatrix[14] = 0; // 清零平移分量

    const viewInverseMatrix = mat4.create();
    mat4.invert(viewInverseMatrix, mViewMatrix);
    viewInverseMatrix[12] = 0;
    viewInverseMatrix[13] = 0;
    viewInverseMatrix[14] = 0;

    var viewDirectionProjectionMatrix = mat4.create();
    mat4.multiply(viewDirectionProjectionMatrix, mProjectionMatrix, viewInverseMatrix);
    var viewDirectionProjectionInverseMatrix = mat4.create();
    mat4.invert(viewDirectionProjectionInverseMatrix, viewDirectionProjectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uViewDirectionProjectionInverse, false, viewDirectionProjectionInverseMatrix);

    // let our quad pass the depth test at 1.0
    gl.depthFunc(gl.LEQUAL);

    // 绘制天空盒
    gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

function drawCube(gl, programInfo, buffers) {
    if (null == programInfo) {
        console.log('drawCube, No program info.');
        return;
    }
    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMatrix, false, mModelMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, mViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, mProjectionMatrix);

    // 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // 绑定纹理坐标缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // 绘制每个面
    const faces = ['posX', 'negX', 'posY', 'negY', 'posZ', 'negZ'];
    for (let i = 0; i < faces.length; i++) {
        // 绑定对应的纹理
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mCubeTextures[faces[i]].texture);
        gl.uniform1i(programInfo.uniformLocations.uTexture, 0);

        // 绘制当前面
        const offset = i * 4; // 每个面 4 个顶点
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, 4);
    }

    // 禁用顶点属性
    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
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