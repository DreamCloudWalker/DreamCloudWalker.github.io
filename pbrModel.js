const DEGREE_TO_RADIUS = Math.PI / 180;

var mCameraPosition = [0.0, 5.0, 5.0];
let mCameraAnimationTarget = null; // 动画目标位置
let mCameraAnimationVelocity = vec3.create(); // 动画速度
  
var mObjectBuffer = [];
var mBaseTextureInfo = null;
var mObjectNormalTexture = null;
var mObjectMetalnessTexture = null;
var mObjectEmissiveTexture = null;
var mObjectRoughnessTexture = null;
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mRolling = 0.0;
var mScale = 1.0;
var mTransX = 0.0;
var mTransY = 0.0;
var mProjectionMatrix = mat4.create();
var mModelMatrix = mat4.create();
var mViewMatrix = mat4.create();
var mMvpMatrix = mat4.create();
var mProgram = null;
var mBuffers = null;
var mGl = null;

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
  mat4.lookAt(mViewMatrix, vec3.fromValues(mCameraPosition[0], mCameraPosition[1], mCameraPosition[2]), 
    vec3.fromValues(0.0, 0.0, 0.0), 
    vec3.fromValues(0.0, 1.0, 0.0));

  // Create a perspective matrix
  const fov = 45 * DEGREE_TO_RADIUS;   // in radians
  const aspect = mGl.canvas.clientWidth / mGl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 1000.0;

  // note: glmatrix.js always has the first argument as the destination to receive the result.
  mProjectionMatrix = mat4.create();
  mat4.perspective(mProjectionMatrix, fov, aspect, zNear, zFar);

  mBaseTextureInfo = loadTextureByUrl(mGl, './model/pbr/fire_hydrant_Base_Color.png');
  mObjectNormalTexture = loadTextureByUrl(mGl, './model/pbr/fire_hydrant_Normal.png');
  mObjectMetalnessTexture = loadTextureByUrl(mGl, './model/pbr/fire_hydrant_Metallic.png');
  mObjectEmissiveTexture = loadTextureByUrl(mGl, './model/pbr/fire_hydrant_Mixed_AO.png');
  mObjectRoughnessTexture = loadTextureByUrl(mGl, './model/pbr/fire_hydrant_Roughness.png');

  // init shader
  updateShader();

  // mBuffers = initBuffers(mGl);
  initModelBuffers(mGl);

  // 初始化鼠标控制
  initMouseControls(canvas);
  
  // requestAnimationFrame(render);
  requestRender();
}

// Draw the scene repeatedly
function requestRender() {
  drawScene(mGl, mProgram, 0);

  // 如果鼠标未拖拽，应用惯性旋转
  if (!mIsDragging) {
      if (Math.abs(mVelocityX) > 0.01 || Math.abs(mVelocityY) > 0.01) {
          mYawing += mVelocityX;
          mPitching += mVelocityY;

          // 应用阻尼
          mVelocityX *= mDamping;
          mVelocityY *= mDamping;

          requestAnimationFrame(requestRender); // 持续渲染
      }
  }

  // 相机动画逻辑
    if (mCameraAnimationTarget) {
        const damping = 0.1; // 阻尼系数
        const distanceThreshold = 0.01; // 停止动画的距离阈值

        // 计算相机位置与目标位置的差值
        const direction = vec3.create();
        vec3.subtract(direction, mCameraAnimationTarget, mCameraPosition);

        // 如果距离小于阈值，停止动画
        if (vec3.length(direction) < distanceThreshold) {
            vec3.copy(mCameraPosition, mCameraAnimationTarget);
            mCameraAnimationTarget = null; // 停止动画
        } else {
            // 应用阻尼移动相机
            vec3.scale(direction, direction, damping);
            vec3.add(mCameraPosition, mCameraPosition, direction);

            requestAnimationFrame(requestRender); // 持续渲染
        }
    }
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

            // 更新旋转角度
            mYawing += deltaX * 0.5; // 鼠标水平移动控制 Yaw
            mPitching += deltaY * 0.5; // 鼠标垂直移动控制 Pitch

            // 更新惯性速度
            mVelocityX = deltaX * 0.1;
            mVelocityY = deltaY * 0.1;

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

        // 计算相机移动方向
        const direction = vec3.create();
        vec3.subtract(direction, [0, 0, 0], mCameraPosition); // 从相机指向原点
        vec3.normalize(direction, direction);

        // 更新相机位置
        const velocity = vec3.create();
        vec3.scale(velocity, direction, zoomSpeed * delta);
        vec3.add(mCameraPosition, mCameraPosition, velocity);

        requestRender(); // 持续渲染
    }, { passive: false }); // 设置为非被动模式，允许调用 preventDefault

    // 鼠标双击交互
    canvas.addEventListener('dblclick', () => {
        const targetPosition = vec3.equals(mCameraPosition, [0.0, 5.0, 5.0])
            ? [0.0, 2.5, 2.5]
            : [0.0, 5.0, 5.0];

        animateCameraTo(targetPosition);
    });
}

