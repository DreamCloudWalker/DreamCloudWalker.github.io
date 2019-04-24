const sphereSpanDegree = 5;
const sphereRadius = 2.0;
const DEGREE_TO_RADIUS = Math.PI / 180;
const ICOSAHEDRON_SHORT = 0.525731112119133606;
const ICOSAHEDRON_LONG = 0.850650808352039932;
const GOLDEN_SECTION = 0.618034;
const OVEREXPOSURE_PARAM = 3.0;
const ANIM_FRAME_COUNT = 30;
const PAUSE_FRAME_CNT = 10;
const ENTER_ANIM_FRAME_CNT = 81;
const ENTER_YAWING_RADIUS = Math.PI / 4;
const ENTER_PITCHING_RADIUS = Math.PI / 18;
var mVertices = [];
var mIndices = [];
var mViewportWidth = 0;
var mViewportHeight = 0;
var mPitching = 0.0;
var mYawing = 0.0;
var mScale = 0.0;
var mStarted = false;
var mEnded = false;
var mPaused = false;
var mCurrentScale = 0.0;
var mEnterScale = 0.0;
var mCenterRatioRadius = 0.1;
var mEndAnimParam = 0.0;
var mEndAnimSizeParam = 0.0;
var mTimeEllapse = 0.0;
var mAfterEnterTimeEllapse = 0.0;
var mIcosahedronShort = ICOSAHEDRON_SHORT;
var mIcosahedronLong = ICOSAHEDRON_LONG;
var mAnimFrameCnt = 0;
var mEnterAnimFrameCnt = 0;
var mPauseAnimFrameCnt = 0;
var mProjectionMatrix = mat4.create();
var mModelViewMatrix = mat4.create();

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
    const zFar = 10.0;

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mProjectionMatrix = mat4.create();
    mat4.perspective(mProjectionMatrix, fov, aspect, zNear, zFar);

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
        uniform float uCenterRatioRadius;
        uniform float uEndAnimSizeParam;

        varying float vMixFactor;

        void main() {
            vec4 pntPos = uProjectionMatrix * uModelViewMatrix * aPosition;
            float rLength = 1.0 / pntPos.w;
            pntPos *= rLength;
            float distance = sqrt(pntPos.x * pntPos.x + pntPos.y * pntPos.y);
            if (distance < uCenterRatioRadius) {
                return ;
            } else {
                float minScale = 3.0;
                float pointSize = distance * distance * distance * distance * 45.0 + uEndAnimSizeParam * 10.0;
                gl_PointSize = (pointSize < minScale) ? minScale : pointSize;
            }

            gl_Position = pntPos;
            if (distance < 0.59) {
                vMixFactor = 0.0;
            } else if (distance > 0.64) {
                vMixFactor = 1.0;
            } else {
                vMixFactor = abs((0.64 - distance) * 20.0);
            }
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;
        uniform vec2 uViewport;
        uniform float uEndAnimParam;

        varying float vMixFactor;

        void main() {
            if (length(gl_PointCoord - vec2(0.5)) > 0.5) {
                discard;
            }
            
            // gl_FragCoord.y / uViewport.y (0~1)
            vec4 finalColor = vec4(abs(1.0 - gl_FragCoord.y / uViewport.y), 1.0, 0.0, 1.0);
            vec4 mixColor = vec4(0.0, 1.0, 0.9, 1.0);
            finalColor = mix(mixColor, finalColor, vMixFactor);
            gl_FragColor = finalColor + vec4(uEndAnimParam, uEndAnimParam, uEndAnimParam, 0.0);
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
            uCenterRatioRadiusHandle: gl.getUniformLocation(shaderProgram, 'uCenterRatioRadius'),
            uProjectionMatrixHandle: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelViewMatrixHandle: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            uViewportHandle: gl.getUniformLocation(shaderProgram, 'uViewport'),
            uEndAnimParamHandle : gl.getUniformLocation(shaderProgram, 'uEndAnimParam'),
            uEndAnimSizeParamHandle : gl.getUniformLocation(shaderProgram, 'uEndAnimSizeParam'),
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
    /* create buffer */
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    /* create data */
    // Now create an array of positions for the geoSphere
    mVertices = createSphereBySubdivideIcosahedron(8);

    /* bind buffer */
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mVertices), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mIndices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        indices: indexBuffer,
    };
}

