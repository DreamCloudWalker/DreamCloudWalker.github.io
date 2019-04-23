const TWO_PI = Math.PI * 2.0;
const DEGREE_TO_RADIUS = Math.PI / 180;
const RADIUS_TO_DEGREE = 180 / Math.PI;
const AMBIENT_COLOR = vec4.fromValues(0.5, 0.5, 0.5, 1.0);
const DIFFUSE_COLOR = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
const SPECULAR_COLOR = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
const LIGHT_POSITION = vec3.fromValues(1.0, -1.0, 1.0);
const SPECULAR_VALUE = 32.0;
// proj
const HALF_FOV = 25 * DEGREE_TO_RADIUS;
const FRUSTOM_NEAR = 1.0;
const FRUSTOM_FAR = 10.0;
const GOD_FRUSTOM_NEAR = 0.1;
const GOD_FRUSTOM_FAR = 100.0;
// view
const EYE_INIT_POS_X = 0.0;
const EYE_INIT_POS_Y = 0.0;
const EYE_INIT_POS_Z = 5.0;
// chapter
const ChapterTitle = {
    CHAPTER_MATRIX: 0, 
    CHAPTER_MODEL_MATRIX: 1, 
    CHAPTER_VIEW_MATRIX: 2, 
    CHAPTER_PROJ_MATRIX: 3, 
    CHAPTER_EULAR: 4, 
};
// tube dir
const TubeDir = {
    DIR_X: 0, 
    DIR_Y: 1, 
    DIR_Z: 2,
};
// cobra anim frame cnt
const COBRA_STEP1_FRAME_CNT = 60;
const FALLING_LEAF1_FRAME_CNT = 15;
const FALLING_LEAF2_FRAME_CNT = 20;
const FALLING_LEAF3_FRAME_CNT = 25;
const FALLING_LEAF4_FRAME_CNT = 30;
const COBRA_STEP2_FRAME_CNT = 50;
const COBRA_Z_OFFSET = 1.3;
const COBRA_Y_OFFSET = 1.3;
// chapter
var mChapterTitle = ChapterTitle.CHAPTER_MATRIX;
// draw object
var mRadius = 1.0;
var mObjectBuffer = [];
var mObjectDiffuseTexture = null;
var mObjectNormalTexture = null;
// lighting
var mLightProgram = null;
var mAmbientColor = vec4.fromValues(0.5, 0.5, 0.5, 1.0);
var mDiffuseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
var mSpecularColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
var mUseAmbientColor = true;
var mUseDiffuseColor = true;
var mUseSpecularColor = true;
// draw background
var mBackgroundProgram = null;
var mBackgroundBuffer = null;
var mBackgroundTexture = null;
var mBackgroundVertices = [];
var mBackgroundUvs = [];
// draw Gimbal
var mNeedDrawGimbal = false;
var mPivotBuffer = null;
var mGimbalZPivot1Buffer = null;
var mGimbalZPivot2Buffer = null;
var mGimbalXPivot1Buffer = null;
var mGimbalXPivot2Buffer = null;
var mGimbalXBuffer = null;
var mGimbalYBuffer = null;
var mGimbalZBuffer = null;
var mGimbalModelMatrix = mat4.create();
var mGimbalMITMatrix = mat4.create();
var mGimbalMvpMatrix = mat4.create();
// draw viewing frustum
var mViewFrustumVertices = [];
var mViewFrustumVerticeColors = [];
var mViewFrustumBuffer = null;
var mViewFrustumModelMatrix = mat4.create();    // used to transform viewing frustum
var mViewFrustumMvpMatrix = mat4.create();
// draw near and far plane
var mNearPlaneVertices = [];
var mNearBuffer = null;
var mFarPlaneVertices = [];
var mFarBuffer = null;
var mNearFarPlaneColors = [];
// draw axis
var mAxisVertices = [];
var mAxisBuffer = null;
// viewport
var mViewportWidth = 0;
var mViewportHeight = 0;
// matrix
var mModelMatrix = mat4.create();
var mMITMatrix = mat4.create();
var mViewMatrix = mat4.create();
var mVIMatrix = mat4.create();
var mProjectionMatrix = mat4.create();
var mMvpMatrix = mat4.create();
var mGodViewMatrix = mat4.create();
var mGodVIMatrix = mat4.create();
var mGodProjectionMatrix = mat4.create();
var mGodMvpMatrix = mat4.create();
// draw assist object use mMvpMatrix
var mNeedDrawAssistObject = false;
var mCurrentViewport = [0, 0, 0, 0];
var mAssistCoord = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
var mAssistMvpCoord = vec4.create();
var mAssistMvpHomogCoord = vec4.create();
var mAssistScreenCoord = vec4.create();
var mAssistObjectBuffer = null;
// camera
var mLastEyePosX = EYE_INIT_POS_X;
var mLastEyePosY = EYE_INIT_POS_Y;
var mLastEyePosZ = EYE_INIT_POS_Z;
var mEyePosYawing = 0;
var mEyePosPitching = 0;
var mEye = vec3.create();
var mLastLookAtX = 0.0;
var mLastLookAtY = 0.0;
var mLastLookAtZ = 0.0;
var mLookAtCenter = vec3.create();
var mLastCameraUp = vec3.create();
var mCameraUp = vec3.create();
// projection
var mHalfFov = HALF_FOV;
var mNear = FRUSTOM_NEAR;
var mFar = FRUSTOM_FAR;
var mAspect = 1.0;
// transform
var mTranslateX = 0.0;
var mTranslateY = 0.0;
var mTranslateZ = 0.0;
var mScaleX = 1.0;
var mScaleY = 1.0;
var mScaleZ = 1.0;
// eular angle
var mPitching = 0.0;
var mYawing = 0.0;
var mRolling = 0.0;
var mTimeEllapse = 0.0;
var mRotateMatrix = mat4.create();
var mRotateXMatrix = mat4.create();
var mRotateYMatrix = mat4.create();
var mRotateZMatrix = mat4.create();
// axis-angle
const X_AXIS = vec3.fromValues(1.0, 0.0, 0.0);
var mRotAxis = vec3.fromValues(1.0, 0.0, 0.0);
var mRotAngle = 0;
// draw axis-angle axis
var mAngleAxisVertices = [];
var mAngleAxisBuffer = null;
var mAngleAxisMVPMatrix = mat4.create();
var mNeedDrawAngleAxis = false;
// quat
var mQuaternion = quat.create();
var mQuatRatateMatrix = mat4.create();
// input
var mMouseDown = false;
var mLastMouseX = null;
var mLastMouseY = null;
var mDragMainView = true;
// cobra anim
var mNeedDrawCobraAnim = false;
var mCobraAnimFrameEllapse = 0;
var mCobraAnimInterpolateQuat = quat.create();
var mCobraAnimRotateMatrix = mat4.create();
var mCobraInitQuat = quat.create();
var mCobraStep1Quat = quat.create();    // quat.fromEuler(COBRA_STEP1_QUAT, 120, 0, 0);
var mFallingLeaf1Quat = quat.create();   // quat.fromEuler(FALLING_LEAF_QUAT, 110, 0, 90);
var mFallingLeaf2Quat = quat.create();   // quat.fromEuler(FALLING_LEAF_QUAT, 100, 0, 180);
var mFallingLeaf3Quat = quat.create();   // quat.fromEuler(FALLING_LEAF_QUAT, 90, 0, 270);
var mFallingLeaf4Quat = quat.create();   // quat.fromEuler(FALLING_LEAF_QUAT, 80, 0, 360);
var mCobraStep2Quat = quat.create();    // quat.fromEuler(COBRA_STEP2_QUAT, 0, 0, 0);
var mCobraZOffset = 0.0;
var mCobraYOffset = 0.0;

function onKeyPress(event) {
    var key;
    if (navigator.appName == "Netscape") {
        key = String.fromCharCode(event.charCode);
    } else {
        key = String.fromCharCode(event.keyCode);
    }
    switch (key) {
        case 'W':
        case 'w':
            executePitching(-0.1);
            break;
        case 'S':
        case 's':
            executePitching(0.1);
            break;
        case 'Q':
        case 'q':
            executeYawing(0.1);
            break;
        case 'E':
        case 'e':
            executeYawing(-0.1);
            break;
        case 'A':
        case 'a':
            executeRolling(0.1);
            break;
        case 'D':
        case 'd':
            executeRolling(-0.1);
            break;
        default:
            break;
    }
}

function initBasicShader(gl) {
    // Vertex shader program
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec4 aColor;

        uniform mat4 uMVPMatrix;

        varying lowp vec4 vColor;

        void main() {
            gl_Position = uMVPMatrix * aPosition;
            vColor = aColor;
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;

        varying lowp vec4 vColor;

        void main() {
            gl_FragColor = vColor;
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
        },
    };

    return programInfo;
}

function updateBackgroundShader() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl") || canvas.getContext('experimental-webgl');
    // Vertex shader program
    var vsSource = document.getElementById('id_vertex_shader').value;
    // Fragment shader program
    var fsSource = document.getElementById('id_fragment_shader').value;

    // Initialize a shader program
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    // Collect all the info needed to use the shader program
    mBackgroundProgram = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
        },
        uniformLocations: {
            uTexSamplerHandle: gl.getUniformLocation(shaderProgram, 'uTexSampler'),
        },
    };
}

function initDiffuseLightingShader(gl) {
    // Vertex shader program
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec3 aNormal;
        attribute vec4 aColor;

        uniform mat4 uMVPMatrix;
        uniform vec3 uLightDir;
        uniform mat4 uMITMatrix;    // Inverse & Transpose of Model Matrix

        varying lowp vec4 vColor;
        varying vec3 vNormal;
        varying vec3 vLightDir;

        void main() {
            gl_Position = uMVPMatrix * aPosition;
            vColor = aColor;
            vNormal = normalize(vec3(uMITMatrix * vec4(aNormal, 0.0)));
            vLightDir = normalize(uLightDir);
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;

        uniform vec4 uKa;
        uniform vec4 uKd;

        varying lowp vec4 vColor;
        varying vec3 vNormal;
        varying vec3 vLightDir;

        void main() {
            vec4 color = vColor;
            vec4 ambientColor = uKa;
            vec4 diffuseColor = vec4(uKd.rgb * clamp(dot(vNormal, vLightDir), 0.0, 1.0), uKd.a);
            gl_FragColor = (ambientColor + diffuseColor) * color;
            gl_FragColor.a = 1.0;
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
            normalPosition: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
            uKaHandle: gl.getUniformLocation(shaderProgram, 'uKa'),
            uKdHandle: gl.getUniformLocation(shaderProgram, 'uKd'),
            uLightDirHandle: gl.getUniformLocation(shaderProgram, 'uLightDir'),
            uMITHandle: gl.getUniformLocation(shaderProgram, 'uMITMatrix'),
        },
    };

    return programInfo;
}

function updateLightSwitch() {
    mUseAmbientColor = document.getElementById("ambientLightCheckBox").checked;
    mUseDiffuseColor = document.getElementById("diffuseLightCheckBox").checked;
    mUseSpecularColor = document.getElementById("specularLightCheckBox").checked;
}

function updateAmbientColor() {
    mAmbientColor[0] = document.getElementById("ambient_color_red").value;
    mAmbientColor[1] = document.getElementById("ambient_color_green").value;
    mAmbientColor[2] = document.getElementById("ambient_color_blue").value;
    document.getElementById("label_ambient_red").innerHTML = mAmbientColor[0].toFixed(2);
    document.getElementById("label_ambient_green").innerHTML = mAmbientColor[1].toFixed(2);
    document.getElementById("label_ambient_blue").innerHTML = mAmbientColor[2].toFixed(2);
}

function updateDiffuseColor() {
    mDiffuseColor[0] = document.getElementById("diffuse_color_red").value;
    mDiffuseColor[1] = document.getElementById("diffuse_color_green").value;
    mDiffuseColor[2] = document.getElementById("diffuse_color_blue").value;
    document.getElementById("label_diffuse_red").innerHTML = mDiffuseColor[0].toFixed(2);
    document.getElementById("label_diffuse_green").innerHTML = mDiffuseColor[1].toFixed(2);
    document.getElementById("label_diffuse_blue").innerHTML = mDiffuseColor[2].toFixed(2);
}

