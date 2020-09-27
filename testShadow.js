const LIGHT_POSITION = vec3.fromValues(0.0, 7.0, 2.0);
const DEGREE_TO_RADIUS = Math.PI / 180;
const DEFAULT_RTT_RESOLUTION = 256;
var mViewportWidth = 0;
var mViewportHeight = 0;
var mProjectionMatrix = mat4.create();
var mViewMatrix = mat4.create();
var mModelMatrix = mat4.create();
var mMVPMatrix = mat4.create();
var mVpMatrixByLightCoord = mat4.create();
var mMVPMatrixByLightCoord = mat4.create();
var mShaderProgram = null;
var mBasicProgram = null;
var mTriangleBuffer = null;
var mPlaneBuffer = null;
var mYawing = 0.0;

function main() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl") || canvas.getContext('experimental-webgl');

    // Only continue if WebGL is available and working
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    mViewportWidth = canvas.clientWidth;
    mViewportHeight = canvas.clientHeight;
    gl.viewport(0, 0, mViewportWidth, mViewportHeight);

    // Create a perspective matrix
    const fov = 45 * DEGREE_TO_RADIUS;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000.0;
    // note: glmatrix.js always has the first argument as the destination to receive the result.
    mat4.perspective(mProjectionMatrix, fov, aspect, zNear, zFar);
    mat4.lookAt(mViewMatrix, vec3.fromValues(10.0, 10.0, 10.0), vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0));

    // init vp matrix by light coord
    let viewMatrixByLight = mat4.create();
    let projMatrixByLight = mat4.create();
    mat4.perspective(projMatrixByLight, 70.0, DEFAULT_RTT_RESOLUTION / DEFAULT_RTT_RESOLUTION, 0.1, 1000.0);
    mat4.lookAt(viewMatrixByLight, LIGHT_POSITION, vec3.fromValues(0.0, 0.0, 0.0), vec3.fromValues(0.0, 1.0, 0.0));
    mat4.multiply(mVpMatrixByLightCoord, projMatrixByLight, viewMatrixByLight);

    // init shader
    mBasicProgram = initBasicShader(gl);
    mShaderProgram = initShadowShader(gl);

    // Here's where we call the routine that builds all the objects we'll be drawing.
    mTriangleBuffer = initTriangleBuffer(gl);
    mPlaneBuffer = initPlaneBuffer(gl);

    var then = 0;
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;
        // draw scene
        drawScene(gl, deltaTime);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function initBasicShader(gl) {
    // Vertex shader program
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec4 aColor;

        uniform mat4 uMVPMatrix;
        uniform mat4 uMVPMatrixByLightCoord;

        varying vec4 vPositionByLightCoord;
        varying lowp vec4 vColor;

        void main() {
            gl_Position = uMVPMatrix * aPosition;
            vPositionByLightCoord = uMVPMatrixByLightCoord * aPosition;
            vColor = aColor;
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;
        uniform sampler2D uShadowSampler;   // shadow texture by RTT

        varying vec4 vPositionByLightCoord;
        varying lowp vec4 vColor;

        void main() {
            vec3 shadowCoord = (vPositionByLightCoord.xyz / vPositionByLightCoord.w) / 2.0 + 0.5;
            vec4 rgbaDepth = texture2D(uShadowSampler, shadowCoord.xy);
            float depth = rgbaDepth.a;
            float visibility = (shadowCoord.z > depth + 0.005) ? 0.5 : 1.0;

            gl_FragColor = vec4(vColor.rgb * visibility, vColor.a);
        }
    `;

    // Initialize a shader program
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    // Collect all the info needed to use the shader program
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aColor'),
        },
        uniformLocations: {
            uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
            uMVPMatrixByLightCoordHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrixByLightCoord'),
            uShadowSampler: gl.getUniformLocation(shaderProgram, 'uShadowSampler'),
        },
    };

    return programInfo;
}

function initShadowShader(gl) {
    // Vertex shader program
    const vsSource = `
        attribute vec4 aPosition;
        uniform mat4 uMVPMatrix;
        
        void main() {
            gl_Position = uMVPMatrix * aPosition;
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;

        void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, gl_FragCoord.z); // 将灯源视点下的每个顶点的深度值存入绘制的颜色内
        }
    `;

    // Initialize a shader program
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    // Collect all the info needed to use the shader program
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
        },
        uniformLocations: {
            uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
        },
    };

    return programInfo;
}

// creates a shader of the given type, uploads the source and compiles it.
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
  
    // Send the source to the shader object
    gl.shaderSource(shader, source);
  
    // Compile the shader program
    gl.compileShader(shader);
  
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
  
    return shader;
}

function initPlaneBuffer(gl) {
    // 创建一个面
    //  v1------v0
    //  |        |
    //  |        |
    //  |        |
    //  v2------v3
    // 顶点的坐标
    var vertices = new Float32Array([
        3.0, -1.7, 2.5, -3.0, -1.7, 2.5, -3.0, -1.7, -2.5, 3.0, -1.7, -2.5    // v0-v1-v2-v3
    ]);

    // 颜色的坐标
    var colors = new Float32Array([
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0
    ]);

    // 顶点的索引
    var indices = new Uint8Array([0, 1, 2,   0, 2, 3]);

    //将顶点的信息写入缓冲区对象
    var obj = {};
    obj.vertexBuffer = initArrayBufferVBO(gl, vertices, 3, gl.FLOAT);
    obj.colorBuffer = initArrayBufferVBO(gl, colors, 3, gl.FLOAT);
    obj.indexBuffer = initElementsBufferVBO(gl, indices, gl.UNSIGNED_BYTE);
    if(!obj.vertexBuffer || !obj.colorBuffer || !obj.indexBuffer) return null;

    obj.numIndices = indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return obj;
}

function initTriangleBuffer(gl) {
    // Create a triangle
    //       v2
    //      / |
    //     /  |
    //    /   |
    //  v0----v1
    // 顶点的坐标
    var vertices = new Float32Array([-0.8, 3.5, 0.0, 0.8, 3.5, 0.0, 0.0, 3.5, 1.8]);
    // 颜色的坐标
    var colors = new Float32Array([1.0, 0.5, 0.0, 1.0, 0.5, 0.0, 1.0, 0.0, 0.0]);
    // 顶点的索引
    var indices = new Uint8Array([0, 1, 2]);

    //创建一个对象保存数据
    var obj = {};

    //将顶点信息写入缓冲区对象
    obj.vertexBuffer = initArrayBufferVBO(gl, vertices, 3, gl.FLOAT);
    obj.colorBuffer = initArrayBufferVBO(gl, colors, 3, gl.FLOAT);
    obj.indexBuffer = initElementsBufferVBO(gl, indices, gl.UNSIGNED_BYTE);
    if(!obj.vertexBuffer || !obj.colorBuffer || !obj.indexBuffer) return null;

    obj.numIndices = indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return obj;
}

function initArrayBufferVBO(gl, data, num, type) {
    var buffer = gl.createBuffer();
    if(!buffer){
        console.log("can not create VBO buffer");
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initElementsBufferVBO(gl, data, type) {
    var buffer = gl.createBuffer();
    if(!buffer){
        console.log("can not create VBO buffer");
        return null;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}

function drawScene(gl, deltaTime) {
    gl.clearColor(0.5, 0.5, 0.5, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the drawing position to the "identity" point, which is the center of the scene.
    mat4.rotate(mModelMatrix,   // destination matrix
        mModelMatrix,           // matrix to rotate
        mYawing,                // amount to rotate in radians
        [0, 1, 0]);             // axis to rotate around

    mat4.multiply(mMVPMatrix, mViewMatrix, mProjectionMatrix);
    mat4.multiply(mMVPMatrix, mModelMatrix, mMVPMatrix);

    gl.useProgram(mBasicProgram.program);
    draw(gl, mBasicProgram, mTriangleBuffer, mMVPMatrix);
    draw(gl, mBasicProgram, mPlaneBuffer, mMVPMatrix);
}

function draw(gl, program, obj, mvpMatrix) {
    initAttributeVariable(gl, program.attribLocations.vertexPosition, obj.vertexBuffer);
    if (program.attribLocations.vertexColor != undefined) {
        initAttributeVariable(gl, program.attribLocations.vertexColor, obj.colorBuffer);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);

    // Set the shader uniforms
    // gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mvpMatrix);

    const offset = 0;
    const vertexCount = obj.numIndices;
    const type = gl.UNSIGNED_BYTE;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
}

function initAttributeVariable(gl, attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // TODO
    gl.vertexAttribPointer(attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(attribute);
}