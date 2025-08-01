var mPlaneTextureInfo = null;
var mLutTextureInfo = null;
var mVertices = [];
var mTexCoods = [];
var mViewportWidth = 0;
var mViewportHeight = 0;

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

    mPlaneTextureInfo = loadTextureByUrl(mGl, './texture/image_edit.jpg');
    mLutTextureInfo = loadTextureByUrl(mGl, './texture/lut_yellow.png');

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
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec2 aTexCoord;

        varying highp vec2 vTexCoord;

        void main(void) {
            gl_Position = aPosition;
            vTexCoord = aTexCoord;
        }
    `;
    // Fragment shader program
    const fsSource = `
        precision highp float;

        uniform sampler2D uTexture;
        uniform sampler2D uLutTexture;

        varying lowp vec2 vTexCoord;

        void main() {
            vec4 textureColor = texture2D(uTexture, vTexCoord);
            
            // 获取 B 分量值，确定 LUT 小方格的 index, 取值范围转为 0～63
            highp float blueColor = textureColor.b * 63.0;
            // 取与 B 分量值最接近的 2 个小方格的坐标
            vec2 quad1;
            quad1.y = floor(floor(blueColor) / 8.0);
            quad1.x = floor(blueColor) - (quad1.y * 8.0);

            vec2 quad2;
            quad2.y = floor(ceil(blueColor) / 8.0);
            quad2.x = ceil(blueColor) - (quad2.y * 8.0);
            
            // 通过 R 和 G 分量的值确定小方格内目标映射的 RGB 组合的坐标，然后归一化，转化为纹理坐标。
            vec2 texPos1;
            texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);
            texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);

            vec2 texPos2;
            texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);
            texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);

            // 取目标映射对应的像素值
            vec4 newColor1 = texture2D(uLutTexture, texPos1);
            vec4 newColor2 = texture2D(uLutTexture, texPos2);

            // 使用 Mix 方法对 2 个边界像素值进行混合
            vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
            gl_FragColor = mix(textureColor, vec4(newColor.rgb, textureColor.w), 1.0);
        }
    `;

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
            uTextureHandle: mGl.getUniformLocation(shaderProgram, 'uTexture'),
            uLutTextureHandle: mGl.getUniformLocation(shaderProgram, 'uLutTexture')
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

function drawScene(gl, programInfo, buffers, deltaTime) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

    const offset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, mVertices.length / 3);

    gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
}