function updateSpecularColor() {
    mSpecularColor[0] = document.getElementById("specular_color_red").value;
    mSpecularColor[1] = document.getElementById("specular_color_green").value;
    mSpecularColor[2] = document.getElementById("specular_color_blue").value;
    document.getElementById("label_specular_red").innerHTML = mSpecularColor[0].toFixed(2);
    document.getElementById("label_specular_green").innerHTML = mSpecularColor[1].toFixed(2);
    document.getElementById("label_specular_blue").innerHTML = mSpecularColor[2].toFixed(2);
}

function updateInitQuatHtmlValue() {
    document.getElementById("id_cobra_init_quat").innerHTML = "[" + mCobraInitQuat[0].toFixed(2) + ", " + mCobraInitQuat[1].toFixed(2) + ", " 
        + mCobraInitQuat[2].toFixed(2) + ", " + mCobraInitQuat[3].toFixed(2) + "]";
    document.getElementById("id_cobra_step1_quat").innerHTML = "[" + mCobraStep1Quat[0].toFixed(2) + ", " + mCobraStep1Quat[1].toFixed(2) + ", " 
        + mCobraStep1Quat[2].toFixed(2) + ", " + mCobraStep1Quat[3].toFixed(2) + "]";
    document.getElementById("id_falling_leaf_step1_quat").innerHTML = "[" + mFallingLeaf1Quat[0].toFixed(2) + ", " + mFallingLeaf1Quat[1].toFixed(2) + ", " 
        + mFallingLeaf1Quat[2].toFixed(2) + ", " + mFallingLeaf1Quat[3].toFixed(2) + "]";
    document.getElementById("id_falling_leaf_step2_quat").innerHTML = "[" + mFallingLeaf2Quat[0].toFixed(2) + ", " + mFallingLeaf2Quat[1].toFixed(2) + ", " 
        + mFallingLeaf2Quat[2].toFixed(2) + ", " + mFallingLeaf2Quat[3].toFixed(2) + "]";
    document.getElementById("id_falling_leaf_step3_quat").innerHTML = "[" + mFallingLeaf3Quat[0].toFixed(2) + ", " + mFallingLeaf3Quat[1].toFixed(2) + ", " 
        + mFallingLeaf3Quat[2].toFixed(2) + ", " + mFallingLeaf3Quat[3].toFixed(2) + "]";
    document.getElementById("id_falling_leaf_step4_quat").innerHTML = "[" + mFallingLeaf4Quat[0].toFixed(2) + ", " + mFallingLeaf4Quat[1].toFixed(2) + ", " 
        + mFallingLeaf4Quat[2].toFixed(2) + ", " + mFallingLeaf4Quat[3].toFixed(2) + "]";
    document.getElementById("id_cobra_step2_quat").innerHTML = "[" + mCobraStep2Quat[0].toFixed(2) + ", " + mCobraStep2Quat[1].toFixed(2) + ", " 
        + mCobraStep2Quat[2].toFixed(2) + ", " + mCobraStep2Quat[3].toFixed(2) + "]";
}

function updateAnimQuatHtmlValue() {
    document.getElementById("id_cobra_interpolate_quat").innerHTML = "[" + mCobraAnimInterpolateQuat[0].toFixed(2) + ", " + mCobraAnimInterpolateQuat[1].toFixed(2) + ", " 
        + mCobraAnimInterpolateQuat[2].toFixed(2) + ", " + mCobraAnimInterpolateQuat[3].toFixed(2) + "]";
}

function updateLightShader() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl") || canvas.getContext('experimental-webgl');
    // Vertex shader program
    var vsSource = document.getElementById('id_light_vertex_shader').value;
    // Fragment shader program
    var fsSource = document.getElementById('id_light_fragment_shader').value;

    // Initialize a shader program
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    mLightProgram = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
            normalPosition: gl.getAttribLocation(shaderProgram, 'aNormal'),
        },
        uniformLocations: {
            uProjectionMatrixHandle: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uModelMatrixHandle: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            uViewMatrixHandle: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            uVIHandle: gl.getUniformLocation(shaderProgram, 'uVIMatrix'),
            uMITHandle: gl.getUniformLocation(shaderProgram, 'uMITMatrix'),
            uSpecularHandle: gl.getUniformLocation(shaderProgram, 'uSpecular'),
            uKaHandle: gl.getUniformLocation(shaderProgram, 'uKa'),
            uKdHandle: gl.getUniformLocation(shaderProgram, 'uKd'),
            uKsHandle: gl.getUniformLocation(shaderProgram, 'uKs'),
            uLightDirHandle: gl.getUniformLocation(shaderProgram, 'uLightDir'),
            uTexDiffuseSampler: gl.getUniformLocation(shaderProgram, 'uTexDiffuseSampler'),
            uTexNormalSampler: gl.getUniformLocation(shaderProgram, 'uTexNormalSampler'),
            uUseNormalMapping: gl.getUniformLocation(shaderProgram, 'uUseNormalMapping'),
            uUseAmbient: gl.getUniformLocation(shaderProgram, 'uUseAmbient'),
            uUseDiffuse: gl.getUniformLocation(shaderProgram, 'uUseDiffuse'),
            uUseSpecular: gl.getUniformLocation(shaderProgram, 'uUseSpecular'),
        },
    }
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

function updateViewFrustumPose() {
    if (mEye[0] == mLookAtCenter[0] && mEye[1] == mLookAtCenter[1] && mEye[2] == mLookAtCenter[2]) {
        console.log('updateCameraPos err');
        return ;
    }

    // transform viewing frustum and Set the shader uniforms
    mViewFrustumModelMatrix = mat4.create();
    
    // calc rotate by axis-angle
    // calc pitch or yaw by eyePos or lookAt change
    var lastVector = vec3.fromValues(mLastLookAtX - mLastEyePosX, mLastLookAtY - mLastEyePosY, mLastLookAtZ - mLastEyePosZ);
    var nowVector = vec3.fromValues(mLookAtCenter[0] - mEye[0], mLookAtCenter[1] - mEye[1], mLookAtCenter[2] - mEye[2]);
    var rotAxis = vec3.create();
    vec3.cross(rotAxis, lastVector, nowVector);
    var angle = vec3.angle(lastVector, nowVector);
    if (0 != angle) {
        mat4.translate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, [mEye[0], mEye[1], mEye[2]]);
        mat4.rotate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, angle, [rotAxis[0], rotAxis[1], rotAxis[2]]);
        mat4.translate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, [-mEye[0], -mEye[1], -mEye[2]]);
    }
    // calc roll by cameraUp change
    vec3.cross(rotAxis, mLastCameraUp, mCameraUp);
    angle = vec3.angle(mLastCameraUp, mCameraUp);
    if (0 != angle) {
        mat4.translate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, [mEye[0], mEye[1], mEye[2]]);
        mat4.rotate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, angle, [rotAxis[0], rotAxis[1], rotAxis[2]]);
        mat4.translate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, [-mEye[0], -mEye[1], -mEye[2]]);
        vec3.copy(mLastCameraUp, mCameraUp);
    }

    // calc translate
    mat4.translate(mViewFrustumModelMatrix, mViewFrustumModelMatrix, [mEye[0] - mLastEyePosX, mEye[1] - mLastEyePosY, mEye[2] - mLastEyePosZ]);

    mLastEyePosX = mEye[0];
    mLastEyePosY = mEye[1];
    mLastEyePosZ = mEye[2];
    mLastLookAtX = mLookAtCenter[0];
    mLastLookAtY = mLookAtCenter[1];
    mLastLookAtZ = mLookAtCenter[2];

    mat4.multiply(mViewFrustumMvpMatrix, mViewFrustumMvpMatrix, mViewFrustumModelMatrix);
}

function initAxisBuffers(gl) {
    mAxisVertices = [
        // x-axis
        0.0, 0.0, 0.0, 
        1.0, 0.0, 0.0, 
        // y-axis
        0.0, 0.0, 0.0, 
        0.0, 1.0, 0.0, 
        // z-axis
        0.0, 0.0, 0.0, 
        0.0, 0.0, 1.0, 
    ];
    const axisVerticeColors = [
        // x-axis
        1.0, 0.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0, 
        // y-axis
        0.0, 1.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        // z-axis
        0.0, 0.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
    ];

    /* create buffer */
    // Create a buffer for the viewFrustum's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mAxisVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axisVerticeColors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function initAngleAxisBuffers(gl) {
    mAngleAxisVertices = [
        // angle-axis
        0.0, 0.0, 0.0, 
        1.0, 0.0, 0.0, 
    ];
    const axisVerticeColors = [
        // angle-axis
        0.5, 0.08, 0.9, 1.0,
        0.5, 0.08, 0.9, 1.0, 
    ];

    /* create buffer */
    // Create a buffer for the viewFrustum's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mAngleAxisVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axisVerticeColors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function updateNearPlane() {
    mNearPlaneVertices.splice(0, mNearPlaneVertices.length);  // clear
    // near rect
    mNearPlaneVertices.push(-mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear + EYE_INIT_POS_Z);
    mNearPlaneVertices.push(-mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear + EYE_INIT_POS_Z);
    mNearPlaneVertices.push(mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear + EYE_INIT_POS_Z);

    mNearPlaneVertices.push(-mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear + EYE_INIT_POS_Z);
    mNearPlaneVertices.push(mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear + EYE_INIT_POS_Z);
    mNearPlaneVertices.push(mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear * Math.tan(mHalfFov));
    mNearPlaneVertices.push(-mNear + EYE_INIT_POS_Z);
}

function updateFarPlane() {
    mFarPlaneVertices.splice(0, mFarPlaneVertices.length);  // clear
    // far rect
    mFarPlaneVertices.push(-mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar + EYE_INIT_POS_Z);
    mFarPlaneVertices.push(-mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar + EYE_INIT_POS_Z);
    mFarPlaneVertices.push(mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar + EYE_INIT_POS_Z);

    mFarPlaneVertices.push(-mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar + EYE_INIT_POS_Z);
    mFarPlaneVertices.push(mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar + EYE_INIT_POS_Z);
    mFarPlaneVertices.push(mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar * Math.tan(mHalfFov));
    mFarPlaneVertices.push(-mFar + EYE_INIT_POS_Z);
}

function setNearFarPlaneColor() {
    mNearFarPlaneColors.splice(0, mNearFarPlaneColors.length);  // clear

    const pntColors = [
        [0.5,  0.5,  0.5,  0.7],
        [0.5,  0.5,  0.5,  0.7],
        [0.5,  0.5,  0.5,  0.7],
        [0.5,  0.5,  0.5,  0.7],
        [0.5,  0.5,  0.5,  0.7],
        [0.5,  0.5,  0.5,  0.7],
    ];

    for (var j = 0; j < pntColors.length; ++j) {
        const c = pntColors[j];
    
        // Repeat each color four times for the four vertices of the face
        mNearFarPlaneColors = mNearFarPlaneColors.concat(c);
    }
}

