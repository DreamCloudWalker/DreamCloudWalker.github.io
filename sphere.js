const sphereSpanDegree = 5;
const sphereRadius = 2;
const DEGREE_TO_RADIUS = Math.PI / 180;
const ICOSAHEDRON_SHORT = 0.525731112119133606;
const ICOSAHEDRON_LONG = 0.850650808352039932;
var vertices = [];
var viewportWidth = 0;
var viewportHeight = 0;
var pitching = 0.0;
var yawing = 0.0;
var fScale = 0.5;
var time = 0.0;

function main() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl") || canvas.getContext('experimental-webgl');

    // Only continue if WebGL is available and working
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    viewportWidth = canvas.clientWidth;
    viewportHeight = canvas.clientHeight;
    gl.viewport(0, 0, viewportWidth, viewportHeight);

    // init shader
    const programInfo = initShader(gl);

    // Here's where we call the routine that builds all the objects we'll be drawing.
    const buffers = initBuffers(gl);

    var then = 0;
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;
        // draw scene
        drawScene(gl, programInfo, buffers, deltaTime);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function initShader(gl) {
    // Vertex shader program
    const vsSource = `
        attribute vec4 aPosition;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        void main() {
            vec4 pntPos = uProjectionMatrix * uModelViewMatrix * aPosition;
            float distance = sqrt(pntPos.x * pntPos.x + pntPos.y * pntPos.y);
            // if (distance < 3.5) {
            //     return ;
            // } else {
                gl_PointSize = distance;
            // } 

            gl_Position = pntPos;
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;
        uniform vec2 uViewport;
        void main() {
            if (length(gl_PointCoord - vec2(0.5)) > 0.5) {
                discard;
            }
            
            // gl_FragCoord.y / uViewport.y (0~1)
            gl_FragColor = vec4(abs(1.0 - gl_FragCoord.y / uViewport.y), 1.0, 0.0, 1.0);
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
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition')
        },
        uniformLocations: {
            uProjectionMatrixHandle: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelViewMatrixHandle: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            uViewportHandle: gl.getUniformLocation(shaderProgram, "uViewport"),
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

function initBuffers(gl) {
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Now create an array of positions for the sphere
    vertices = createSphereByLL();

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

function createSphereByLL() {
    const positions = [];
    for (var vAngle = -90; vAngle < 90; vAngle += sphereSpanDegree) {
        for (var hAngle = 0; hAngle <= 360; hAngle += sphereSpanDegree) {
            var x0 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.cos(hAngle * DEGREE_TO_RADIUS);
            var y0 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.sin(hAngle * DEGREE_TO_RADIUS);
            var z0 = sphereRadius * Math.sin(vAngle * DEGREE_TO_RADIUS);

            var x1 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.cos((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var y1 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.sin((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var z1 = sphereRadius * Math.sin(vAngle * DEGREE_TO_RADIUS);

            var x2 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.cos((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var y2 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.sin((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var z2 = sphereRadius * Math.sin((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);

            var x3 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.cos(hAngle * DEGREE_TO_RADIUS);
            var y3 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.sin(hAngle * DEGREE_TO_RADIUS);
            var z3 = sphereRadius * Math.sin((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);

            positions.push(x1);
            positions.push(y1);
            positions.push(z1);
            positions.push(x3);
            positions.push(y3);
            positions.push(z3);
            positions.push(x0);
            positions.push(y0);
            positions.push(z0);

            positions.push(x1);
            positions.push(y1);
            positions.push(z1);
            positions.push(x2);
            positions.push(y2);
            positions.push(z2);
            positions.push(x3);
            positions.push(y3);
            positions.push(z3);
        }
    }
    return positions;
}

function createSphereBySubdivideIcosahedron(subdivideLevel) {
    var vectors = [
        vec3.fromValues(0,                  ICOSAHEDRON_LONG,   -ICOSAHEDRON_SHORT),
        vec3.fromValues(0,                  ICOSAHEDRON_LONG,   ICOSAHEDRON_SHORT),
        vec3.fromValues(ICOSAHEDRON_LONG,   ICOSAHEDRON_SHORT,  0),
        vec3.fromValues(ICOSAHEDRON_SHORT,  0,                  -ICOSAHEDRON_LONG),
        vec3.fromValues(-ICOSAHEDRON_SHORT, 0,                  -ICOSAHEDRON_LONG),
        vec3.fromValues(-ICOSAHEDRON_LONG,  ICOSAHEDRON_SHORT,  0),

        vec3.fromValues(-ICOSAHEDRON_SHORT, 0,                  ICOSAHEDRON_LONG),
        vec3.fromValues(ICOSAHEDRON_SHORT,  0,                  ICOSAHEDRON_LONG),
        vec3.fromValues(ICOSAHEDRON_LONG,   -ICOSAHEDRON_SHORT, 0),
        vec3.fromValues(0,                  -ICOSAHEDRON_LONG,  -ICOSAHEDRON_SHORT),
        vec3.fromValues(-ICOSAHEDRON_LONG,  -ICOSAHEDRON_SHORT, 0),
        vec3.fromValues(0,                  -ICOSAHEDRON_LONG,  ICOSAHEDRON_SHORT) 
    ];
    var indices = [
        0,1,2,
        0,2,3,
        0,3,4,
        0,4,5,
        0,5,1,

        1,6,7,
        1,7,2,
        2,7,8,
        2,8,3,
        3,8,9,
        3,9,4,
        4,9,10,
        4,10,5,
        5,10,6,
        5,6,1,

        6,11,7,
        7,11,8,
        8,11,9,
        9,11,10,
        10,11,6 
    ];

    for (var i = 0; i < subdivideLevel; i++) {
        var tmpVecs = [];
        var j = 0
        for (; j < vectors.length - 1; j++) {
            var centerVec = getCenterVecFromTwoVec(vectors[j], vectors[j+1]);
            vec3.normalize(centerVec,  centerVec);
            tmpVecs.push(vectors[j]);
            tmpVecs.push(centerVec);
        }
        tmpVecs.push(vectors[j]);

        vectors = tmpVecs;
    }

    var position = [];
    for (var i = 0; i < vectors.length - 1; i++) {
        position.push(vectors[i][0]);
        position.push(vectors[i][1]);
        position.push(vectors[i][2]);
    }

    return position;
}

function getCenterVecFromTwoVec(vec1, vec2) {
    return vec3.fromValues((vec1[0] + vec2[0]) / 2, (vec1[1] + vec2[1]) / 2, (vec1[2] + vec2[2]) / 2);
}

function lineInterpolator(from, to, factor) {
    return from + (to - from) * factor;
}

function springInterpolator(time, min, max) {
    var factor = Math.sin(time);    // -1 ~ 1
    factor = (factor + 1) * 0.5;    // 0 ~ 1
    factor = (max - min) * factor + min; // min ~ max

    return factor;
}

function drawScene(gl, programInfo, buffers, deltaTime) {
    time += deltaTime;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix
    const fov = 45 * DEGREE_TO_RADIUS;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);
    // Set the drawing position to the "identity" point, which is the center of the scene.
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix,     // destination matrix
                   modelViewMatrix,     // matrix to translate
                   [-0.0, 0.0, -7.0]);  // amount to translate
    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                yawing,   // amount to rotate in radians
                [0, 1, 0]);       // axis to rotate around
    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                pitching,   // amount to rotate in radians
                [1, 0, 0]);       // axis to rotate around
    mat4.scale(modelViewMatrix, modelViewMatrix, [fScale, fScale, fScale]);

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

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uProjectionMatrixHandle,
        false, projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uModelViewMatrixHandle,
        false, modelViewMatrix);
    gl.uniform2f(programInfo.uniformLocations.uViewportHandle, viewportWidth, viewportHeight);

    const offset = 0;
    const vertexCount = vertices.length / 3;    // 15768;
    gl.drawArrays(gl.POINTS, offset, vertexCount);

    // Update the rotation for the next draw
    yawing -= deltaTime * 0.061;
    pitching += deltaTime * 0.01;
    fScale = springInterpolator(time * 7, 0.9, 1.0);
}