function animateCameraTo(targetPosition) {
    mCameraAnimationTarget = targetPosition;
    mCameraAnimationVelocity = vec3.create(); // 重置速度
    requestRender(); // 开始动画
}

function updateShader() {
    const vsSource = document.getElementById('pbr_vertex_shader').value;
    const fsSource = document.getElementById('pbr_fragment_shader').value;

    const vertexShader = loadShader(mGl, mGl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(mGl, mGl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = mGl.createProgram();
    mGl.attachShader(shaderProgram, vertexShader);
    mGl.attachShader(shaderProgram, fragmentShader);
    mGl.linkProgram(shaderProgram);

    if (!mGl.getProgramParameter(shaderProgram, mGl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + mGl.getProgramInfoLog(shaderProgram));
        return null;
    }

    mProgram = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: mGl.getAttribLocation(shaderProgram, 'aPosition'),
            normalPosition: mGl.getAttribLocation(shaderProgram, 'aNormal'),
            textureCoord: mGl.getAttribLocation(shaderProgram, 'aTexCoord'),
        },
        uniformLocations: {
            uProjectionMatrix: mGl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelMatrix: mGl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            uViewMatrix: mGl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            uMITMatrix: mGl.getUniformLocation(shaderProgram, 'uMITMatrix'),
            uLightPosition: mGl.getUniformLocation(shaderProgram, 'uLightPosition'),
            uLightColor: mGl.getUniformLocation(shaderProgram, 'uLightColor'),
            uCameraPosition: mGl.getUniformLocation(shaderProgram, 'uCameraPosition'),
            uBaseColorMap: mGl.getUniformLocation(shaderProgram, 'uBaseColorMap'),
            uNormalMap: mGl.getUniformLocation(shaderProgram, 'uNormalMap'),
            uRoughnessMap: mGl.getUniformLocation(shaderProgram, 'uRoughnessMap'),
            uMetallicMap: mGl.getUniformLocation(shaderProgram, 'uMetallicMap'),
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

function initModelBuffers(gl) {
    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% loading');
        }
    }
    function onError(xhr) {
        console.log('load error!' + xhr.message);
    }

    var loader = new THREE.OBJLoader();
    loader.load('./model/pbr/FireHydrantMesh.obj', function(object) {
        for (var i = 0; i < object.children.length; i++) {
            const geometry = object.children[i].geometry;
            const vertices = geometry.attributes.position;
            const normals = geometry.attributes.normal;
            const uvCoords = geometry.attributes.uv;
            const indices = geometry.index;

            // 1. 检查索引是否存在，若不存在则生成默认索引（0,1,2,3,...）
            let indexArray;
            let drawCnt;
            if (indices !== null) {
                indexArray = indices.array;
                drawCnt = indices.count;
            } else {
                // 如果没有索引，则直接使用顶点顺序作为索引（0,1,2,3,...）
                indexArray = new Uint16Array(vertices.count);
                for (let j = 0; j < vertices.count; j++) {
                    indexArray[j] = j;
                }
                drawCnt = vertices.count;
            }

            // 2. 初始化顶点缓冲区
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices.array, gl.STATIC_DRAW);

            // 3. 初始化法线缓冲区（如果存在）
            let normalBuffer = null;
            if (normals !== undefined) {
                normalBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, normals.array, gl.STATIC_DRAW);
            }

            // 4. 初始化UV缓冲区（如果存在）
            let uvBuffer = null;
            if (uvCoords !== undefined) {
                uvBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, uvCoords.array, gl.STATIC_DRAW);
            }

            // 5. 初始化索引缓冲区
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

            // 6. 存储缓冲区对象
            var objectGroupBuffer = {
                position: positionBuffer,
                normal: normalBuffer,
                uv: uvBuffer,
                indices: indexBuffer,
                drawCnt: drawCnt, // 索引的数量
            };
            mObjectBuffer.push(objectGroupBuffer);
        }
        requestRender();
    }, onProgress, onError);
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