function updateBuffer(gl, vertices, colors) {
    /* create buffer */
    // Create a buffer for the viewFrustum's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function udpateViewFrustum() {
    mViewFrustumVertices.splice(0, mViewFrustumVertices.length);  // clear

    // count near plane coord
    // var eye2lookatAngle = Math.atan(Math.abs(mEye[0] - mLookAtCenter[0]) / Math.abs(mEye[1] - mLookAtCenter[1]));

    // eye to near
    // left top 
    mViewFrustumVertices.push(EYE_INIT_POS_X);
    mViewFrustumVertices.push(EYE_INIT_POS_Y);
    mViewFrustumVertices.push(EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(EYE_INIT_POS_X);
    mViewFrustumVertices.push(EYE_INIT_POS_Y);
    mViewFrustumVertices.push(EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(EYE_INIT_POS_X);
    mViewFrustumVertices.push(EYE_INIT_POS_Y);
    mViewFrustumVertices.push(EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(EYE_INIT_POS_X);
    mViewFrustumVertices.push(EYE_INIT_POS_Y);
    mViewFrustumVertices.push(EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    // near to far 
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);
    // near rect
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mNear + EYE_INIT_POS_Z);
    // far rect
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);

    mViewFrustumVertices.push(mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar * Math.tan(mHalfFov));
    mViewFrustumVertices.push(-mFar + EYE_INIT_POS_Z);
}

function setViewFrustumColor() {
    mViewFrustumVerticeColors.splice(0, mViewFrustumVerticeColors.length);  // clear

    const pntColors = [
        // eye to near 
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        // near to far 
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        // near rect
        [1.0,  0.2,  0.0,  1.0],    
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        [1.0,  0.2,  0.0,  1.0],
        // far rect
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
        [0.0,  1.0,  0.3,  1.0],
    ];

    for (var j = 0; j < pntColors.length; ++j) {
        const c = pntColors[j];
    
        // Repeat each color four times for the four vertices of the face
        mViewFrustumVerticeColors = mViewFrustumVerticeColors.concat(c);
    }
}

function updateViewFrustumBuffer(gl) {
    /* create buffer */
    // Create a buffer for the viewFrustum's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mViewFrustumVertices), gl.DYNAMIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mViewFrustumVerticeColors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function initCylinderBuffers(gl, radius, height, steps, color, offset, dir) {
    var subdivideDegree = TWO_PI / steps;
    var vertices = [];
    var normals = [];
    var colors = [];
    // cylinder tube, triangle_strip
    for (var angle = 0.0; angle < TWO_PI; angle += subdivideDegree) {
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (dir == TubeDir.DIR_X) {
            vertices.push(-height / 2.0 + offset[0]);
            vertices.push(x + offset[1]);
            vertices.push(y + offset[2]);
        } else if (dir == TubeDir.DIR_Z) {
            vertices.push(x + offset[0]);
            vertices.push(y + offset[1]);
            vertices.push(-height / 2.0 + offset[2]);
        } else {
            vertices.push(x + offset[0]);
            vertices.push(-height / 2.0 + offset[1]);
            vertices.push(y + offset[2]);
        }
    }
    for (var angle = 0.0; angle < TWO_PI; angle += subdivideDegree) {
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (dir == TubeDir.DIR_X) {
            vertices.push(height / 2.0 + offset[0]);
            vertices.push(x + offset[1]);
            vertices.push(y + offset[2]);
        } else if (dir == TubeDir.DIR_Z) {
            vertices.push(x + offset[0]);
            vertices.push(y + offset[1]);
            vertices.push(height / 2.0 + offset[2]);
        } else {
            vertices.push(x + offset[0]);
            vertices.push(height / 2.0 + offset[1]);
            vertices.push(y + offset[2]);
        }
    }
    
    if (dir == TubeDir.DIR_X) {
        // top center
        vertices.push(-height / 2.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
        // bottom center
        vertices.push(height / 2.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
    } else if (dir == TubeDir.DIR_Z) {
        // top center
        vertices.push(0.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(-height / 2.0 + offset[2]);
        // bottom center
        vertices.push(0.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(height / 2.0 + offset[2]);
    } else {
        // top center
        vertices.push(0.0 + offset[0]);
        vertices.push(-height / 2.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
        // bottom center
        vertices.push(0.0 + offset[0]);
        vertices.push(height / 2.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
    }

    normals = vertices;

    for (var i = 0; i < vertices.length; i += 3) {
        colors.push(color[0]);
        colors.push(color[1]);
        colors.push(color[2]);
        colors.push(color[3]);
    }

    var indices = new Array(4 * steps * 3);
    for (var i = 0; i < steps; ++i) {
        var i1 = i;
        var i2 = (i1 + 1) % steps;
        var i3 = i1 + steps;
        var i4 = i2 + steps;

        // sides
        indices[i * 6 + 0] = i1;
        indices[i * 6 + 1] = i3;
        indices[i * 6 + 2] = i2;

        indices[i * 6 + 3] = i4;
        indices[i * 6 + 4] = i2;
        indices[i * 6 + 5] = i3;
        // caps
        indices[steps * 6 + i * 6 + 0] = steps * 2 + 0;   // top center
        indices[steps * 6 + i * 6 + 1] = i1;
        indices[steps * 6 + i * 6 + 2] = i2;
        
        indices[steps * 6 + i * 6 + 3] = steps * 2 + 1;   // bottom center
        indices[steps * 6 + i * 6 + 4] = i4;
        indices[steps * 6 + i * 6 + 5] = i3;
    }

    /* create buffer */
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 

    // normal
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // index
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        drawCnt: indices.length,
    };
}

function initTubeBuffers(gl, innerRadius, outerRadius, height, steps, color, dir) {
    var subdivideDegree = TWO_PI / steps;
    var vertices = [];
    var normals = [];
    var colors = [];
    var indices = [];
    // cylinder tube, triangle_strip
    for (var angle = 0.0; angle < TWO_PI; angle += subdivideDegree) {
        var xOuterBottom;
        var yOuterBottom;
        var zOuterBottom;
        var xOuterTop;
        var yOuterTop;
        var zOuterTop;

        var xInnerBottom;
        var yInnerBottom;
        var zInnerBottom;
        var xInnerTop;
        var yInnerTop;
        var zInnerTop;
        if (dir == TubeDir.DIR_X) {
            xOuterBottom = -height / 2.0;
            yOuterBottom = outerRadius * Math.cos(angle);
            zOuterBottom = outerRadius * Math.sin(angle);
            xOuterTop = height / 2.0;
            yOuterTop = outerRadius * Math.cos(angle);
            zOuterTop = outerRadius * Math.sin(angle);

            xInnerBottom = -height / 2.0;
            yInnerBottom = innerRadius * Math.cos(angle);
            zInnerBottom = innerRadius * Math.sin(angle);
            xInnerTop = height / 2.0;
            yInnerTop = innerRadius * Math.cos(angle);
            zInnerTop = innerRadius * Math.sin(angle);
        } else if (dir == TubeDir.DIR_Z) {
            xOuterBottom = outerRadius * Math.cos(angle);
            yOuterBottom = outerRadius * Math.sin(angle);
            zOuterBottom = -height / 2.0;
            xOuterTop = outerRadius * Math.cos(angle);
            yOuterTop = outerRadius * Math.sin(angle);
            zOuterTop = height / 2.0;

            xInnerBottom = innerRadius * Math.cos(angle);
            yInnerBottom = innerRadius * Math.sin(angle);
            zInnerBottom = -height / 2.0;
            xInnerTop = innerRadius * Math.cos(angle);
            yInnerTop = innerRadius * Math.sin(angle);
            zInnerTop = height / 2.0;
        } else {    // default TubeDir.DIR_Y, y axis is the tube's pivot
            xOuterBottom = outerRadius * Math.cos(angle);
            yOuterBottom = -height / 2.0;
            zOuterBottom = outerRadius * Math.sin(angle);
            xOuterTop = outerRadius * Math.cos(angle);
            yOuterTop = height / 2.0;
            zOuterTop = outerRadius * Math.sin(angle);

            xInnerBottom = innerRadius * Math.cos(angle);
            yInnerBottom = -height / 2.0;
            zInnerBottom = innerRadius * Math.sin(angle);
            xInnerTop = innerRadius * Math.cos(angle);
            yInnerTop = height / 2.0;
            zInnerTop = innerRadius * Math.sin(angle);
        }

        vertices.push(xOuterBottom);
        vertices.push(yOuterBottom);
        vertices.push(zOuterBottom);
        vertices.push(xOuterTop);
        vertices.push(yOuterTop);
        vertices.push(zOuterTop);
        vertices.push(xInnerBottom);
        vertices.push(yInnerBottom);
        vertices.push(zInnerBottom);
        vertices.push(xInnerTop);
        vertices.push(yInnerTop);
        vertices.push(zInnerTop);
    }

    // TODO normal
    normals = vertices;
    
    // colors
    for (var i = 0; i < vertices.length; i += 3) {
        colors.push(color[0]);
        colors.push(color[1]);
        colors.push(color[2]);
        colors.push(color[3]);
    }

    // indiceNum = innerSideIndiceNum + outterSideIndiceNum + bottomCapIndiceNum + topCapIndiceNum;
    var indiceNum = (steps * 2 * 3) * 4; 
    var indices = new Array(indiceNum);
    for (var i = 0; i < steps; ++i) {
        var i1 = i * 4;
        var i2 = (i1 + 1) % (steps * 4);
        var i3 = (i1 + 2) % (steps * 4);
        var i4 = (i1 + 3) % (steps * 4);
        var i5 = (i1 + 4) % (steps * 4);
        var i6 = (i1 + 5) % (steps * 4);
        var i7 = (i1 + 6) % (steps * 4);
        var i8 = (i1 + 7) % (steps * 4);

        // outter sides
        indices[i * 24 + 0] = i1;
        indices[i * 24 + 1] = i2;
        indices[i * 24 + 2] = i5;

        indices[i * 24 + 3] = i2;
        indices[i * 24 + 4] = i6;
        indices[i * 24 + 5] = i5;

        // top caps
        indices[i * 24 + 6] = i2;
        indices[i * 24 + 7] = i8;
        indices[i * 24 + 8] = i6;

        indices[i * 24 + 9] = i2;
        indices[i * 24 + 10] = i4;
        indices[i * 24 + 11] = i8;

        // inner sides
        indices[i * 24 + 12] = i4;
        indices[i * 24 + 13] = i3;
        indices[i * 24 + 14] = i8;

        indices[i * 24 + 15] = i3;
        indices[i * 24 + 16] = i7;
        indices[i * 24 + 17] = i8;

        // bottom caps
        indices[i * 24 + 18] = i3;
        indices[i * 24 + 19] = i5;
        indices[i * 24 + 20] = i7;

        indices[i * 24 + 21] = i3;
        indices[i * 24 + 22] = i1;
        indices[i * 24 + 23] = i5;
    }

    /* create buffer */
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 

    // normal
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // index
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        indices: indexBuffer,
        drawCnt: indices.length,
    };
}

function initBackground() {
    const vertexCoords = [
        [-1.0,  -1.0, 1.0],
        [ 1.0,  -1.0, 1.0],
        [-1.0,   1.0, 1.0],
        [ 1.0,   1.0, 1.0],
    ];

    for (var j = 0; j < vertexCoords.length; ++j) {
        const v = vertexCoords[j];
    
        // Repeat each color four times for the four vertices of the face
        mBackgroundVertices = mBackgroundVertices.concat(v);  // merge arrays to one
    }

    const uvCoords = [
        0.0,    0.85, 
        0.125,  0.85, 
        0.0,    0.6, 
        0.125,  0.6
    ];
    mBackgroundUvs.splice(0, mBackgroundUvs.length);  // clear
    for (var i = 0; i < uvCoords.length; i++) {
        mBackgroundUvs.push(uvCoords[i]);
    }
}

function updateBackgroundUv(progress) {
    // mBackgroundUvs.splice(0, mBackgroundUvs.length);  // clear
    for (var i = 0; i < mBackgroundUvs.length; i++) {
        if (i % 2 == 0) {
            mBackgroundUvs[i] += 0.004;
        } else {
            if (progress > 0.5) {
                mBackgroundUvs[i] += 0.0003;
            } else {
                mBackgroundUvs[i] -= 0.0003;
            }
        }
    }
}

function updateBackgroundBuffer(gl) {
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mBackgroundVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mBackgroundUvs), gl.DYNAMIC_DRAW);

    return {
        position: positionBuffer,
        uv: uvBuffer,
        drawCnt: mBackgroundVertices.length / 3,
    };
}

function initObjectBuffers(gl) {
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
    loader.load('./model/Su-27.obj', function(object) {
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
    }, onProgress, onError);
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

function handleMouseDown(event) {
    mMouseDown = true;
    mLastMouseX = event.clientX;
    if (mLastMouseX < mViewportWidth + 230) {   // plus left tab width
        mDragMainView = true;
    } else {
        mDragMainView = false;
    }

    mLastMouseY = event.clientY;
}

function handleMouseUp() {
    mMouseDown = false;
}

function handleMouseOut() {
    mMouseDown = false;
}

function handleMouseMove(event) {
    if (!mMouseDown) {
        return ;
    }
    var deltaX = event.clientX - mLastMouseX;
    var deltaY = event.clientY - mLastMouseY;
    if (mDragMainView) {
        mYawing = deltaX / 100;
        mPitching = deltaY / 100;
    } else {
        mEyePosYawing = deltaX / 100;
        mEyePosPitching = -deltaY / 100;
        updateViewMatrixByMouse();
    }
}

function demoLight() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'flex';
}

function demoCobraManeuvre() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = true;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'flex';
    document.getElementById("id_lightdemo").style.display = 'none';

    // update mEye
    mEye[0] = EYE_INIT_POS_Z;
    mEye[1] = 0;
    mEye[2] = 0;

    // update view matrix
    mat4.lookAt(mViewMatrix, mEye, mLookAtCenter, mCameraUp);
    mat4.copy(mVIMatrix, mViewMatrix);
    mat4.invert(mVIMatrix, mVIMatrix);
    document.getElementById("id_eye_x").value = mEye[0];
    document.getElementById("id_eye_y").value = mEye[1];
    document.getElementById("id_eye_z").value = mEye[2];
    document.getElementById("id_lookat_x").value = mLookAtCenter[0];
    document.getElementById("id_lookat_y").value = mLookAtCenter[1];
    document.getElementById("id_lookat_z").value = mLookAtCenter[2];
    document.getElementById("id_cameraup_x").value = mCameraUp[0];
    document.getElementById("id_cameraup_y").value = mCameraUp[1];
    document.getElementById("id_cameraup_z").value = mCameraUp[2];
    updateViewMatrixHtml();
    updateViewFrustumPose();
}

function demoShader() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'flex';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoMvpMatrix() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = true;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'flex';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoModelMatrix() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'flex';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoViewMatrix() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'flex';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoProjMatrix() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'flex';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoRotateMatrix() {
    mNeedDrawGimbal = true;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'flex';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoAxisAngle() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = true;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'flex';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

function demoQuaternion() {
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'flex';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_lightdemo").style.display = 'none';
}

// Chrome addEventListener onmousewheel
// IE attachEvent onmousewheel
// FireFox addEventListener DOMMouseScroll
function addEvent(obj, xEvent, fn) {
    if (obj.attachEvent) {
        obj.attachEvent('on' + xEvent, fn);
    } else {
        obj.addEventListener(xEvent, fn, false);
    }
}

function main() {
    const canvas = document.querySelector("#glcanvas");
    // Initialize the GL context
    const gl = canvas.getContext("webgl") || canvas.getContext('experimental-webgl');

    // Only continue if WebGL is available and working
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    // init light value
    updateLightSwitch();
    updateAmbientColor();
    updateDiffuseColor();
    updateSpecularColor();

    // initialize anim params
    mCobraStep1Quat = quat.fromEuler(mCobraStep1Quat, 120, 0, 30);
    mFallingLeaf1Quat = quat.fromEuler(mFallingLeaf1Quat, 100, -20, 90);
    mFallingLeaf2Quat = quat.fromEuler(mFallingLeaf2Quat, 80, -40, 180);
    mFallingLeaf3Quat = quat.fromEuler(mFallingLeaf3Quat, 60, -20, 270);
    mFallingLeaf4Quat = quat.fromEuler(mFallingLeaf4Quat, 40, 0, 360);
    mCobraStep2Quat = quat.fromEuler(mCobraStep2Quat, 0, 0, 0);
    updateInitQuatHtmlValue();

    // mouse
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;
    canvas.onmouseout = handleMouseOut;
    // mouse wheel

    mViewportWidth = canvas.clientWidth / 2;
    mViewportHeight = canvas.clientHeight;

    // create view matrix
    mEye = vec3.fromValues(mLastEyePosX, mLastEyePosY, mLastEyePosZ);
    mLookAtCenter = vec3.fromValues(mLastLookAtX, mLastLookAtY, mLastLookAtZ);
    mCameraUp = vec3.fromValues(0.0, 1.0, 0.0);
    vec3.copy(mLastCameraUp, mCameraUp);
    mViewMatrix = mat4.create();
    mat4.lookAt(mViewMatrix, mEye, mLookAtCenter, mCameraUp);
    mat4.copy(mVIMatrix, mViewMatrix);
    mat4.invert(mVIMatrix, mVIMatrix);
    updateViewMatrixHtml();

    // Create a perspective matrix
    mAspect = mViewportWidth / mViewportHeight; // gl.canvas.clientWidth / gl.canvas.clientHeight;

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mProjectionMatrix = mat4.create();
    mat4.perspective(mProjectionMatrix, 2 * mHalfFov, mAspect, mNear, mFar);
    updateProjMatrixHtml();
    // ortho
    // mat4.ortho(mProjectionMatrix, -mAspect, mAspect, -1, 1, mNear, mFar);

    // god view matrix
    mGodViewMatrix = mat4.create();
    mat4.lookAt(mGodViewMatrix, vec3.fromValues(12.0, 12.0, 12.0), mLookAtCenter, mCameraUp);
    mat4.copy(mGodVIMatrix, mGodViewMatrix);
    mat4.invert(mGodVIMatrix, mGodVIMatrix);
    mGodProjectionMatrix = mat4.create();
    mat4.perspective(mGodProjectionMatrix, HALF_FOV, mAspect, GOD_FRUSTOM_NEAR, GOD_FRUSTOM_FAR);
    mat4.multiply(mGodMvpMatrix, mGodProjectionMatrix, mGodViewMatrix);
    mat4.copy(mViewFrustumMvpMatrix, mGodMvpMatrix);

    // init shader
    updateBackgroundShader();
    updateLightShader();
    const basicProgram = initBasicShader(gl);
    const diffuseLightingProgram = initDiffuseLightingShader(gl);

    // Here's where we call the routine that builds all the objects we'll be drawing.
    initObjectBuffers(gl);
    // texture
    mObjectDiffuseTexture = loadTexture(gl, './texture/Su-27_diffuse.png');
    mObjectNormalTexture = loadTexture(gl, './texture/Su-27_normal.png');
    mBackgroundTexture = loadTexture(gl, './texture/bg_sky.jpg');
    
    udpateViewFrustum();
    setViewFrustumColor();
    updateNearPlane();
    updateFarPlane();
    setNearFarPlaneColor();
    mAxisBuffer = initAxisBuffers(gl);
    mAngleAxisBuffer = initAngleAxisBuffers(gl);
    mAssistObjectBuffer = initCylinderBuffers(gl, 0.05, 0.5, 10, vec4.fromValues(1.0, 0.0, 0.0, 1.0), mAssistCoord, TubeDir.DIR_Z);
    // mPivotBuffer = initCylinderBuffers(gl, 0.05, 2.4, 10, vec4.fromValues(1.0, 1.0, 0.0, 1.0), vec3.fromValues(0.0, 0.0, 0.0), TubeDir.DIR_Y);
    // mGimbalZPivot1Buffer = initCylinderBuffers(gl, 0.05, 0.2, 10, vec4.fromValues(0.0, 0.0, 1.0, 1.0), vec3.fromValues(1.5, 0.0, 0.0), TubeDir.DIR_X);
    // mGimbalZPivot2Buffer = initCylinderBuffers(gl, 0.05, 0.2, 10, vec4.fromValues(0.0, 0.0, 1.0, 1.0), vec3.fromValues(-1.5, 0.0, 0.0), TubeDir.DIR_X);
    // mGimbalXPivot1Buffer = initCylinderBuffers(gl, 0.05, 0.2, 10, vec4.fromValues(1.0, 0.0, 0.0, 1.0), vec3.fromValues(0.0, 0.0, 1.3), TubeDir.DIR_Z);
    // mGimbalXPivot2Buffer = initCylinderBuffers(gl, 0.05, 0.2, 10, vec4.fromValues(1.0, 0.0, 0.0, 1.0), vec3.fromValues(0.0, 0.0, -1.3), TubeDir.DIR_Z);
    mGimbalXBuffer = initTubeBuffers(gl, 1.2 ,1.3, 0.1, 30, vec4.fromValues(1.0, 0.0, 0.0, 1.0), TubeDir.DIR_X);
    mGimbalYBuffer = initTubeBuffers(gl, 1.4 ,1.5, 0.1, 30, vec4.fromValues(0.0, 1.0, 0.0, 1.0), TubeDir.DIR_Y);
    mGimbalZBuffer = initTubeBuffers(gl, 1.6 ,1.7, 0.1, 30, vec4.fromValues(0.0, 0.0, 1.0, 1.0), TubeDir.DIR_Z);

    // background
    initBackground();
    mBackgroundBuffer = updateBackgroundBuffer(gl);

    var then = 0;
    var oneSecThen = 0;
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;
        // draw scene
        drawScene(gl, basicProgram, diffuseLightingProgram, deltaTime);

        if (now - oneSecThen > 1) {
            oneSecThen = now;
            // update fps
            document.getElementById("FPS").innerHTML = 'FPS: ' + (1.0 / deltaTime).toFixed(2);
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url) {
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
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);
  
    const image = new Image();
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);
  
      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         // Yes, it's a power of 2. Generate mips.
         gl.generateMipmap(gl.TEXTURE_2D);
      } else {
         // No, it's not a power of 2. Turn of mips and set
         // wrapping to clamp to edge
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    };
    image.src = url;
  
    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function drawBackground(gl, backgroundProgram, buffers, texture, drawCount, deltaTime) {
    // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            backgroundProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            backgroundProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the texture coordinates from the texture coordinate buffer into the textureCoord attribute.
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
        gl.vertexAttribPointer(
            backgroundProgram.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            backgroundProgram.attribLocations.textureCoord);
    }

    // Tell WebGL to use our backgroundProgram when drawing
    gl.useProgram(backgroundProgram.program);

    // Specify the texture to map onto the faces.
    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the diffuseTexture to diffuseTexture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Tell the shader we bound the diffuseTexture to diffuseTexture unit 0
    gl.uniform1i(backgroundProgram.uniformLocations.uTexSamplerHandle, 0);

    const drawOffset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, drawOffset, drawCount);
}