function cullVertex(vertices, indices) {
    var ret = [];
    for (var i = 0; i < indices.length; i++) {
        var j = indices[i];
        ret.push(vertices[3 * j]);
        ret.push(vertices[3 * j + 1]);
        ret.push(vertices[3 * j + 2]);
    }

    return ret;
}

function createSphereBySubdivideIcosahedron(subdivideLevel) {
    mIcosahedronLong = Math.sqrt(sphereRadius * sphereRadius / (1 + GOLDEN_SECTION * GOLDEN_SECTION));
    mIcosahedronShort = mIcosahedronLong * GOLDEN_SECTION;
    const icosahedronVertices = [
        0,                  mIcosahedronLong,   -mIcosahedronShort,             // vertices[0] 顶正棱锥顶点
        0,                  mIcosahedronLong,   mIcosahedronShort,              // vertices[1]
        mIcosahedronLong,   mIcosahedronShort,  0,                              // vertices[2]
        mIcosahedronShort,  0,                  -mIcosahedronLong,              // vertices[3]
        -mIcosahedronShort, 0,                  -mIcosahedronLong,              // vertices[4]
        -mIcosahedronLong,  mIcosahedronShort,  0,                              // vertices[5]

        -mIcosahedronShort, 0,                  mIcosahedronLong,               // vertices[6]
        mIcosahedronShort,  0,                  mIcosahedronLong,               // vertices[7]
        mIcosahedronLong,   -mIcosahedronShort, 0,                              // vertices[8]
        0,                  -mIcosahedronLong,  -mIcosahedronShort,             // vertices[9]
        -mIcosahedronLong,  -mIcosahedronShort, 0,                              // vertices[10]
        0,                  -mIcosahedronLong,  mIcosahedronShort               // vertices[11]
    ];

    const icosahedronIndices = [
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
    var vertices20 = cullVertex(icosahedronVertices, icosahedronIndices);

    // 坐标数据初始化
    var alVertices = []; // 原顶点列表（未卷绕）
    var alIndices = [];  // 组织成面的顶点的索引值列表（按逆时针卷绕）
    var vertexCnt = 0;
    for (var k = 0; k < vertices20.length; k += 9) {  // 对正20面体每个大三角形循环
        // var v1 = [vertices20[k + 0], vertices20[k + 1], vertices20[k + 2]];
        // var v2 = [vertices20[k + 3], vertices20[k + 4], vertices20[k + 5]];
        // var v3 = [vertices20[k + 6], vertices20[k + 7], vertices20[k + 8]];
        var v1 = vec3.fromValues(vertices20[k + 0], vertices20[k + 1], vertices20[k + 2]);
        var v2 = vec3.fromValues(vertices20[k + 3], vertices20[k + 4], vertices20[k + 5]);
        var v3 = vec3.fromValues(vertices20[k + 6], vertices20[k + 7], vertices20[k + 8]);

        // vertices
        for (var i = 0; i <= subdivideLevel; i++) {
            var viStart = divideSphere(sphereRadius, v1, v2, subdivideLevel, i);
            var viEnd = divideSphere(sphereRadius, v1, v3, subdivideLevel, i);
            for (var j = 0; j <= i; j++) {
                var vi = divideSphere(sphereRadius, viStart, viEnd, i, j);
                alVertices.push(vi[0]);
                alVertices.push(vi[1]);
                alVertices.push(vi[2]);
            }
        }
        // index
        for (var i = 0; i < subdivideLevel; i++) {
            if (0 == i) {   // 若是第0行，直接加入卷绕后顶点索引012
                alIndices.push(vertexCnt + 0);
                alIndices.push(vertexCnt + 1);
                alIndices.push(vertexCnt + 2);
                vertexCnt++;
                if (i == subdivideLevel - 1) { // 如果是每个大三角形的最后一次循环，将下一列的顶点个数也加上
                    vertexCnt += 2;
                }
                continue;
            }
            var iStart = vertexCnt; // 第i行开始的索引
            var viCount = i + 1;
            var iEnd = iStart + viCount - 1;    // 第i行结束索引

            var iStartNext = iStart + viCount;  // 第i+1行开始的索引
            var viCountNext = viCount + 1;      // 第i+1行顶点数
            var iEndNext = iStartNext + viCountNext - 1;    // 第i+1行结束的索引
            // 前面的四边形
            for (var j = 0; j < viCount - 1; j++) {
                var index0 = iStart + j;    // 四边形的四个顶点索引
                var index1 = index0 + 1;
                var index2 = iStartNext + j;
                var index3 = index2 + 1;
                // 加入前面的四边形
                alIndices.push(index0);
                alIndices.push(index2);
                alIndices.push(index3);
                alIndices.push(index0);
                alIndices.push(index3);
                alIndices.push(index1);
            }
            // 最后一个三角形
            alIndices.push(iEnd);
            alIndices.push(iEndNext - 1);
            alIndices.push(iEndNext);
            vertexCnt += viCount;   // 第i行前所有顶点数的和
            if (i == subdivideLevel - 1) {
                vertexCnt += viCountNext;
            }
        }
    }

    // 计算卷绕顶点
    mVertices = alVertices;     // cullVertex(alVertices, alIndices);   // 只计算顶点
    mIndices = alIndices;

    // mVertices = icosahedronVertices;
    // mIndices = icosahedronIndices;

    return mVertices;
}

/**
 * @param {球的半径} radius 
 * @param {指向圆弧起点的向量} start 
 * @param {指向圆弧终点的向量} end 
 * @param {圆弧分的份数} n 
 * @param {求第i份在圆弧上的坐标（i为0和n时分别代表起点和终点坐标）} i 
 */
function divideSphere(radius, start, end, n, i) {
    /*
    * 先求出所求向量的规格化向量，再乘以半径r即可
    * s0*x+s1*y+s2*z=cos(angle1)//根据所求向量和起点向量夹角为angle1---1式
    * e0*x+e1*y+e2*z=cos(angle2)//根据所求向量和终点向量夹角为angle2---2式
    * x*x+y*y+z*z=1//所球向量的规格化向量模为1---3式
    * x*n0+y*n1+z*n2=0//所球向量与法向量垂直---4式
    * 算法为：将1、2两式用换元法得出x=a1+b1*z，y=a2+b2*z的形式，
    * 将其代入4式求出z，再求出x、y，最后将向量(x,y,z)乘以r即为所求坐标。
    * 1式和2式是将3式代入得到的，因此已经用上了。
    * 由于叉乘的结果做了分母，因此起点、终点、球心三点不能共线
    * 注意结果是将劣弧等分
    */
    // 先将指向起点和终点的向量规格化
    vec3.normalize(start, start);
    vec3.normalize(end, end);
    if (0 == n) {
        return vec3.fromValues(start[0] * radius, start[1] * radius, start[2] * radius);
    }

    // 求两个向量的夹角
    var angleRadius = Math.acos(vec3.dot(start, end));   // 起点终点向量夹角
    var angleRadius1 = angleRadius * i / n;         // 球向量和起点向量的夹角
    var angleRadius2 = angleRadius - angleRadius1;  // 球向量和终点向量的夹角

    // 求法向量
    var normal = vec3.create();
    vec3.cross(normal, start, end);
    // 用doolittle分解算法解n元一次线性方程组
    var tmpMatrix = [
        [start[0], start[1], start[2], Math.cos(angleRadius1)], 
        [end[0], end[1], end[2], Math.cos(angleRadius2)], 
        [normal[0], normal[1], normal[2], 0]
    ];
    var rowNum = tmpMatrix.length;          // 获得未知数的个数
    var xNum = tmpMatrix[0].length - rowNum;// 所求解的组数（一）
    // create a augment matrix
    var augMatrix = [];
    for (var i = 0; i <= rowNum; i++) {
        augMatrix[i] = new Array();
        augMatrix[i][0] = 0;
    }
    for (var i = 0; i <= rowNum + xNum; i++) {
        augMatrix[0][i] = 0;
    }
    for (var i = 1; i <= rowNum; i++) {
        for (var j = 1; j <= rowNum + xNum; j++) {
            augMatrix[i][j] = tmpMatrix[i-1][j-1];
        }
    }

    for (var i = 1; i <= rowNum; i++) {
        // prepare choose
        for (var j = i; j <= rowNum; j++) {
            for (var k = i - 1; k >= 1; k--) {
                augMatrix[j][i] = augMatrix[j][i] - augMatrix[j][k] * augMatrix[k][i];
            }
        }
        // choose 
        var line = i;
        for (var j = i + 1; j <= rowNum; j++) {
            if (augMatrix[j][i] * augMatrix[j][i] > augMatrix[line][i] * augMatrix[line][i]) {
                line = j;
            }
        }
        if (augMatrix[line][i] == 0) {
            alert("doolittle fail!");
        }
        if (line != i) {    // exchange
            var tmp;
            for (var j = 1; j <= rowNum + xNum; j++) {
                tmp = augMatrix[i][j];
                augMatrix[i][j] = augMatrix[line][j];
                augMatrix[line][j] = tmp;
            }
        }

        // resolve
        for (var j = i+1; j <= rowNum; j++) {
            augMatrix[j][i] = augMatrix[j][i] / augMatrix[i][i];
        }
        for (var j = i+1; j <= rowNum + xNum; j++) {
            for (var k = i-1; k >= 1; k--) {
                augMatrix[i][j] = augMatrix[i][j] - augMatrix[i][k] * augMatrix[k][j];
            }
        }
    }
    // find
    for (var k = 1; k <= xNum; k++) {
        augMatrix[rowNum][rowNum+k] = augMatrix[rowNum][rowNum+k] / augMatrix[rowNum][rowNum];
        for (var i = rowNum - 1; i >= 1; i--) {
            for (var j = rowNum; j > i; j--) {
                augMatrix[i][rowNum + k] = augMatrix[i][rowNum + k] - augMatrix[i][j] * augMatrix[j][rowNum + k];
            }
            augMatrix[i][rowNum + k] = augMatrix[i][rowNum + k] / augMatrix[i][i];
        }
    }

    var result = [];
    for (var i = 0; i < rowNum; i++) {
        result[i] = augMatrix[i+1][rowNum+1];
    }

    var ret = vec3.fromValues(result[0] * radius, result[1] * radius, result[2] * radius);
    return ret;
}

function getCenterVecFromTwoVec(vec1, vec2) {
    return vec3.fromValues((vec1[0] + vec2[0]) / 2, (vec1[1] + vec2[1]) / 2, (vec1[2] + vec2[2]) / 2);
}

function checkExecuteEndAnim() {
    if (mEnded) {
        mAnimFrameCnt++;
        if (mEndAnimParam < OVEREXPOSURE_PARAM) {
            mEndAnimParam = mAnimFrameCnt / ANIM_FRAME_COUNT * OVEREXPOSURE_PARAM; 
        }
        if (mEndAnimSizeParam < 1.0) {
            mEndAnimSizeParam = mAnimFrameCnt / ANIM_FRAME_COUNT;
        }
        if (ANIM_FRAME_COUNT <= mAnimFrameCnt) {
            mEndAnimParam = 0.0;
            mEndAnimSizeParam = 0.0;
            mEnded = false;
        }
    }
}

function lineInterpolator(from, to, factor) {
    return from + (to - from) * factor;
}

function springInterpolator(time, min, max) {
    var factor = Math.cos(time);    // -1 ~ 1
    factor = (factor + 1) * 0.5;    // 0 ~ 1
    factor = (max - min) * factor + min; // min ~ max

    return factor;
}

function executeEnterAnim() {
    if (mStarted) {
        mEnterAnimFrameCnt++;

        var progress = mEnterAnimFrameCnt / ENTER_ANIM_FRAME_CNT;
        if (mEnterScale < 1.0) {
            mEnterScale = progress;
        }
        if (mCenterRatioRadius < 0.4) {
            mCenterRatioRadius = 0.4 * progress;
        }
        if (mEnterAnimFrameCnt >= ENTER_ANIM_FRAME_CNT) {
            mStarted = false;
            mEnterScale = 0.0;
        }
    }
}

function start() {
    // alert("start");
    mStarted = true;
    mEnterAnimFrameCnt = 0;
    mAfterEnterTimeEllapse = 0;
    mYawing = 0;
    mPitching = 0;
}

function end() {
    // alert("end");
    mEnded = true;
    mAnimFrameCnt = 0;
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
    mPaused = true;
    mCurrentScale = mScale;
}

function resume() {
    mPaused = false;
    mAfterEnterTimeEllapse = 0;
    mPauseAnimFrameCnt = 0;
}

function calcScale() {
    var scale = mScale;
    if (mPaused) {
        mPauseAnimFrameCnt++;
        var progress = (mPauseAnimFrameCnt < PAUSE_FRAME_CNT) ? mPauseAnimFrameCnt / PAUSE_FRAME_CNT : 1.0;
        scale = mCurrentScale + progress * (1.0 - mCurrentScale);
    } else {
        scale = (mEnterAnimFrameCnt < ENTER_ANIM_FRAME_CNT) ? mEnterScale : springInterpolator(mAfterEnterTimeEllapse * 7, 0.9, 1.0);
    }

    return scale;
}

function drawScene(gl, programInfo, buffers, deltaTime) {
    mTimeEllapse += deltaTime;

    executeEnterAnim();

    // Update the rotation for the next draw
    if (mEnterAnimFrameCnt >= ENTER_ANIM_FRAME_CNT) {
        mAfterEnterTimeEllapse += deltaTime;
        mYawing -= deltaTime * 0.38;
        mPitching += deltaTime * 0.1;
    }
    mScale = calcScale();
    checkExecuteEndAnim();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ortho
    // mat4.ortho(mProjectionMatrix, -aspect, aspect, -1, 1, zNear, zFar);

    // Set the drawing position to the "identity" point, which is the center of the scene.
    mModelViewMatrix = mat4.create();
    mat4.translate(mModelViewMatrix,     // destination matrix
                   mModelViewMatrix,     // matrix to translate
                   [-0.0, 0.0, -7.0]);  // amount to translate

    var progress = mEnterAnimFrameCnt / ENTER_ANIM_FRAME_CNT;
    mat4.rotate(mModelViewMatrix,  // destination matrix
                mModelViewMatrix,  // matrix to rotate
                (mEnterAnimFrameCnt < ENTER_ANIM_FRAME_CNT) ? 
                (ENTER_PITCHING_RADIUS - ENTER_PITCHING_RADIUS * progress) : mPitching,   // amount to rotate in radians
                [1, 0, 0]);       // axis to rotate around
    mat4.rotate(mModelViewMatrix,  // destination matrix
                mModelViewMatrix,  // matrix to rotate
                (mEnterAnimFrameCnt < ENTER_ANIM_FRAME_CNT) ? 
                (ENTER_YAWING_RADIUS - ENTER_YAWING_RADIUS * progress) : mYawing,   // amount to rotate in radians
                [0, 1, 0]);       // axis to rotate around
    mat4.rotate(mModelViewMatrix,  // destination matrix
                mModelViewMatrix,  // matrix to rotate
                -Math.PI / 2,     // amount to rotate in radians
                [0, 0, 1]);       // axis to rotate around
    mat4.scale(mModelViewMatrix, mModelViewMatrix, [mScale, mScale, mScale]);

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

    // Tell WebGL which indices to use to index the vertices
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    var mvp = mat4.create();
    mat4.multiply(mvp, mModelViewMatrix, mProjectionMatrix);
    var vertice1 = vec3.fromValues(mVertices[0], mVertices[1], mVertices[2]);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uProjectionMatrixHandle,
        false, mProjectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uModelViewMatrixHandle,
        false, mModelViewMatrix);
    gl.uniform2f(programInfo.uniformLocations.uViewportHandle, mViewportWidth, mViewportHeight);
    gl.uniform1f(programInfo.uniformLocations.uCenterRatioRadiusHandle, mCenterRatioRadius);
    gl.uniform1f(programInfo.uniformLocations.uEndAnimParamHandle, mEndAnimParam);
    gl.uniform1f(programInfo.uniformLocations.uEndAnimSizeParamHandle, mEndAnimSizeParam);

    const offset = 0;
    const vertexCount = mIndices.length;
    const type = gl.UNSIGNED_SHORT;
    // gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    gl.drawArrays(gl.POINTS, offset, mVertices.length / 3);
}