function drawScene(gl, programInfo, deltaTime) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);  // Clear to white, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.useProgram(programInfo.program);

    // 更新视图矩阵
    mat4.lookAt(mViewMatrix, vec3.fromValues(mCameraPosition[0], mCameraPosition[1], mCameraPosition[2]),
        vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0));

    // 更新模型矩阵
    mat4.identity(mModelMatrix);
    mat4.rotateX(mModelMatrix, mModelMatrix, mPitching * DEGREE_TO_RADIUS);
    mat4.rotateY(mModelMatrix, mModelMatrix, mYawing * DEGREE_TO_RADIUS);
    mat4.rotateZ(mModelMatrix, mModelMatrix, mRolling * DEGREE_TO_RADIUS);

    // 设置 Uniform
    const normalMatrix = mat4.create(); // 模型逆转置矩阵
    mat4.invert(normalMatrix, mModelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uMITMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, mProjectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, mViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMatrix, false, mModelMatrix);
    gl.uniform3fv(programInfo.uniformLocations.uLightPosition, [10.0, 10.0, 10.0]);
    gl.uniform3fv(programInfo.uniformLocations.uLightColor, [1.0, 1.0, 1.0]);
    gl.uniform3fv(programInfo.uniformLocations.uCameraPosition, mCameraPosition);

    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mBaseTextureInfo.texture);
    gl.uniform1i(programInfo.uniformLocations.uBaseColorMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, mObjectNormalTexture.texture);
    gl.uniform1i(programInfo.uniformLocations.uNormalMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, mObjectRoughnessTexture.texture);
    gl.uniform1i(programInfo.uniformLocations.uRoughnessMap, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, mObjectMetalnessTexture.texture);
    gl.uniform1i(programInfo.uniformLocations.uMetallicMap, 3);

    // 绘制对象
    for (let i = 0; i < mObjectBuffer.length; i++) {
        drawObjects(gl, programInfo, mObjectBuffer[i]);
    }
}

function drawObjects(gl, programInfo, buffers) {
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
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
      gl.vertexAttribPointer(
          programInfo.attribLocations.normalPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(programInfo.attribLocations.normalPosition);
  }

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
  
  const tempMatrix = mat4.create();
  mat4.multiply(tempMatrix, mViewMatrix, mModelMatrix);
  mat4.multiply(mMvpMatrix, mProjectionMatrix, tempMatrix);
  updateHtmlMvpMatrixByRender();

  // 绑定索引缓冲区
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // 绘制对象
  gl.drawElements(gl.TRIANGLES, buffers.drawCnt, gl.UNSIGNED_SHORT, 0);
  // gl.drawArrays(gl.TRIANGLE_STRIP, offset, buffers.drawCnt);

  gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  gl.disableVertexAttribArray(programInfo.attribLocations.normalPosition);
  gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
}

function updateHtmlMvpMatrixByRender() {
  document.getElementById("id_pbr_model_mvpmatrix_m00").innerHTML = mMvpMatrix[0].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m01").innerHTML = mMvpMatrix[4].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m02").innerHTML = mMvpMatrix[8].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m03").innerHTML = mMvpMatrix[12].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m10").innerHTML = mMvpMatrix[1].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m11").innerHTML = mMvpMatrix[5].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m12").innerHTML = mMvpMatrix[9].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m13").innerHTML = mMvpMatrix[13].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m20").innerHTML = mMvpMatrix[2].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m21").innerHTML = mMvpMatrix[6].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m22").innerHTML = mMvpMatrix[10].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m23").innerHTML = mMvpMatrix[14].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m30").innerHTML = mMvpMatrix[3].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m31").innerHTML = mMvpMatrix[7].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m32").innerHTML = mMvpMatrix[11].toFixed(2);
  document.getElementById("id_pbr_model_mvpmatrix_m33").innerHTML = mMvpMatrix[15].toFixed(2);
}

function refresh() {
  requestRender();
}