function drawArrays(gl, basicProgram, buffers, vertexCount, mvpMatrix, drawType, deltaTime) {
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
            basicProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(basicProgram.program);
    gl.uniformMatrix4fv(basicProgram.uniformLocations.uMVPMatrixHandle, false, mvpMatrix);

    const drawOffset = 0;
    gl.drawArrays(drawType, drawOffset, vertexCount);
}

function drawElements(gl, basicProgram, buffers, vertexCount, mvpMatrix, drawType, deltaTime) {
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
            basicProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the normals from the normal
    // buffer into the normalPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.normalPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.normalPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexColor);
    }

    // Tell WebGL which indices to use to index the vertices
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(basicProgram.program);
    gl.uniformMatrix4fv(basicProgram.uniformLocations.uMVPMatrixHandle, false, mvpMatrix);

    const drawOffset = 0;
    const dataType = gl.UNSIGNED_SHORT;
    gl.drawElements(drawType, vertexCount, dataType, drawOffset);
}

function drawGimbalElements(gl, diffuseLightingProgram, buffers, vertexCount, mvpMatrix, drawType, deltaTime, isGodView, needPitch, needYaw, needRoll) {
    // transform
    mGimbalModelMatrix = mat4.create();
    mat4.translate(mGimbalModelMatrix,     // destination matrix
                mGimbalModelMatrix,     // matrix to translate
                [mTranslateX, mTranslateY, mTranslateZ]);  // amount to translate

    if (needRoll) {
        mat4.rotate(mGimbalModelMatrix,  // destination matrix
                    mGimbalModelMatrix,  // matrix to rotate
                    mRolling,               // amount to rotate in radians
                    [0, 0, 1]);        // axis to rotate around
    }
    if (needYaw) {
        mat4.rotate(mGimbalModelMatrix,  // destination matrix
                    mGimbalModelMatrix,  // matrix to rotate
                    mYawing,           // amount to rotate in radians
                    [0, 1, 0]);        // axis to rotate around
    }
    if (needPitch) {
        mat4.rotate(mGimbalModelMatrix,  // destination matrix
                    mGimbalModelMatrix,  // matrix to rotate
                    mPitching,               // amount to rotate in radians
                    [1, 0, 0]);        // axis to rotate around
    }

    if (isGodView) {
        mat4.multiply(mvpMatrix, mGodViewMatrix, mGimbalModelMatrix);
        mat4.multiply(mvpMatrix, mGodProjectionMatrix, mvpMatrix);
    } else {
        mat4.multiply(mvpMatrix, mViewMatrix, mGimbalModelMatrix);
        mat4.multiply(mvpMatrix, mProjectionMatrix, mvpMatrix);
    }

    mat4.copy(mGimbalMITMatrix, mGimbalModelMatrix);
    mat4.invert(mGimbalMITMatrix, mGimbalMITMatrix);
    mat4.transpose(mGimbalMITMatrix, mGimbalMITMatrix);

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
            diffuseLightingProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            diffuseLightingProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the normals from the normal
    // buffer into the normalPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            diffuseLightingProgram.attribLocations.normalPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            diffuseLightingProgram.attribLocations.normalPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            diffuseLightingProgram.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            diffuseLightingProgram.attribLocations.vertexColor);
    }

    // Tell WebGL which indices to use to index the vertices
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(diffuseLightingProgram.program);
    gl.uniformMatrix4fv(diffuseLightingProgram.uniformLocations.uMVPMatrixHandle, false, mvpMatrix);
    gl.uniformMatrix4fv(diffuseLightingProgram.uniformLocations.uMITHandle, false, mGimbalMITMatrix);
    if (mUseAmbientColor) {
        gl.uniform4fv(diffuseLightingProgram.uniformLocations.uKaHandle, mAmbientColor);
    }
    if (mUseDiffuseColor) {
        gl.uniform4fv(diffuseLightingProgram.uniformLocations.uKdHandle, mDiffuseColor);
    }
    gl.uniform3fv(diffuseLightingProgram.uniformLocations.uLightDirHandle, LIGHT_POSITION);

    const drawOffset = 0;
    const dataType = gl.UNSIGNED_SHORT;
    gl.drawElements(drawType, vertexCount, dataType, drawOffset);
}

