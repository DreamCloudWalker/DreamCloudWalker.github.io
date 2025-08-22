const DEGREE_TO_RADIUS = Math.PI / 180;
  
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
  mat4.lookAt(mViewMatrix, vec3.fromValues(0.0, 0.0, 5.0), vec3.fromValues(0.0, 0.0, 0.0), 
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
  
  // requestAnimationFrame(render);
  requestRender();
}

// Draw the scene repeatedly
function requestRender() {
  drawScene(mGl, mProgram, 0);
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
          normalPosition: mGl.getAttribLocation(shaderProgram, 'aNormal'),
          textureCoord: mGl.getAttribLocation(shaderProgram, 'aTexCoord')
      },
      uniformLocations: {
          uProjectionMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
          uModelMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uModelMatrix'),
          uViewMatrixHandle: mGl.getUniformLocation(shaderProgram, 'uViewMatrix'),
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

function initModelBuffers(gl) {
    // read file
    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% loading');
        }
    }
    function onError(xhr) {
        console.log('load error!' + error.getWebGLErrorMessage());
    }

    var loader = new THREE.OBJLoader();
    loader.load('./model/pbr/FireHydrantMesh.obj', function(object) {
        for (var i = 0; i < object.children.length; i++) {
            var vertices = object.children[i].geometry.attributes.position;
            var normals = object.children[i].geometry.attributes.normal;
            var uvCoords = object.children[i].geometry.attributes.uv;
            // mIndices = object.children[0].geometry.getIndex();

            /* create buffer */
            // Create a buffer for the sphere's positions.
            const positionBuffer = gl.createBuffer();
            // Select the positionBuffer as the one to apply buffer operations to from here out.
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices.array, gl.STATIC_DRAW);    // notice: not new Float32Array(vertices)

            // normal
            const normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, normals.array, gl.STATIC_DRAW);

            // texture coord
            const uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, uvCoords.array, gl.STATIC_DRAW);

            // // index
            // const indexBuffer = gl.createBuffer();
            // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mIndices.array), gl.STATIC_DRAW);

            var objectGroupBuffer = {
                position: positionBuffer,
                normal: normalBuffer,
                uv: uvBuffer,
                drawCnt: vertices.count,   // may be indices.count if has indice
                // indices: indexBuffer,
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
  const orthogonalRotation = (mRolling % 180.0 != 0.0)
  const texWidth = orthogonalRotation ? mBaseTextureInfo.height : mBaseTextureInfo.width;
  const texHeight = orthogonalRotation ? mBaseTextureInfo.width : mBaseTextureInfo.height;
  if (0 == texWidth || 0 == texHeight) {
      console.info("drawScene: invalid texture size");
      return;
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
  mat4.rotate(mModelMatrix, 
              mModelMatrix,
              rollRotation,
              [0, 0, 1]);
              
  mat4.scale(mModelMatrix, mModelMatrix, [mScale, mScale, mScale]);

  for (var i = 0; i < mObjectBuffer.length; i++) {
    drawObjects(gl, programInfo, mObjectBuffer[i]);
  }
}

function drawObjects(gl, programInfo, buffers) {
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

  // Tell WebGL how to pull out the normals from the normal
  // buffer into the normal attribute.
  // {
  //     const numComponents = 3;
  //     const type = gl.FLOAT;
  //     const normalize = false;
  //     const stride = 0;
  //     const offset = 0;
  //     gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
  //     gl.vertexAttribPointer(
  //         programInfo.attribLocations.normalPosition,
  //         numComponents,
  //         type,
  //         normalize,
  //         stride,
  //         offset);
  //     gl.enableVertexAttribArray(
  //         programInfo.attribLocations.normalPosition);
  // }

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
  gl.bindTexture(gl.TEXTURE_2D, mBaseTextureInfo.texture);
  // Tell the shader we bound the diffuseTexture to diffuseTexture unit 0
  gl.uniform1i(programInfo.uniformLocations.uTextureHandle, 0);

  // if (null != mObjectNormalTexture.texture) {
  //     gl.activeTexture(gl.TEXTURE1);
  //     gl.bindTexture(gl.TEXTURE_2D, mObjectNormalTexture.texture);
  //     gl.uniform1i(programInfo.uniformLocations.uNormalSamplerHandle, 1);
  //     gl.uniform1f(programInfo.uniformLocations.uNormalScaleHandle, 1.0);
  // }
  // if (null != mObjectMetalnessTexture.texture) {
  //     gl.activeTexture(gl.TEXTURE2);
  //     gl.bindTexture(gl.TEXTURE_2D, mObjectMetalnessTexture.texture);
  //     gl.uniform1i(programInfo.uniformLocations.uMetallicSamplerHandle, 2);
  // }

  // if (null != mObjectRoughnessTexture.texture) {
  //     gl.activeTexture(gl.TEXTURE3);
  //     gl.bindTexture(gl.TEXTURE_2D, mObjectRoughnessTexture.texture);
  //     gl.uniform1i(programInfo.uniformLocations.uRoughnessSamplerHandle, 3);
  // }

  // if (null != mObjectEmissiveTexture.texture) {
  //     gl.activeTexture(gl.TEXTURE4);
  //     gl.bindTexture(gl.TEXTURE_2D, mObjectEmissiveTexture.texture);
  //     gl.uniform1i(programInfo.uniformLocations.uEmissiveSamplerHandle, 4);
  // }

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
  gl.drawArrays(gl.TRIANGLE_STRIP, offset, buffers.drawCnt);

  gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  // gl.disableVertexAttribArray(programInfo.attribLocations.normalPosition);
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