function calcSquareProgress(progress) {
    return progress * progress;
}

function drawObject(gl, lightingProgram, buffers, diffuseTexture, normalTexture, drawCount, deltaTime, isGodView) {
    // Set the drawing position to the "identity" point, which is the center of the scene.
    mModelMatrix = mat4.create();
    mat4.translate(mModelMatrix,     // destination matrix
                mModelMatrix,     // matrix to translate
                [mTranslateX, mTranslateY + mCobraYOffset, mTranslateZ - mCobraZOffset]);  // amount to translate

    if (mNeedDrawCobraAnim) {
        var progress = 0.0;
        if (mCobraAnimFrameEllapse <= COBRA_STEP1_FRAME_CNT) {
            progress = mCobraAnimFrameEllapse / COBRA_STEP1_FRAME_CNT;
            progress = calcSquareProgress(progress);
            mCobraAnimInterpolateQuat = quat.slerp(mCobraAnimInterpolateQuat, mCobraInitQuat, mCobraStep1Quat, progress);
        } else if ((mCobraAnimFrameEllapse > COBRA_STEP1_FRAME_CNT) && (mCobraAnimFrameEllapse <= (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT))) {
            progress = (mCobraAnimFrameEllapse - COBRA_STEP1_FRAME_CNT) / FALLING_LEAF1_FRAME_CNT;
            mCobraAnimInterpolateQuat = quat.slerp(mCobraAnimInterpolateQuat, mCobraStep1Quat, mFallingLeaf1Quat, progress);
        } else if ((mCobraAnimFrameEllapse > (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT)) 
            && (mCobraAnimFrameEllapse <= (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT))) {
                progress = (mCobraAnimFrameEllapse - COBRA_STEP1_FRAME_CNT - FALLING_LEAF1_FRAME_CNT) / FALLING_LEAF2_FRAME_CNT;
                mCobraAnimInterpolateQuat = quat.slerp(mCobraAnimInterpolateQuat, mFallingLeaf1Quat, mFallingLeaf2Quat, progress);
        } else if ((mCobraAnimFrameEllapse > (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT)) 
            && (mCobraAnimFrameEllapse <= (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT + FALLING_LEAF3_FRAME_CNT))) {
                progress = (mCobraAnimFrameEllapse - COBRA_STEP1_FRAME_CNT - FALLING_LEAF1_FRAME_CNT - FALLING_LEAF2_FRAME_CNT) / FALLING_LEAF3_FRAME_CNT;
                mCobraAnimInterpolateQuat = quat.slerp(mCobraAnimInterpolateQuat, mFallingLeaf2Quat, mFallingLeaf3Quat, progress);
        } else if ((mCobraAnimFrameEllapse > (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT + FALLING_LEAF3_FRAME_CNT)) 
            && (mCobraAnimFrameEllapse <= (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT + FALLING_LEAF3_FRAME_CNT + FALLING_LEAF4_FRAME_CNT))) {
                progress = (mCobraAnimFrameEllapse - COBRA_STEP1_FRAME_CNT - FALLING_LEAF1_FRAME_CNT - FALLING_LEAF2_FRAME_CNT - FALLING_LEAF3_FRAME_CNT) / FALLING_LEAF4_FRAME_CNT;
                mCobraAnimInterpolateQuat = quat.slerp(mCobraAnimInterpolateQuat, mFallingLeaf3Quat, mFallingLeaf4Quat, progress);
        } else if ((mCobraAnimFrameEllapse > (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT + FALLING_LEAF3_FRAME_CNT + FALLING_LEAF4_FRAME_CNT)) 
            && (mCobraAnimFrameEllapse <= (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT + FALLING_LEAF3_FRAME_CNT + FALLING_LEAF4_FRAME_CNT + COBRA_STEP2_FRAME_CNT))) {
                progress = (mCobraAnimFrameEllapse - COBRA_STEP1_FRAME_CNT - FALLING_LEAF1_FRAME_CNT - FALLING_LEAF2_FRAME_CNT - FALLING_LEAF3_FRAME_CNT - FALLING_LEAF4_FRAME_CNT) / COBRA_STEP2_FRAME_CNT;
                mCobraAnimInterpolateQuat = quat.slerp(mCobraAnimInterpolateQuat, mFallingLeaf4Quat, mCobraStep2Quat, progress);
        } else {
            mCobraAnimFrameEllapse = 0;
        }

        // 0 ~ 1
        var animProgress = mCobraAnimFrameEllapse / (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT 
            + FALLING_LEAF3_FRAME_CNT + FALLING_LEAF4_FRAME_CNT + COBRA_STEP2_FRAME_CNT);
        var offsetProgress = (0.5 - Math.abs(animProgress - 0.5)) * 2.0;  // 0 ~ 1 ~ 0
        mCobraYOffset = COBRA_Y_OFFSET * offsetProgress;
        mCobraZOffset = COBRA_Z_OFFSET * offsetProgress;

        mat4.fromQuat(mCobraAnimRotateMatrix, mCobraAnimInterpolateQuat);
        mat4.multiply(mModelMatrix, mModelMatrix, mCobraAnimRotateMatrix);
    } else {
        mat4.rotate(mModelMatrix,  // destination matrix
                    mModelMatrix,  // matrix to rotate
                    mRolling,               // amount to rotate in radians
                    [0, 0, 1]);        // axis to rotate around
        mat4.rotate(mModelMatrix,  // destination matrix
                    mModelMatrix,  // matrix to rotate
                    mYawing,           // amount to rotate in radians
                    [0, 1, 0]);        // axis to rotate around
        mat4.rotate(mModelMatrix,  // destination matrix
                    mModelMatrix,  // matrix to rotate
                    mPitching,               // amount to rotate in radians
                    [1, 0, 0]);        // axis to rotate around
        
        // use axis-angle to rotate
        mat4.rotate(mModelMatrix, mModelMatrix, mRotAngle, mRotAxis);
    }

    // // use quaternion to rotate
    // mQuatRatateMatrix = mat4.create();
    // mat4.fromQuat(mQuatRatateMatrix, mQuaternion);
    // mat4.multiply(mModelMatrix, mModelMatrix, mQuatRatateMatrix);

    mat4.scale(mModelMatrix, mModelMatrix, [mScaleX, mScaleY, mScaleZ]);

    mat4.copy(mMITMatrix, mModelMatrix);
    mat4.invert(mMITMatrix, mMITMatrix);
    mat4.transpose(mMITMatrix, mMITMatrix);

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
            lightingProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            lightingProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the normals from the normal
    // buffer into the normal attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            lightingProgram.attribLocations.normalPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            lightingProgram.attribLocations.normalPosition);
    }

    // Tell WebGL how to pull out the texture coordinates from
    // the texture coordinate buffer into the textureCoord attribute.
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
        gl.vertexAttribPointer(
            lightingProgram.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            lightingProgram.attribLocations.textureCoord);
    }

    // Tell WebGL which indices to use to index the vertices
    {
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    }

    // Tell WebGL to use our lightingProgram when drawing
    gl.useProgram(lightingProgram.program);

    // Specify the diffuseTexture to map onto the faces.
    // Tell WebGL we want to affect diffuseTexture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the diffuseTexture to diffuseTexture unit 0
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    // Tell the shader we bound the diffuseTexture to diffuseTexture unit 0
    gl.uniform1i(lightingProgram.uniformLocations.uTexDiffuseSampler, 0);

    // Tell the shader use normal mapping
    if (null != normalTexture) {
        gl.activeTexture(gl.TEXTURE1);
        // Bind the diffuseTexture to diffuseTexture unit 0
        gl.bindTexture(gl.TEXTURE_2D, normalTexture);
        gl.uniform1i(lightingProgram.uniformLocations.uUseNormalMapping, 1);
        gl.uniform1i(lightingProgram.uniformLocations.uTexNormalSampler, 1);
    }

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        lightingProgram.uniformLocations.uModelMatrixHandle,
        false, mModelMatrix);
    gl.uniformMatrix4fv(lightingProgram.uniformLocations.uMITHandle, false, mMITMatrix);

    if (isGodView) {
        gl.uniformMatrix4fv(lightingProgram.uniformLocations.uProjectionMatrixHandle, false, mGodProjectionMatrix);
        gl.uniformMatrix4fv(lightingProgram.uniformLocations.uViewMatrixHandle, false, mGodViewMatrix);
        gl.uniformMatrix4fv(lightingProgram.uniformLocations.uVIHandle, false, mGodVIMatrix); 
    } else {
        gl.uniformMatrix4fv(
            lightingProgram.uniformLocations.uProjectionMatrixHandle,
            false, mProjectionMatrix);
        gl.uniformMatrix4fv(
            lightingProgram.uniformLocations.uViewMatrixHandle,
            false, mViewMatrix);
        gl.uniformMatrix4fv(lightingProgram.uniformLocations.uVIHandle, false, mVIMatrix); 
    }

    gl.uniform1f(lightingProgram.uniformLocations.uSpecularHandle, SPECULAR_VALUE);
    if (mUseAmbientColor) {
        gl.uniform1i(lightingProgram.uniformLocations.uUseAmbient, 1);
        gl.uniform4fv(lightingProgram.uniformLocations.uKaHandle, mAmbientColor);
    } else {
        gl.uniform1i(lightingProgram.uniformLocations.uUseAmbient, 0);
    }
    if (mUseDiffuseColor) {
        gl.uniform1i(lightingProgram.uniformLocations.uUseDiffuse, 1);
        gl.uniform4fv(lightingProgram.uniformLocations.uKdHandle, mDiffuseColor);
    } else {
        gl.uniform1i(lightingProgram.uniformLocations.uUseDiffuse, 0);
    }
    if (mUseSpecularColor) {
        gl.uniform1i(lightingProgram.uniformLocations.uUseSpecular, 1);
        gl.uniform4fv(lightingProgram.uniformLocations.uKsHandle, mSpecularColor);
    } else {
        gl.uniform1i(lightingProgram.uniformLocations.uUseSpecular, 0);
    }
    gl.uniform3fv(lightingProgram.uniformLocations.uLightDirHandle, LIGHT_POSITION);

    const drawOffset = 0;
    // const vertexCount = mIndices.length;
    const drawType = gl.UNSIGNED_SHORT;
    // gl.drawElements(gl.TRIANGLES, vertexCount, drawType, drawOffset);
    gl.drawArrays(gl.TRIANGLES, drawOffset, drawCount);
}

function drawScene(gl, basicProgram, diffuseLightingProgram, deltaTime) {
    mTimeEllapse += deltaTime;

    mViewFrustumBuffer = updateViewFrustumBuffer(gl);
    mNearBuffer = updateBuffer(gl, mNearPlaneVertices, mNearFarPlaneColors);
    mFarBuffer = updateBuffer(gl, mFarPlaneVertices, mNearFarPlaneColors);

    gl.clearColor(0.9, 0.9, 0.9, 1.0);  // Clear to white, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // compute rotate matrix
    mRotateZMatrix = mat4.create();
    mRotateYMatrix = mat4.create();
    mRotateXMatrix = mat4.create();
    mRotateMatrix = mat4.create();
    // ZYX order
    mat4.rotate(mRotateZMatrix, mRotateZMatrix, mRolling, [0, 0, 1]);
    mat4.rotate(mRotateYMatrix, mRotateYMatrix, mYawing, [0, 1, 0]);
    mat4.rotate(mRotateXMatrix, mRotateXMatrix, mPitching, [1, 0, 0]);
    mat4.rotate(mRotateMatrix, mRotateMatrix, mRolling, [0, 0, 1]);
    mat4.rotate(mRotateMatrix, mRotateMatrix, mYawing, [0, 1, 0]);
    mat4.rotate(mRotateMatrix, mRotateMatrix, mPitching, [1, 0, 0]);
    mat4.rotate(mRotateMatrix, mRotateMatrix, mRotAngle, mRotAxis);
    // quat
    // mat4.multiply(mRotateMatrix, mRotateMatrix, mQuatRatateMatrix);
    mat4.getRotation(mQuaternion, mRotateMatrix);
    updateHtmlRotateMatrixByRender();

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, mViewportWidth, mViewportHeight);

    // draw background
    if (mNeedDrawCobraAnim) {
        var animProgress = mCobraAnimFrameEllapse / (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT 
            + FALLING_LEAF3_FRAME_CNT + FALLING_LEAF4_FRAME_CNT + COBRA_STEP2_FRAME_CNT);
        updateBackgroundUv(animProgress);
        mBackgroundBuffer = updateBackgroundBuffer(gl);
    }
    drawBackground(gl, mBackgroundProgram, mBackgroundBuffer, mBackgroundTexture, mBackgroundBuffer.drawCnt, deltaTime);

    if (mObjectBuffer.length > 0) {
        for (var i = 0; i < mObjectBuffer.length; i++) {
            drawObject(gl, mLightProgram, mObjectBuffer[i], mObjectDiffuseTexture, mObjectNormalTexture, mObjectBuffer[i].drawCnt, deltaTime, false);
        }
    }
    updateAnimQuatHtmlValue();
    mCobraAnimFrameEllapse++;

    // draw assist object use 
    mMvpMatrix = mat4.create();
    mat4.multiply(mMvpMatrix, mModelMatrix, mMvpMatrix);
    mat4.multiply(mMvpMatrix, mViewMatrix, mMvpMatrix);
    mat4.multiply(mMvpMatrix, mProjectionMatrix, mMvpMatrix);
    if (mNeedDrawAssistObject && null != mAssistObjectBuffer) {
        vec4.transformMat4(mAssistMvpCoord, mAssistCoord, mMvpMatrix);
        if (0 != mAssistMvpCoord[3]) {
            mAssistMvpHomogCoord[0] = mAssistMvpCoord[0] / mAssistMvpCoord[3];
            mAssistMvpHomogCoord[1] = mAssistMvpCoord[1] / mAssistMvpCoord[3];
            mAssistMvpHomogCoord[2] = mAssistMvpCoord[2] / mAssistMvpCoord[3];
            mAssistMvpHomogCoord[3] = 1.00;
        } else {
            vec4.copy(mAssistMvpHomogCoord, mAssistMvpCoord);
        }

        // update screen coord
        // gl.glGetIntegerv(gl.GL_VIEWPORT, mCurrentViewport, 0);
        // mAssistScreenCoord[0] = mCurrentViewport[0] + (1 + mAssistMvpHomogCoord[0]) * mCurrentViewport[2] / 2;
        // mAssistScreenCoord[1] = mCurrentViewport[1] + (1 + mAssistMvpHomogCoord[1]) * mCurrentViewport[3] / 2;
        mAssistScreenCoord[0] = 0 + (1 + mAssistMvpHomogCoord[0]) * mViewportWidth / 2;
        mAssistScreenCoord[1] = 0 + (1 + mAssistMvpHomogCoord[1]) * mViewportHeight / 2;
        mAssistScreenCoord[2] = (1 + mAssistMvpHomogCoord[2]) / 2;
        mAssistScreenCoord[3] = 1.0;

        drawElements(gl, basicProgram, mAssistObjectBuffer, mAssistObjectBuffer.drawCnt, mMvpMatrix, gl.TRIANGLE_STRIP, deltaTime);
    }

    // if (mNeedDrawGimbal && null != mPivotBuffer) {
    //     drawGimbalElements(gl, diffuseLightingProgram, mPivotBuffer, mPivotBuffer.drawCnt, mGimbalMvpMatrix, gl.TRIANGLE_STRIP, deltaTime, false, true, true, true);
    // }
    if (mNeedDrawGimbal && null != mGimbalXBuffer && null != mGimbalYBuffer && null != mGimbalZBuffer) {
        drawGimbalElements(gl, diffuseLightingProgram, mGimbalXBuffer, mGimbalXBuffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, true, true, true);
        drawGimbalElements(gl, diffuseLightingProgram, mGimbalYBuffer, mGimbalYBuffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, false, true, true);
        drawGimbalElements(gl, diffuseLightingProgram, mGimbalZBuffer, mGimbalZBuffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, false, false, true);
    }
    // if (mNeedDrawGimbal && null != mGimbalZPivot1Buffer && null != mGimbalZPivot2Buffer) {
    //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalZPivot1Buffer, mGimbalZPivot1Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, false, true, true);
    //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalZPivot2Buffer, mGimbalZPivot2Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, false, true, true);
    // }
    // if (mNeedDrawGimbal && null != mGimbalXPivot1Buffer && null != mGimbalXPivot2Buffer) {
    //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalXPivot1Buffer, mGimbalXPivot1Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, true, true, true);
    //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalXPivot2Buffer, mGimbalXPivot2Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, false, true, true, true);
    // }
    if (mNeedDrawAngleAxis && null != mAngleAxisBuffer) {
        mAngleAxisMVPMatrix = mat4.create();
        var angle = vec3.angle(X_AXIS, mRotAxis);
        var rotAxis = vec3.create();
        vec3.cross(rotAxis, X_AXIS, mRotAxis);
        mat4.rotate(mAngleAxisMVPMatrix, mAngleAxisMVPMatrix, angle, rotAxis);
        mat4.multiply(mAngleAxisMVPMatrix, mViewMatrix, mAngleAxisMVPMatrix);
        mat4.multiply(mAngleAxisMVPMatrix, mProjectionMatrix, mAngleAxisMVPMatrix);

        drawArrays(gl, basicProgram, mAngleAxisBuffer, mAngleAxisVertices.length / 3, mAngleAxisMVPMatrix, gl.LINES, deltaTime);
    }

    /* draw another screen */
    gl.viewport(mViewportWidth, 0, mViewportWidth, mViewportHeight);
    if (mObjectBuffer.length > 0 && null != mViewFrustumBuffer) {
        for (var i = 0; i < mObjectBuffer.length; i++) {
            drawObject(gl, mLightProgram, mObjectBuffer[i], mObjectDiffuseTexture, mObjectNormalTexture, mObjectBuffer[i].drawCnt, deltaTime, true);
        }
        drawArrays(gl, basicProgram, mAxisBuffer, mAxisVertices.length / 3, mGodMvpMatrix, gl.LINES, deltaTime);
        drawArrays(gl, basicProgram, mViewFrustumBuffer, mViewFrustumVertices.length / 3, mViewFrustumMvpMatrix, gl.LINES, deltaTime);
        if (null != mNearBuffer) {
            drawArrays(gl, basicProgram, mNearBuffer, mNearPlaneVertices.length / 3, mViewFrustumMvpMatrix, gl.TRIANGLES, deltaTime);
        }
        if (null != mFarBuffer) {
            drawArrays(gl, basicProgram, mFarBuffer, mFarPlaneVertices.length / 3, mViewFrustumMvpMatrix, gl.TRIANGLES, deltaTime);
        }

        // if (mNeedDrawAssistObject && null != mAssistObjectBuffer) {  // TODO change mvp
        //     drawElements(gl, basicProgram, mAssistObjectBuffer, mAssistObjectBuffer.drawCnt, mMvpMatrix, gl.TRIANGLE_STRIP, deltaTime);
        // }

        // if (mNeedDrawGimbal && null != mPivotBuffer) {
        //     drawGimbalElements(gl, diffuseLightingProgram, mPivotBuffer, mPivotBuffer.drawCnt, mGimbalMvpMatrix, gl.TRIANGLE_STRIP, deltaTime, true, true, true, true);
        // }
        if (mNeedDrawGimbal && null != mGimbalXBuffer && null != mGimbalYBuffer && null != mGimbalZBuffer) {
            drawGimbalElements(gl, diffuseLightingProgram, mGimbalXBuffer, mGimbalXBuffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, true, true, true);
            drawGimbalElements(gl, diffuseLightingProgram, mGimbalYBuffer, mGimbalYBuffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, false, true, true);
            drawGimbalElements(gl, diffuseLightingProgram, mGimbalZBuffer, mGimbalZBuffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, false, false, true);
        }
        // if (mNeedDrawGimbal && null != mGimbalZPivot1Buffer && null != mGimbalZPivot2Buffer) {
        //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalZPivot1Buffer, mGimbalZPivot1Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, false, true, true);
        //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalZPivot2Buffer, mGimbalZPivot2Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, false, true, true);
        // }
        // if (mNeedDrawGimbal && null != mGimbalXPivot1Buffer && null != mGimbalXPivot2Buffer) {
        //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalXPivot1Buffer, mGimbalXPivot1Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, true, true, true);
        //     drawGimbalElements(gl, diffuseLightingProgram, mGimbalXPivot2Buffer, mGimbalXPivot2Buffer.drawCnt, mGimbalModelMatrix, gl.TRIANGLE_STRIP, deltaTime, true, true, true, true);
        // }
    }

    updateHtmlParamByRender();
}

function updateModelMatrixByInput() {
    mTranslateX = document.getElementById("id_m03").value;
    mTranslateY = document.getElementById("id_m13").value;
    mTranslateZ = document.getElementById("id_m23").value;
}

function updateEulerAngleByInput() {
    mPitching = document.getElementById("id_pitch").value * DEGREE_TO_RADIUS;
    mYawing = document.getElementById("id_yaw").value * DEGREE_TO_RADIUS;
    mRolling = document.getElementById("id_roll").value * DEGREE_TO_RADIUS;
}

function updateEulerAngleByInputEular() {
    mPitching = document.getElementById("id_pitch_eular").value * DEGREE_TO_RADIUS;
    mYawing = document.getElementById("id_yaw_eular").value * DEGREE_TO_RADIUS;
    mRolling = document.getElementById("id_roll_eular").value * DEGREE_TO_RADIUS;
}

function updateTranslateByInput() {
    mTranslateX = document.getElementById("id_translate_x").value;
    mTranslateY = document.getElementById("id_translate_y").value;
    mTranslateZ = document.getElementById("id_translate_z").value;
}

function updateScaleByInput() {
    mScaleX = document.getElementById("id_scale_x").value;
    mScaleY = document.getElementById("id_scale_y").value;
    mScaleZ = document.getElementById("id_scale_z").value;
}

function updateHtmlParamByRender() {
    document.getElementById("id_m00").value = mModelMatrix[0].toFixed(2);
    document.getElementById("id_m01").value = mModelMatrix[4].toFixed(2);
    document.getElementById("id_m02").value = mModelMatrix[8].toFixed(2);
    document.getElementById("id_m03").value = mModelMatrix[12].toFixed(2);
    document.getElementById("id_m10").value = mModelMatrix[1].toFixed(2);
    document.getElementById("id_m11").value = mModelMatrix[5].toFixed(2);
    document.getElementById("id_m12").value = mModelMatrix[9].toFixed(2);
    document.getElementById("id_m13").value = mModelMatrix[13].toFixed(2);
    document.getElementById("id_m20").value = mModelMatrix[2].toFixed(2);
    document.getElementById("id_m21").value = mModelMatrix[6].toFixed(2);
    document.getElementById("id_m22").value = mModelMatrix[10].toFixed(2);
    document.getElementById("id_m23").value = mModelMatrix[14].toFixed(2);
    document.getElementById("id_m30").value = mModelMatrix[3].toFixed(2);
    document.getElementById("id_m31").value = mModelMatrix[7].toFixed(2);
    document.getElementById("id_m32").value = mModelMatrix[11].toFixed(2);
    document.getElementById("id_m33").value = mModelMatrix[15].toFixed(2);

    document.getElementById("id_mvp_model_m00").innerHTML = mModelMatrix[0].toFixed(2);
    document.getElementById("id_mvp_model_m01").innerHTML = mModelMatrix[4].toFixed(2);
    document.getElementById("id_mvp_model_m02").innerHTML = mModelMatrix[8].toFixed(2);
    document.getElementById("id_mvp_model_m03").innerHTML = mModelMatrix[12].toFixed(2);
    document.getElementById("id_mvp_model_m10").innerHTML = mModelMatrix[1].toFixed(2);
    document.getElementById("id_mvp_model_m11").innerHTML = mModelMatrix[5].toFixed(2);
    document.getElementById("id_mvp_model_m12").innerHTML = mModelMatrix[9].toFixed(2);
    document.getElementById("id_mvp_model_m13").innerHTML = mModelMatrix[13].toFixed(2);
    document.getElementById("id_mvp_model_m20").innerHTML = mModelMatrix[2].toFixed(2);
    document.getElementById("id_mvp_model_m21").innerHTML = mModelMatrix[6].toFixed(2);
    document.getElementById("id_mvp_model_m22").innerHTML = mModelMatrix[10].toFixed(2);
    document.getElementById("id_mvp_model_m23").innerHTML = mModelMatrix[14].toFixed(2);
    document.getElementById("id_mvp_model_m30").innerHTML = mModelMatrix[3].toFixed(2);
    document.getElementById("id_mvp_model_m31").innerHTML = mModelMatrix[7].toFixed(2);
    document.getElementById("id_mvp_model_m32").innerHTML = mModelMatrix[11].toFixed(2);
    document.getElementById("id_mvp_model_m33").innerHTML = mModelMatrix[15].toFixed(2);

    document.getElementById("id_mvp_m00").innerHTML = mMvpMatrix[0].toFixed(2);
    document.getElementById("id_mvp_m01").innerHTML = mMvpMatrix[4].toFixed(2);
    document.getElementById("id_mvp_m02").innerHTML = mMvpMatrix[8].toFixed(2);
    document.getElementById("id_mvp_m03").innerHTML = mMvpMatrix[12].toFixed(2);
    document.getElementById("id_mvp_m10").innerHTML = mMvpMatrix[1].toFixed(2);
    document.getElementById("id_mvp_m11").innerHTML = mMvpMatrix[5].toFixed(2);
    document.getElementById("id_mvp_m12").innerHTML = mMvpMatrix[9].toFixed(2);
    document.getElementById("id_mvp_m13").innerHTML = mMvpMatrix[13].toFixed(2);
    document.getElementById("id_mvp_m20").innerHTML = mMvpMatrix[2].toFixed(2);
    document.getElementById("id_mvp_m21").innerHTML = mMvpMatrix[6].toFixed(2);
    document.getElementById("id_mvp_m22").innerHTML = mMvpMatrix[10].toFixed(2);
    document.getElementById("id_mvp_m23").innerHTML = mMvpMatrix[14].toFixed(2);
    document.getElementById("id_mvp_m30").innerHTML = mMvpMatrix[3].toFixed(2);
    document.getElementById("id_mvp_m31").innerHTML = mMvpMatrix[7].toFixed(2);
    document.getElementById("id_mvp_m32").innerHTML = mMvpMatrix[11].toFixed(2);
    document.getElementById("id_mvp_m33").innerHTML = mMvpMatrix[15].toFixed(2);

    document.getElementById("id_coord_x").innerHTML = mAssistCoord[0].toFixed(2);
    document.getElementById("id_coord_y").innerHTML = mAssistCoord[1].toFixed(2);
    document.getElementById("id_coord_z").innerHTML = mAssistCoord[2].toFixed(2);
    document.getElementById("id_coord_w").innerHTML = mAssistCoord[3].toFixed(2);

    document.getElementById("id_mvp_coord_x").innerHTML = mAssistMvpCoord[0].toFixed(2);
    document.getElementById("id_mvp_coord_y").innerHTML = mAssistMvpCoord[1].toFixed(2);
    document.getElementById("id_mvp_coord_z").innerHTML = mAssistMvpCoord[2].toFixed(2);
    document.getElementById("id_mvp_coord_w").innerHTML = mAssistMvpCoord[3].toFixed(2);

    document.getElementById("id_mvp_coord_homog_x").innerHTML = mAssistMvpHomogCoord[0].toFixed(2);
    document.getElementById("id_mvp_coord_homog_y").innerHTML = mAssistMvpHomogCoord[1].toFixed(2);
    document.getElementById("id_mvp_coord_homog_z").innerHTML = mAssistMvpHomogCoord[2].toFixed(2);
    document.getElementById("id_mvp_coord_homog_w").innerHTML = mAssistMvpHomogCoord[3].toFixed(2);

    document.getElementById("id_screen_coord_x").innerHTML = mAssistScreenCoord[0].toFixed(2);
    document.getElementById("id_screen_coord_y").innerHTML = mAssistScreenCoord[1].toFixed(2);
    document.getElementById("id_screen_coord_z").innerHTML = mAssistScreenCoord[2].toFixed(2);
    document.getElementById("id_screen_coord_w").innerHTML = mAssistScreenCoord[3].toFixed(2);

    document.getElementById("id_mvp_mult_m00").innerHTML = mMvpMatrix[0].toFixed(2);
    document.getElementById("id_mvp_mult_m01").innerHTML = mMvpMatrix[4].toFixed(2);
    document.getElementById("id_mvp_mult_m02").innerHTML = mMvpMatrix[8].toFixed(2);
    document.getElementById("id_mvp_mult_m03").innerHTML = mMvpMatrix[12].toFixed(2);
    document.getElementById("id_mvp_mult_m10").innerHTML = mMvpMatrix[1].toFixed(2);
    document.getElementById("id_mvp_mult_m11").innerHTML = mMvpMatrix[5].toFixed(2);
    document.getElementById("id_mvp_mult_m12").innerHTML = mMvpMatrix[9].toFixed(2);
    document.getElementById("id_mvp_mult_m13").innerHTML = mMvpMatrix[13].toFixed(2);
    document.getElementById("id_mvp_mult_m20").innerHTML = mMvpMatrix[2].toFixed(2);
    document.getElementById("id_mvp_mult_m21").innerHTML = mMvpMatrix[6].toFixed(2);
    document.getElementById("id_mvp_mult_m22").innerHTML = mMvpMatrix[10].toFixed(2);
    document.getElementById("id_mvp_mult_m23").innerHTML = mMvpMatrix[14].toFixed(2);
    document.getElementById("id_mvp_mult_m30").innerHTML = mMvpMatrix[3].toFixed(2);
    document.getElementById("id_mvp_mult_m31").innerHTML = mMvpMatrix[7].toFixed(2);
    document.getElementById("id_mvp_mult_m32").innerHTML = mMvpMatrix[11].toFixed(2);
    document.getElementById("id_mvp_mult_m33").innerHTML = mMvpMatrix[15].toFixed(2);

    document.getElementById("id_pitch").value = mPitching * RADIUS_TO_DEGREE;
    document.getElementById("id_yaw").value = mYawing * RADIUS_TO_DEGREE;
    document.getElementById("id_roll").value = mRolling * RADIUS_TO_DEGREE;

    document.getElementById("id_pitch_eular").value = mPitching * RADIUS_TO_DEGREE;
    document.getElementById("id_yaw_eular").value = mYawing * RADIUS_TO_DEGREE;
    document.getElementById("id_roll_eular").value = mRolling * RADIUS_TO_DEGREE;
}

function updateViewMatrixByMouse() {
    // update mEye
    mEye[0] = EYE_INIT_POS_Z * Math.sin(mEyePosYawing) * Math.cos(mEyePosPitching);
    mEye[1] = EYE_INIT_POS_Z * Math.sin(mEyePosPitching);
    mEye[2] = EYE_INIT_POS_Z * Math.cos(mEyePosYawing) * Math.cos(mEyePosPitching);

    // update view matrix
    mat4.lookAt(mViewMatrix, mEye, mLookAtCenter, mCameraUp);
    mat4.copy(mVIMatrix, mViewMatrix);
    mat4.invert(mVIMatrix, mVIMatrix);
    document.getElementById("id_eye_x").value = mEye[0];
    document.getElementById("id_eye_y").value = mEye[1];
    document.getElementById("id_eye_z").value = mEye[2];
    document.getElementById("id_lookat_x").value = mLookAtCenter[0];
    document.getElementById("id_lookat_y").value = mLookAtCenter[1];
    document.getElementById("id_lookat_z").value = mLookAtCenter[2];
    document.getElementById("id_cameraup_x").value = mCameraUp[0];
    document.getElementById("id_cameraup_y").value = mCameraUp[1];
    document.getElementById("id_cameraup_z").value = mCameraUp[2];
    updateViewMatrixHtml();
    updateViewFrustumPose();
}

function updateViewMatrixByInput() {
    mEye[0] = document.getElementById("id_eye_x").value;
    mEye[1] = document.getElementById("id_eye_y").value;
    mEye[2] = document.getElementById("id_eye_z").value;
    mLookAtCenter[0] = document.getElementById("id_lookat_x").value;
    mLookAtCenter[1] = document.getElementById("id_lookat_y").value;
    mLookAtCenter[2] = document.getElementById("id_lookat_z").value;
    mCameraUp[0] = document.getElementById("id_cameraup_x").value;
    mCameraUp[1] = document.getElementById("id_cameraup_y").value;
    mCameraUp[2] = document.getElementById("id_cameraup_z").value;

    // update view matrix
    mat4.lookAt(mViewMatrix, mEye, mLookAtCenter, mCameraUp);
    mat4.copy(mVIMatrix, mViewMatrix);
    mat4.invert(mVIMatrix, mVIMatrix);
    updateViewMatrixHtml();
    updateViewFrustumPose();
}

function updateViewMatrixHtml() {
    document.getElementById("id_viewmatrix_m00").innerHTML = mViewMatrix[0].toFixed(2);
    document.getElementById("id_viewmatrix_m01").innerHTML = mViewMatrix[4].toFixed(2);
    document.getElementById("id_viewmatrix_m02").innerHTML = mViewMatrix[8].toFixed(2);
    document.getElementById("id_viewmatrix_m03").innerHTML = mViewMatrix[12].toFixed(2);
    document.getElementById("id_viewmatrix_m10").innerHTML = mViewMatrix[1].toFixed(2);
    document.getElementById("id_viewmatrix_m11").innerHTML = mViewMatrix[5].toFixed(2);
    document.getElementById("id_viewmatrix_m12").innerHTML = mViewMatrix[9].toFixed(2);
    document.getElementById("id_viewmatrix_m13").innerHTML = mViewMatrix[13].toFixed(2);
    document.getElementById("id_viewmatrix_m20").innerHTML = mViewMatrix[2].toFixed(2);
    document.getElementById("id_viewmatrix_m21").innerHTML = mViewMatrix[6].toFixed(2);
    document.getElementById("id_viewmatrix_m22").innerHTML = mViewMatrix[10].toFixed(2);
    document.getElementById("id_viewmatrix_m23").innerHTML = mViewMatrix[14].toFixed(2);
    document.getElementById("id_viewmatrix_m30").innerHTML = mViewMatrix[3].toFixed(2);
    document.getElementById("id_viewmatrix_m31").innerHTML = mViewMatrix[7].toFixed(2);
    document.getElementById("id_viewmatrix_m32").innerHTML = mViewMatrix[11].toFixed(2);
    document.getElementById("id_viewmatrix_m33").innerHTML = mViewMatrix[15].toFixed(2);

    document.getElementById("id_mvp_view_m00").innerHTML = mViewMatrix[0].toFixed(2);
    document.getElementById("id_mvp_view_m01").innerHTML = mViewMatrix[4].toFixed(2);
    document.getElementById("id_mvp_view_m02").innerHTML = mViewMatrix[8].toFixed(2);
    document.getElementById("id_mvp_view_m03").innerHTML = mViewMatrix[12].toFixed(2);
    document.getElementById("id_mvp_view_m10").innerHTML = mViewMatrix[1].toFixed(2);
    document.getElementById("id_mvp_view_m11").innerHTML = mViewMatrix[5].toFixed(2);
    document.getElementById("id_mvp_view_m12").innerHTML = mViewMatrix[9].toFixed(2);
    document.getElementById("id_mvp_view_m13").innerHTML = mViewMatrix[13].toFixed(2);
    document.getElementById("id_mvp_view_m20").innerHTML = mViewMatrix[2].toFixed(2);
    document.getElementById("id_mvp_view_m21").innerHTML = mViewMatrix[6].toFixed(2);
    document.getElementById("id_mvp_view_m22").innerHTML = mViewMatrix[10].toFixed(2);
    document.getElementById("id_mvp_view_m23").innerHTML = mViewMatrix[14].toFixed(2);
    document.getElementById("id_mvp_view_m30").innerHTML = mViewMatrix[3].toFixed(2);
    document.getElementById("id_mvp_view_m31").innerHTML = mViewMatrix[7].toFixed(2);
    document.getElementById("id_mvp_view_m32").innerHTML = mViewMatrix[11].toFixed(2);
    document.getElementById("id_mvp_view_m33").innerHTML = mViewMatrix[15].toFixed(2);
}

function updateProjMatrixHtml() {
    document.getElementById("id_projmatrix_m00").innerHTML = mProjectionMatrix[0].toFixed(2);
    document.getElementById("id_projmatrix_m01").innerHTML = mProjectionMatrix[4].toFixed(2);
    document.getElementById("id_projmatrix_m02").innerHTML = mProjectionMatrix[8].toFixed(2);
    document.getElementById("id_projmatrix_m03").innerHTML = mProjectionMatrix[12].toFixed(2);
    document.getElementById("id_projmatrix_m10").innerHTML = mProjectionMatrix[1].toFixed(2);
    document.getElementById("id_projmatrix_m11").innerHTML = mProjectionMatrix[5].toFixed(2);
    document.getElementById("id_projmatrix_m12").innerHTML = mProjectionMatrix[9].toFixed(2);
    document.getElementById("id_projmatrix_m13").innerHTML = mProjectionMatrix[13].toFixed(2);
    document.getElementById("id_projmatrix_m20").innerHTML = mProjectionMatrix[2].toFixed(2);
    document.getElementById("id_projmatrix_m21").innerHTML = mProjectionMatrix[6].toFixed(2);
    document.getElementById("id_projmatrix_m22").innerHTML = mProjectionMatrix[10].toFixed(2);
    document.getElementById("id_projmatrix_m23").innerHTML = mProjectionMatrix[14].toFixed(2);
    document.getElementById("id_projmatrix_m30").innerHTML = mProjectionMatrix[3].toFixed(2);
    document.getElementById("id_projmatrix_m31").innerHTML = mProjectionMatrix[7].toFixed(2);
    document.getElementById("id_projmatrix_m32").innerHTML = mProjectionMatrix[11].toFixed(2);
    document.getElementById("id_projmatrix_m33").innerHTML = mProjectionMatrix[15].toFixed(2);

    document.getElementById("id_mvp_proj_m00").innerHTML = mProjectionMatrix[0].toFixed(2);
    document.getElementById("id_mvp_proj_m01").innerHTML = mProjectionMatrix[4].toFixed(2);
    document.getElementById("id_mvp_proj_m02").innerHTML = mProjectionMatrix[8].toFixed(2);
    document.getElementById("id_mvp_proj_m03").innerHTML = mProjectionMatrix[12].toFixed(2);
    document.getElementById("id_mvp_proj_m10").innerHTML = mProjectionMatrix[1].toFixed(2);
    document.getElementById("id_mvp_proj_m11").innerHTML = mProjectionMatrix[5].toFixed(2);
    document.getElementById("id_mvp_proj_m12").innerHTML = mProjectionMatrix[9].toFixed(2);
    document.getElementById("id_mvp_proj_m13").innerHTML = mProjectionMatrix[13].toFixed(2);
    document.getElementById("id_mvp_proj_m20").innerHTML = mProjectionMatrix[2].toFixed(2);
    document.getElementById("id_mvp_proj_m21").innerHTML = mProjectionMatrix[6].toFixed(2);
    document.getElementById("id_mvp_proj_m22").innerHTML = mProjectionMatrix[10].toFixed(2);
    document.getElementById("id_mvp_proj_m23").innerHTML = mProjectionMatrix[14].toFixed(2);
    document.getElementById("id_mvp_proj_m30").innerHTML = mProjectionMatrix[3].toFixed(2);
    document.getElementById("id_mvp_proj_m31").innerHTML = mProjectionMatrix[7].toFixed(2);
    document.getElementById("id_mvp_proj_m32").innerHTML = mProjectionMatrix[11].toFixed(2);
    document.getElementById("id_mvp_proj_m33").innerHTML = mProjectionMatrix[15].toFixed(2);
}

function updateHtmlRotateMatrixByRender() {
    document.getElementById("id_rotatematrix_m00").innerHTML = mRotateMatrix[0].toFixed(2);
    document.getElementById("id_rotatematrix_m01").innerHTML = mRotateMatrix[4].toFixed(2);
    document.getElementById("id_rotatematrix_m02").innerHTML = mRotateMatrix[8].toFixed(2);
    document.getElementById("id_rotatematrix_m10").innerHTML = mRotateMatrix[1].toFixed(2);
    document.getElementById("id_rotatematrix_m11").innerHTML = mRotateMatrix[5].toFixed(2);
    document.getElementById("id_rotatematrix_m12").innerHTML = mRotateMatrix[9].toFixed(2);
    document.getElementById("id_rotatematrix_m20").innerHTML = mRotateMatrix[2].toFixed(2);
    document.getElementById("id_rotatematrix_m21").innerHTML = mRotateMatrix[6].toFixed(2);
    document.getElementById("id_rotatematrix_m22").innerHTML = mRotateMatrix[10].toFixed(2);

    document.getElementById("id_aa_rotatematrix_m00").innerHTML = mRotateMatrix[0].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m01").innerHTML = mRotateMatrix[4].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m02").innerHTML = mRotateMatrix[8].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m10").innerHTML = mRotateMatrix[1].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m11").innerHTML = mRotateMatrix[5].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m12").innerHTML = mRotateMatrix[9].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m20").innerHTML = mRotateMatrix[2].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m21").innerHTML = mRotateMatrix[6].toFixed(2);
    document.getElementById("id_aa_rotatematrix_m22").innerHTML = mRotateMatrix[10].toFixed(2);

    document.getElementById("id_quat_rotatematrix_m00").innerHTML = mRotateMatrix[0].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m01").innerHTML = mRotateMatrix[4].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m02").innerHTML = mRotateMatrix[8].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m10").innerHTML = mRotateMatrix[1].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m11").innerHTML = mRotateMatrix[5].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m12").innerHTML = mRotateMatrix[9].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m20").innerHTML = mRotateMatrix[2].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m21").innerHTML = mRotateMatrix[6].toFixed(2);
    document.getElementById("id_quat_rotatematrix_m22").innerHTML = mRotateMatrix[10].toFixed(2);

    document.getElementById("id_quat_x").value = mQuaternion[0].toFixed(2);
    document.getElementById("id_quat_y").value = mQuaternion[1].toFixed(2);
    document.getElementById("id_quat_z").value = mQuaternion[2].toFixed(2);
    document.getElementById("id_quat_w").value = mQuaternion[3].toFixed(2);
    
    document.getElementById("id_rotate_x_matrix_m00").innerHTML = mRotateXMatrix[0].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m01").innerHTML = mRotateXMatrix[4].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m02").innerHTML = mRotateXMatrix[8].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m10").innerHTML = mRotateXMatrix[1].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m11").innerHTML = mRotateXMatrix[5].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m12").innerHTML = mRotateXMatrix[9].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m20").innerHTML = mRotateXMatrix[2].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m21").innerHTML = mRotateXMatrix[6].toFixed(2);
    document.getElementById("id_rotate_x_matrix_m22").innerHTML = mRotateXMatrix[10].toFixed(2);

    document.getElementById("id_rotate_y_matrix_m00").innerHTML = mRotateYMatrix[0].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m01").innerHTML = mRotateYMatrix[4].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m02").innerHTML = mRotateYMatrix[8].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m10").innerHTML = mRotateYMatrix[1].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m11").innerHTML = mRotateYMatrix[5].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m12").innerHTML = mRotateYMatrix[9].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m20").innerHTML = mRotateYMatrix[2].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m21").innerHTML = mRotateYMatrix[6].toFixed(2);
    document.getElementById("id_rotate_y_matrix_m22").innerHTML = mRotateYMatrix[10].toFixed(2);

    document.getElementById("id_rotate_z_matrix_m00").innerHTML = mRotateZMatrix[0].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m01").innerHTML = mRotateZMatrix[4].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m02").innerHTML = mRotateZMatrix[8].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m10").innerHTML = mRotateZMatrix[1].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m11").innerHTML = mRotateZMatrix[5].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m12").innerHTML = mRotateZMatrix[9].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m20").innerHTML = mRotateZMatrix[2].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m21").innerHTML = mRotateZMatrix[6].toFixed(2);
    document.getElementById("id_rotate_z_matrix_m22").innerHTML = mRotateZMatrix[10].toFixed(2);
}

function updateAxisAngleValue() {
    mRotAxis[0] = document.getElementById("id_axis_x").value;
    mRotAxis[1] = document.getElementById("id_axis_y").value;
    mRotAxis[2] = document.getElementById("id_axis_z").value;
    mRotAngle = document.getElementById("id_axis_angle").value * DEGREE_TO_RADIUS;
}

function updateQuaternionValue() {
//     mQuaternion[0] = document.getElementById("id_quat_x").value;
//     mQuaternion[1] = document.getElementById("id_quat_y").value;
//     mQuaternion[2] = document.getElementById("id_quat_z").value;
//     mQuaternion[3] = document.getElementById("id_quat_w").value; 
}

function updateProjMatrixByInput() {
    var fov = Number(document.getElementById("id_fov").value);
    var halfFov = fov / 2.0;
    mHalfFov =  halfFov * DEGREE_TO_RADIUS;
    mAspect = Number(document.getElementById("id_aspect").value);
    mNear = Number(document.getElementById("id_near").value);
    mFar = Number(document.getElementById("id_far").value);

    mProjectionMatrix = mat4.create();
    mat4.perspective(mProjectionMatrix, 2 * mHalfFov, mAspect, mNear, mFar);
    udpateViewFrustum();
    updateNearPlane();
    updateFarPlane();

    updateProjMatrixHtml();
}

function executePitching(step) {
    mPitching += step;
}

function executeYawing(step) {
    mYawing += step;
}

function executeRolling(step) {
    mRolling += step;
}