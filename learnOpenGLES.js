const AMBIENT_COLOR = vec4.fromValues(0.5, 0.5, 0.5, 1.0);
const DIFFUSE_COLOR = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
const SPECULAR_COLOR = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
const LIGHT_POSITION = vec3.fromValues(-1.0, 1.0, 1.0);
// vec3.normalize(LIGHT_POSITION, LIGHT_POSITION); // 确保方向向量归一化
const LIGHT_COLOR = vec3.fromValues(1.0, 1.0, 1.0);
const DEFAULT_EMISSIVE_FACTOR = vec3.fromValues(0.0, 0.0, 0.0);
const DEFAULT_BASECOLOR_FACTOR = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
const DEFAULT_SCALE_DIFF_BASE_MR = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
const DEFAULT_SCALE_FGD_SPEC = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
const DEFAULT_SCALE_IBL_AMBIENT = vec4.fromValues(1.0, 1.0, 0.0, 0.0);
const LENS_FLARE_SPACING = 0.16;
// proj
const HALF_FOV = 25 * DEGREE_TO_RADIUS;
const FRUSTOM_NEAR = 1.0;
const FRUSTOM_FAR = 15.0;
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

const DEFAULT_RTT_RESOLUTION = 256;
// basic
var mGLCanvas = null;
var mGLView = null;
// Initialize the GL context
var mOneSecThen = 0;
var mBasicProgram = null;
var mBasicTexProgram = null;
var mDiffuseLightingProgram = null;
var mPhongLightProgram = null;    // Blinn-Phong shader for the fighter model
var mUsePhongForFighter = false;  // true when 'Light' demo active → use Phong not PBR
// chapter
var mChapterTitle = ChapterTitle.CHAPTER_MATRIX;
// draw object
var mNeedDrawFighter = true;
var mRadius = 1.0;
var mObjectBuffer = [];
var mObjectDiffuseTexture = null;
var mObjectNormalTexture = null;
var mObjectMetalnessTexture = null;
var mObjectEmissiveTexture = null;
var mObjectRoughnessTexture = null;
var mBrdfLutTexture = null;
// lighting
var mLightProgram = null;
var mAmbientColor = vec4.fromValues(0.5, 0.5, 0.5, 1.0);
var mDiffuseColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
var mSpecularColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
var mSpecularShininess = 33.0;  // shinniness, the more smaller, the more smooth
var mUseAmbientColor = true;
var mUseDiffuseColor = true;
var mUseSpecularColor = true;
// lens flare
var mNeedDrawLensFlare = false;
// skybox
var mNeedDrawSkyBox = true;
// shadow
var mNeedDrawShadow = false;
var mVpMatrixByLightCoord = mat4.create();
var mMvpMatrixByLightCoord = mat4.create();
// terrain
var mNeedDrawTerrain = false;
// draw background
var mNeedDrawBackground = true;
var mBackgroundProgram = null;
var mBackgroundBuffer = null;
var mBackgroundTexture = null;
var mBackgroundVertices = [];
var mBackgroundUvs = [];
var mIsMinGLNearest = false;
var mIsMagGLNearest = false;
var mIsWrapSRepeat = true;
var mIsWrapTRepeat = true;
// draw UV demo plane
var mNeedDrawUVDemoPlane = false;
var mTerrainTexture = null;  // reused for UV demo visualization
var mUVDemoPlaneBuffer = null;
var mUVDemoPlaneVertices = [];
var mUVDemoPlaneUvs = [];
var mUVDemoAssistPlaneBuffer = null;
var mUVDemoAssistPlaneVertices = [];
var mUVDemoAssistPlaneUvs = [];
var mUVDemoAssistCubeBuffer = null;
var mUVDemoAssistCubeVertices = [];
var mUVDemoAssistCubeColor = [];
const mUVDemoAssistCubeX = 1.83;
const mUVDemoAssistCubeY = 3.17;
const mUVDemoAssistCubeRate = 1.34;
var mUVDemoAssistUVAxisBuffer = null;
var mUVDemoAssistUVAxisVertices = [];
var mUVDemoAssistUVAxisColor = [];
// draw YUV Video
var mYUVInited = false;
var mNeedDrawYUVVideo = false;
var mIdentityMatrix = mat4.create();
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
// draw per-vertex and per-frag lighting
var mNeedDrawSphere = false;
var mNeedDrawBlendSort = false;
var mNeedDrawMipmap = false;
var mNeedDrawFresnel = false;
var mSphereBuffer = null;
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
var mGodViewProjectMatrix = mat4.create();
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
var mEyePosPitching = 0.2;
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
let mVelocityX = 0; // 鼠标释放后的惯性速度
let mVelocityY = 0;
let mDamping = 0.95; // 阻尼系数，控制旋转逐步变慢
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

// UI
var mUIModelMatrix = null;
var mUIEulerAngle = null;
var mUIAxisAngle = null;
var mUIQuaternion = null;
var mUIViewMatrix = null;
var mUIProjectionMatrix = null;
var mUIMvpMatrix = null;
var mUIFighterAnim = null;
var mUIConclusion = null;
var mUIUVMapping = null;
var mUIBlendSort = null;
var mUIMipmap = null;
var mUISkyBox = null;
var mUINormalMapping = null;
var mUILight = null;
var mUIFresnel = null;
// language
var language_pack = {
    now_lang : 0, // 0:ch,1:en
    loadProperties : function(new_lang){
        var self = this;
        var tmp_lang = '';
        if(new_lang == 0){
            tmp_lang = 'zh';
            $('body').removeClass('en').addClass('zh');
        }else{
            tmp_lang = 'en';
            $('body').removeClass('zh').addClass('en');
        }
        jQuery.i18n.properties({//加载资浏览器语言对应的资源文件
            name: 'strings', //资源文件名称
            path:'language/', //资源文件路径
            language: tmp_lang,
            cache: false,
            mode:'map', //用Map的方式使用资源文件中的值
            callback: function() {//加载成功后设置显示内容
                for(var i in $.i18n.map){
                    $('[data-lang="'+i+'"]').text($.i18n.map[i]);
                }
                // document.title = $.i18n.map['string_title'];
            }
        });
        self.now_lang = new_lang;
    }
}
$(document).ready(function(){
    language_pack.loadProperties(0);
});

class GLScene extends GLCanvas {
    constructor(glView) {
        super(glView);
    }

    onGLCreated() {
        console.log("GLScene, onGLCreated");
        let gl = this.getGL();
        gl.getExtension('EXT_shader_texture_lod');
        gl.getExtension('OES_standard_derivatives');
        // init light value
        updateLightSwitch();
        updateAmbientColor();
        updateDiffuseColor();
        updateSpecularColor();
        updateSpecularShininess();

        // initialize anim params
        mCobraStep1Quat = quat.fromEuler(mCobraStep1Quat, 120, 0, 30);
        mFallingLeaf1Quat = quat.fromEuler(mFallingLeaf1Quat, 100, -20, 90);
        mFallingLeaf2Quat = quat.fromEuler(mFallingLeaf2Quat, 80, -40, 180);
        mFallingLeaf3Quat = quat.fromEuler(mFallingLeaf3Quat, 60, -20, 270);
        mFallingLeaf4Quat = quat.fromEuler(mFallingLeaf4Quat, 40, 0, 360);
        mCobraStep2Quat = quat.fromEuler(mCobraStep2Quat, 0, 0, 0);
        updateInitQuatHtmlValue();

        // mouse
        mGLView.onmousedown = handleMouseDown;
        mGLView.onmouseup = handleMouseUp;
        mGLView.onmousemove = handleMouseMove;
        mGLView.onmouseout = handleMouseOut;
        // mouse wheel 


        // Here's where we call the routine that builds all the objects we'll be drawing.
        initFighterBuffers(gl);

        // texture
        mObjectDiffuseTexture = loadTexture(gl, './texture/J-15_diffuse.jpg', requestRender);
        mObjectNormalTexture = loadTexture(gl, './texture/J-15_normal.jpg', requestRender); // FixMe
        mObjectMetalnessTexture = loadTexture(gl, './texture/J-15_metalness.jpg', requestRender);
        mObjectEmissiveTexture = loadTexture(gl, './texture/J-15_emissive.jpg', requestRender);
        mObjectRoughnessTexture = loadTexture(gl, './texture/J-15_roughness.jpg', requestRender);
        mBrdfLutTexture = loadTexture(gl, './texture/brdfLUT.png', requestRender);
        mBackgroundTexture = loadTexture(gl, './texture/bg_sky.jpg', requestRender);
        mTerrainTexture = loadTextureByParams(gl, './texture/terrain.jpg', false, false, false, true, true, requestRender);

        // init scene modules
        App.SkyBox.init(gl, requestRender);
        App.LensFlare.init(gl, requestRender);
        App.Shadow.init(gl);
        App.Terrain.init(gl, requestRender);
        App.Video.init(gl);
        App.Cloud.init(gl, requestRender);
        App.Sphere.init(gl);
        App.BlendSort.init(gl);
        App.Mipmap.init(gl);
        App.Fresnel.init(gl);

        // init shader
        updateBackgroundShader();
        updateLightShader();
        updateYUVVideoShader();
        initPBRLightingShader();
        mBasicProgram = initBasicShader(gl);
        mBasicTexProgram = initBasicTexShader(gl);
        mDiffuseLightingProgram = initDiffuseLightingShader(gl);
        mPhongLightProgram = initPhongTexturedShader(gl);
        updateViewFrustum();
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
        initUVDemo();
        mBackgroundBuffer = updateBackgroundBuffer(gl);
        mUVDemoPlaneBuffer = updateUVDemoBuffer(gl);
        mUVDemoAssistPlaneBuffer = updateUVDemoAssistBuffer(gl);
        mUVDemoAssistUVAxisBuffer = updateUVDemoAssistAxisBuffer(gl);
        mUVDemoAssistCubeBuffer = updateUVDemoAssistCubeBuffer(gl);

        initEntraceBlog();
    }

    onGLResourcesLoading() {
        console.log("GLScene, onGLResourcesLoading");
    }

    onGLResize(width, height) {
        console.log("GLScene, onGLResize");
        mViewportWidth = width / 2;
        mViewportHeight = height;

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

        // note: glmatrix.js always has the first argument as the destination to receive the result.
        mProjectionMatrix = mat4.create();
        mat4.perspective(mProjectionMatrix, 2 * mHalfFov, mAspect, mNear, mFar);
        updateProjMatrixHtml();
        // ortho
        // mat4.ortho(mProjectionMatrix, -mAspect, mAspect, -1, 1, mNear, mFar);

        // matrix by ligth position
        let viewMatrixByLight = mat4.create();
        let projMatrixByLight = mat4.create();
        mat4.perspective(projMatrixByLight, 70.0, DEFAULT_RTT_RESOLUTION / DEFAULT_RTT_RESOLUTION, 0.1, 1000.0);
        mat4.lookAt(viewMatrixByLight, LIGHT_POSITION, mLookAtCenter, mCameraUp);
        mat4.multiply(mVpMatrixByLightCoord, projMatrixByLight, viewMatrixByLight);

        // god view matrix
        mGodViewMatrix = mat4.create();
        mat4.lookAt(mGodViewMatrix, vec3.fromValues(12.0, 12.0, 12.0), mLookAtCenter, mCameraUp);
        mat4.copy(mGodVIMatrix, mGodViewMatrix);
        mat4.invert(mGodVIMatrix, mGodVIMatrix);
        mGodProjectionMatrix = mat4.create();
        mat4.perspective(mGodProjectionMatrix, HALF_FOV, mAspect, GOD_FRUSTOM_NEAR, GOD_FRUSTOM_FAR);
        mat4.multiply(mGodMvpMatrix, mGodProjectionMatrix, mGodViewMatrix);
        mat4.copy(mGodViewProjectMatrix, mGodMvpMatrix);
        mat4.copy(mViewFrustumMvpMatrix, mGodMvpMatrix);
        updateViewMatrixByMouse();
        
        requestRender();
    }

    onDrawFrame(now, deltaTime) {
        let gl = this.getGL();

        // update video texture
        App.Video.updateTextureFromVideo(gl);

        // draw scene
        drawScene(gl, mBasicProgram, mBasicTexProgram, mDiffuseLightingProgram, now, deltaTime);

        // 如果鼠标未拖拽，应用惯性旋转
        // if (!mMouseDown) {
        //     if (Math.abs(mVelocityX) > 0.01 || Math.abs(mVelocityY) > 0.01) {
        //         mYawing += mVelocityX;
        //         mPitching += mVelocityY;

        //         // 应用阻尼
        //         mVelocityX *= mDamping;
        //         mVelocityY *= mDamping;

        //         requestRender(); // 持续渲染
        //     }
        // }

        if (now - mOneSecThen > 1000) {
            mOneSecThen = now;
            // update fps
            document.getElementById("FPS").innerHTML = 'FPS: ' + (1.0 / deltaTime).toFixed(2);
        }
    }

    onGLDestoryed() {
        console.log("GLScene, onGLDestoryed");
        // TODO gl delete?

    }
}

function initEntraceBlog() {
    if (null == mUIModelMatrix) {
        mUIModelMatrix = document.getElementById("id_modelmatrix_blog");
        var markdownReader = new XMLHttpRequest();
        markdownReader.open('get', './blog/modelMatrix.md', false);
        markdownReader.send();

        let convertor = new showdown.Converter();
        let htmlContent = convertor.makeHtml(markdownReader.responseText);
        mUIModelMatrix.innerHTML = htmlContent;
    }
    mUIModelMatrix.style.display = 'block';
}

function requestRender() {
    if (null != mGLCanvas) {
        mGLCanvas.requestRender();
    }
}

function onSurfaceCreated(id) {
    mGLView = document.getElementById(id);
    mGLCanvas = new GLScene(mGLView);
    mGLCanvas.create();
    onSurfaceChanged();
}

function onSurfaceChanged() {
    if (null != mGLCanvas && null != mGLView) {
        mGLCanvas.resize(mGLView.clientWidth, mGLView.clientHeight);
    }
}

function onDestoryed() {
    if (null != mGLCanvas) {
        mGLCanvas.destory();
        mGLCanvas = null;
    }
    mGLView = null;
}

function languageSelect(language) {
    if (language.value == "zh_cn") {
        language_pack.loadProperties(0);
    } else {
        language_pack.loadProperties(1);
    }
}

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

    requestRender();
}

function initBasicTexShader(gl) {
    // Vertex shader program
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec2 aTexCoord;

        uniform mat4 uMVPMatrix;

        varying lowp vec2 vTexCoord;

        void main() {
            gl_Position = uMVPMatrix * aPosition;
            vTexCoord = aTexCoord;
        }
    `;

    // Fragment shader program
    const fsSource = `
        precision mediump float;

        uniform sampler2D uTexSampler;

        varying lowp vec2 vTexCoord;

        void main() {
            gl_FragColor = texture2D(uTexSampler, vTexCoord);
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
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
        },
        uniformLocations: {
            uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
            uTexSamplerHandle: gl.getUniformLocation(shaderProgram, 'uTexSampler'),
        },
    };

    return programInfo;
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
    let gl = mGLCanvas.getGL();
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

    requestRender();
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

// Blinn-Phong 光照着色器，带漫反射贴图采样 + 分量开关 + 高光粗糙度控制。
// 当《基本光照》Demo 激活时用它渲染战机模型，替代默认的 PBR 着色器，
// 使面板上的环境光 / 漫射光 / 镜面光 / 粗糙度滑块能实际控制渲染效果。
function initPhongTexturedShader(gl) {
    const vsSource = `
        attribute vec4 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aUV;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uMITMatrix;    // inverse-transpose of model, for normal

        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vTexCoord;

        void main() {
            vec4 worldPos = uModelMatrix * aPosition;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
            vWorldPos = worldPos.xyz;
            vWorldNormal = normalize(mat3(uMITMatrix) * aNormal);
            vTexCoord = aUV;
        }
    `;
    const fsSource = `
        precision mediump float;

        uniform sampler2D uDiffuseSampler;
        uniform vec4 uKa;          // 环境光颜色
        uniform vec4 uKd;          // 漫射光颜色
        uniform vec4 uKs;          // 镜面光颜色
        uniform float uShininess;  // 粗糙度 / 高光指数（越大高光越集中）
        uniform vec3 uLightPos;    // 光源位置（世界空间）
        uniform vec3 uViewPos;     // 相机位置（世界空间）
        uniform float uEnableAmbient;
        uniform float uEnableDiffuse;
        uniform float uEnableSpecular;

        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec2 vTexCoord;

        void main() {
            vec4 texColor = texture2D(uDiffuseSampler, vTexCoord);
            vec3 N = normalize(vWorldNormal);
            vec3 L = normalize(uLightPos - vWorldPos);
            vec3 V = normalize(uViewPos - vWorldPos);
            vec3 H = normalize(L + V);

            vec3 ambient  = uKa.rgb * uEnableAmbient;
            vec3 diffuse  = uKd.rgb * uEnableDiffuse * max(dot(N, L), 0.0);
            vec3 specular = uKs.rgb * uEnableSpecular * pow(max(dot(N, H), 0.0), uShininess);

            vec3 lit = (ambient + diffuse + specular) * texColor.rgb;
            gl_FragColor = vec4(lit, texColor.a);
        }
    `;

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the Phong shader: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            normalPosition:  gl.getAttribLocation(shaderProgram, 'aNormal'),
            textureCoord:    gl.getAttribLocation(shaderProgram, 'aUV'),
        },
        uniformLocations: {
            uModelMatrix:      gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            uViewMatrix:       gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            uProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            uMITMatrix:        gl.getUniformLocation(shaderProgram, 'uMITMatrix'),
            uDiffuseSampler:   gl.getUniformLocation(shaderProgram, 'uDiffuseSampler'),
            uKa:               gl.getUniformLocation(shaderProgram, 'uKa'),
            uKd:               gl.getUniformLocation(shaderProgram, 'uKd'),
            uKs:               gl.getUniformLocation(shaderProgram, 'uKs'),
            uShininess:        gl.getUniformLocation(shaderProgram, 'uShininess'),
            uLightPos:         gl.getUniformLocation(shaderProgram, 'uLightPos'),
            uViewPos:          gl.getUniformLocation(shaderProgram, 'uViewPos'),
            uEnableAmbient:    gl.getUniformLocation(shaderProgram, 'uEnableAmbient'),
            uEnableDiffuse:    gl.getUniformLocation(shaderProgram, 'uEnableDiffuse'),
            uEnableSpecular:   gl.getUniformLocation(shaderProgram, 'uEnableSpecular'),
        },
    };
}

function updateLightSwitch() {
    mUseAmbientColor = document.getElementById("ambientLightCheckBox").checked;
    mUseDiffuseColor = document.getElementById("diffuseLightCheckBox").checked;
    mUseSpecularColor = document.getElementById("specularLightCheckBox").checked;

    requestRender();
}

function updateAmbientColor() {
    mAmbientColor[0] = document.getElementById("ambient_color_red").value;
    mAmbientColor[1] = document.getElementById("ambient_color_green").value;
    mAmbientColor[2] = document.getElementById("ambient_color_blue").value;
    document.getElementById("label_ambient_red").innerHTML = mAmbientColor[0].toFixed(2);
    document.getElementById("label_ambient_green").innerHTML = mAmbientColor[1].toFixed(2);
    document.getElementById("label_ambient_blue").innerHTML = mAmbientColor[2].toFixed(2);

    requestRender();
}

function updateDiffuseColor() {
    mDiffuseColor[0] = document.getElementById("diffuse_color_red").value;
    mDiffuseColor[1] = document.getElementById("diffuse_color_green").value;
    mDiffuseColor[2] = document.getElementById("diffuse_color_blue").value;
    document.getElementById("label_diffuse_red").innerHTML = mDiffuseColor[0].toFixed(2);
    document.getElementById("label_diffuse_green").innerHTML = mDiffuseColor[1].toFixed(2);
    document.getElementById("label_diffuse_blue").innerHTML = mDiffuseColor[2].toFixed(2);

    requestRender();
}

function updateSpecularShininess() {
    mSpecularShininess = document.getElementById("specular_shininess").value * 100;
    document.getElementById("label_specular_shininess").innerHTML = mSpecularShininess.toFixed(0);

    requestRender();
}

function updateSpecularColor() {
    mSpecularColor[0] = document.getElementById("specular_color_red").value;
    mSpecularColor[1] = document.getElementById("specular_color_green").value;
    mSpecularColor[2] = document.getElementById("specular_color_blue").value;
    document.getElementById("label_specular_red").innerHTML = mSpecularColor[0].toFixed(2);
    document.getElementById("label_specular_green").innerHTML = mSpecularColor[1].toFixed(2);
    document.getElementById("label_specular_blue").innerHTML = mSpecularColor[2].toFixed(2);

    requestRender();
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

function updateLightShader(demoType) {
    var vertTextArea = document.getElementById('id_light_vertex_shader')
    var fragTextArea = document.getElementById('id_light_fragment_shader')
    if (demoType == "shadowDemo") {
        vertTextArea = document.getElementById('id_shadow_vertex_shader')
        fragTextArea = document.getElementById('id_shadow_fragment_shader')
    }
    var vertReader = new XMLHttpRequest();
    var fragReader = new XMLHttpRequest();
    vertReader.open('get', './shader/base_lighting.vs', false);
    fragReader.open('get', './shader/base_lighting.fs', false);
    vertReader.send();
    fragReader.send();
    vertTextArea.innerHTML = vertReader.responseText;
    fragTextArea.innerHTML = fragReader.responseText;
    
    // Initialize the GL context
    let gl = mGLCanvas.getGL();
    // Vertex shader program
    var vsSource = vertTextArea.value;
    // Fragment shader program
    var fsSource = fragTextArea.value;

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
            uVpMatrixByLightCoordHandle: gl.getUniformLocation(shaderProgram, 'uVpMatrixByLightCoord'),
            uSpecularHandle: gl.getUniformLocation(shaderProgram, 'uSpecular'),
            uKaHandle: gl.getUniformLocation(shaderProgram, 'uKa'),
            uKdHandle: gl.getUniformLocation(shaderProgram, 'uKd'),
            uKsHandle: gl.getUniformLocation(shaderProgram, 'uKs'),
            uLightDirHandle: gl.getUniformLocation(shaderProgram, 'uLightDir'),
            uTexDiffuseSampler: gl.getUniformLocation(shaderProgram, 'uTexDiffuseSampler'),
            uShadowSampler: gl.getUniformLocation(shaderProgram, 'uShadowSampler'),
            uTexNormalSampler: gl.getUniformLocation(shaderProgram, 'uTexNormalSampler'),
            uUseNormalMapping: gl.getUniformLocation(shaderProgram, 'uUseNormalMapping'),
            uUseAmbient: gl.getUniformLocation(shaderProgram, 'uUseAmbient'),
            uUseDiffuse: gl.getUniformLocation(shaderProgram, 'uUseDiffuse'),
            uUseSpecular: gl.getUniformLocation(shaderProgram, 'uUseSpecular'),
        },
    }

    requestRender();
}

function updateViewFrustumPose(byResume) {
    if (mEye[0] == mLookAtCenter[0] && mEye[1] == mLookAtCenter[1] && mEye[2] == mLookAtCenter[2]) {
        console.log('updateCameraPos err');
        return ;
    }

    // transform viewing frustum and Set the shader uniforms
    let lastViewFrustumModelMatrix = mat4.create();
    mat4.copy(lastViewFrustumModelMatrix, mViewFrustumModelMatrix);
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

    if (byResume) {
        let tmpGodVpMatrix = mat4.create();
        mat4.multiply(tmpGodVpMatrix, mGodProjectionMatrix, mGodViewMatrix);
        mat4.copy(mViewFrustumMvpMatrix, tmpGodVpMatrix);
        mat4.multiply(mViewFrustumModelMatrix, lastViewFrustumModelMatrix, mViewFrustumModelMatrix);
    }
    mat4.multiply(mViewFrustumMvpMatrix, mViewFrustumMvpMatrix, mViewFrustumModelMatrix);
}

function initAxisBuffers(gl) {
    mAxisVertices = [
        // x-axis
        0.0, 0.0, 0.0, 
        2.0, 0.0, 0.0, 
        // y-axis
        0.0, 0.0, 0.0, 
        0.0, 2.0, 0.0, 
        // z-axis
        0.0, 0.0, 0.0, 
        0.0, 0.0, 2.0, 
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

    requestRender();
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

    requestRender();
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

function updateViewFrustum() {
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
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
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
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
        [0.1,  0.5,  0.3,  1.0],
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

function initUVDemo() {
    // init uv demo plane
    const vertexCoords = [
        [-1.0,  -1.0, -3.0],
        [ 1.0,  -1.0, -3.0],
        [-1.0,   1.0, -3.0],
        [ 1.0,   1.0, -3.0],
    ];
    for (var j = 0; j < vertexCoords.length; ++j) {
        const v = vertexCoords[j];
    
        // Repeat each color four times for the four vertices of the face
        mUVDemoPlaneVertices = mUVDemoPlaneVertices.concat(v);  // merge arrays to one
    }

    const uvCoords = [
        0.0,    1.0, 
        1.0,    1.0, 
        0.0,    0.0, 
        1.0,    0.0
    ];
    mUVDemoPlaneUvs.splice(0, mUVDemoPlaneUvs);
    for (var i = 0; i < uvCoords.length; i++) {
        mUVDemoPlaneUvs.push(uvCoords[i]);
    }

    // init uv demo assist plane
    const assistVertexCoords = [
        [1.5,  -3.5, -3.0],
        [3.5,  -3.5, -3.0],
        [1.5,  -1.5, -3.0],
        [3.5,  -1.5, -3.0],
    ];
    for (var j = 0; j < assistVertexCoords.length; ++j) {
        const v = assistVertexCoords[j];
    
        // Repeat each color four times for the four vertices of the face
        mUVDemoAssistPlaneVertices = mUVDemoAssistPlaneVertices.concat(v);  // merge arrays to one
    }

    const assistUvCoords = [
        -0.25,    1.25, 
        1.25,     1.25, 
        -0.25,    -0.25, 
        1.25,     -0.25
    ];
    mUVDemoAssistPlaneUvs.splice(0, mUVDemoAssistPlaneUvs);
    for (var i = 0; i < assistUvCoords.length; i++) {
        mUVDemoAssistPlaneUvs.push(assistUvCoords[i]);
    }

    // init assist uv axis
    const assistAxisVertexCoords = [
        // u-axis
        [mUVDemoAssistCubeX,    -mUVDemoAssistCubeX, -3.0],
        [3.5,                   -mUVDemoAssistCubeX, -3.0],
        // v-axis
        [mUVDemoAssistCubeX,    -mUVDemoAssistCubeX, -3.0],
        [mUVDemoAssistCubeX,    -3.83,               -3.0],
    ];
    mUVDemoAssistUVAxisColor = [
        // u-axis
        1.0, 0.0, 1.0, 1.0,
        1.0, 0.0, 1.0, 1.0, 
        // v-axis
        0.0, 1.0, 1.0, 1.0,
        0.0, 1.0, 1.0, 1.0,
    ];
    for (var j = 0; j < assistAxisVertexCoords.length; ++j) {
        const v = assistAxisVertexCoords[j];
    
        // Repeat each color four times for the four vertices of the face
        mUVDemoAssistUVAxisVertices = mUVDemoAssistUVAxisVertices.concat(v);  // merge arrays to one
    }

    // init assist uv cube
    const assistCubeVertexCoords = [
        [mUVDemoAssistCubeX, -mUVDemoAssistCubeY,  -3.0],    // v0
        [mUVDemoAssistCubeY, -mUVDemoAssistCubeY,  -3.0],    // v1
        [mUVDemoAssistCubeY, -mUVDemoAssistCubeX,  -3.0],    // v2
        [mUVDemoAssistCubeX, -mUVDemoAssistCubeX,  -3.0],    // v3
    ];
    for (var j = 0; j < assistCubeVertexCoords.length; ++j) {
        const v = assistCubeVertexCoords[j];
    
        // Repeat each color four times for the four vertices of the face
        mUVDemoAssistCubeVertices = mUVDemoAssistCubeVertices.concat(v);  // merge arrays to one
    }
    mUVDemoAssistCubeColor = [
        1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0,
    ];

    updateUVData();
}

function updateUVData() {
    mUVDemoPlaneUvs[0] = document.getElementById("id_uv_u_1").value;
    mUVDemoPlaneUvs[1] = document.getElementById("id_uv_v_1").value;
    mUVDemoPlaneUvs[2] = document.getElementById("id_uv_u_2").value;
    mUVDemoPlaneUvs[3] = document.getElementById("id_uv_v_2").value;
    mUVDemoPlaneUvs[4] = document.getElementById("id_uv_u_3").value;
    mUVDemoPlaneUvs[5] = document.getElementById("id_uv_v_3").value;
    mUVDemoPlaneUvs[6] = document.getElementById("id_uv_u_4").value;
    mUVDemoPlaneUvs[7] = document.getElementById("id_uv_v_4").value;

    mUVDemoAssistCubeVertices[0] = mUVDemoAssistCubeX + mUVDemoPlaneUvs[0] * mUVDemoAssistCubeRate;
    mUVDemoAssistCubeVertices[1] = -mUVDemoAssistCubeY + (1 - mUVDemoPlaneUvs[1]) * mUVDemoAssistCubeRate;
    mUVDemoAssistCubeVertices[3] = mUVDemoAssistCubeY + (mUVDemoPlaneUvs[2] - 1) * mUVDemoAssistCubeRate;
    mUVDemoAssistCubeVertices[4] = -mUVDemoAssistCubeY + (1 - mUVDemoPlaneUvs[3]) * mUVDemoAssistCubeRate;

    mUVDemoAssistCubeVertices[6] = mUVDemoAssistCubeY + (mUVDemoPlaneUvs[6] - 1) * mUVDemoAssistCubeRate;
    mUVDemoAssistCubeVertices[7] = -mUVDemoAssistCubeX - mUVDemoPlaneUvs[7] * mUVDemoAssistCubeRate;
    mUVDemoAssistCubeVertices[9] = mUVDemoAssistCubeX + mUVDemoPlaneUvs[4] * mUVDemoAssistCubeRate;
    mUVDemoAssistCubeVertices[10] = -mUVDemoAssistCubeX - mUVDemoPlaneUvs[5] * mUVDemoAssistCubeRate;

    let gl = mGLCanvas.getGL();
    mUVDemoPlaneBuffer = updateUVDemoBuffer(gl);
    mUVDemoAssistCubeBuffer = updateUVDemoAssistCubeBuffer(gl);

    requestRender();
}

function updateUVDemoBuffer(gl) {
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoPlaneVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoPlaneUvs), gl.DYNAMIC_DRAW);

    return {
        position: positionBuffer,
        uv: uvBuffer,
        drawCnt: mUVDemoPlaneVertices.length / 3,
    };
}

function updateUVDemoAssistBuffer(gl) {
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoAssistPlaneVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoAssistPlaneUvs), gl.DYNAMIC_DRAW);

    return {
        position: positionBuffer,
        uv: uvBuffer,
        drawCnt: mUVDemoPlaneVertices.length / 3,
    };
}

function updateUVDemoAssistAxisBuffer(gl) {
    // Create a buffer for the viewFrustum's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoAssistUVAxisVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoAssistUVAxisColor), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function updateUVDemoAssistCubeBuffer(gl) {
    // Create a buffer for the viewFrustum's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoAssistCubeVertices), gl.STATIC_DRAW);

    // Create a buffer for the viewFrustum's color.
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mUVDemoAssistCubeColor), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function updateUVMinFilter() {
    var uvMinFilterNearestChecked = document.getElementById("id_min_gl_nearest").checked;
    var uvMinFilterLinearChecked = document.getElementById("id_min_gl_linear").checked;
    mIsMinGLNearest = (uvMinFilterNearestChecked && !uvMinFilterLinearChecked);
    updateUVTexture();
}

function updateUVMagFilter() {
    var uvMagFilterNearestChecked = document.getElementById("id_mag_gl_nearest").checked;
    var uvMagFilterLinearChecked = document.getElementById("id_mag_gl_linear").checked;
    mIsMagGLNearest = (uvMagFilterNearestChecked && !uvMagFilterLinearChecked);
    updateUVTexture();
}

function updateUVWrapST() {
    var uvWrapSRepeatChecked = document.getElementById("id_gl_wrap_s_repeat").checked;
    var uvWrapSClampChecked = document.getElementById("id_gl_wrap_s_clamp").checked;
    var uvWrapTRepeatChecked = document.getElementById("id_gl_wrap_t_repeat").checked;
    var uvWrapTClampChecked = document.getElementById("id_gl_wrap_t_clamp").checked;
    mIsWrapSRepeat = (uvWrapSRepeatChecked && !uvWrapSClampChecked);
    mIsWrapTRepeat = (uvWrapTRepeatChecked && !uvWrapTClampChecked);
    updateUVTexture();
}

function updateUVTexture() {
    let gl = mGLCanvas.getGL();
    gl.deleteTexture(mTerrainTexture);
    mTerrainTexture = loadTextureByParams(gl, './texture/terrain.jpg', false, 
        mIsMinGLNearest, mIsMagGLNearest, mIsWrapSRepeat, mIsWrapTRepeat, requestRender);
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

// TODO 暂定太阳画在posY.png的右上角，UV坐标为(0.85, 0.85的位置)
function adjustLensFlareLightDir() {
    const u = 0.85; // 水平位置
    const v = 0.85; // 垂直位置

    // 将纹理坐标转换为天空盒的方向向量
    const x = -1 + 2 * u;
    const y = 1; // posY 面固定 y = 1
    const z = -1 + 2 * v;

    // 归一化方向向量
    const length = Math.sqrt(x * x + y * y + z * z);
    LIGHT_POSITION.set(x / length, y / length, z / length);

    console.log('Light Direction:', LIGHT_POSITION);
}

function initFighterBuffers(gl) {
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
    loader.load('./model/J-15.obj', function(object) {
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
    var canvasLeft = mGLView ? mGLView.getBoundingClientRect().left : 0;
    if (mLastMouseX < canvasLeft + mViewportWidth) {
        mDragMainView = true;
    } else {
        mDragMainView = false;
    }

    mLastMouseY = event.clientY;

    requestRender();
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
        // mYawing = deltaX / 100;
        // mPitching = deltaY / 100;
        mYawing += deltaX * 0.01;
        mPitching += deltaY * 0.01;
        // console.log('yawing: ' + mYawing + ' pitch: ' + mPitching);
    } else {
        // mEyePosYawing = deltaX / 100;
        // mEyePosPitching = -deltaY / 100;
        mEyePosYawing += deltaX * 0.01;
        mEyePosPitching += deltaY * 0.01;
        updateViewMatrixByMouse();
    }

    // 更新惯性速度
    mVelocityX = deltaX * 0.1;
    mVelocityY = deltaY * 0.1;
    mLastMouseX = event.clientX;
    mLastMouseY = event.clientY;

    requestRender();
}

function switchDemo(demoId) {
    App.Video.pauseVideo();
    mNeedDrawGimbal = false;
    mNeedDrawAngleAxis = false;
    mNeedDrawAssistObject = false;
    mNeedDrawCobraAnim = false;
    mNeedDrawSphere = false;
    mNeedDrawBlendSort = false;
    mNeedDrawMipmap = false;
    mNeedDrawFresnel = false;
    mUsePhongForFighter = false;
    mNeedDrawFighter = false;
    mNeedDrawBackground = false;
    mNeedDrawUVDemoPlane = false;
    mNeedDrawYUVVideo = false;
    mNeedDrawShadow = false;
    mNeedDrawTerrain = false;
    mNeedDrawLensFlare = false;
    mNeedDrawSkyBox = false;
    document.getElementById("id_shader").style.display = 'none';
    document.getElementById("id_mvpmatrix").style.display = 'none';
    document.getElementById("id_modelmatrix").style.display = 'none';
    document.getElementById("id_viewmatrix").style.display = 'none';
    document.getElementById("id_projmatrix").style.display = 'none';
    document.getElementById("id_rotatematrix").style.display = 'none';
    document.getElementById("id_axisangle").style.display = 'none';
    document.getElementById("id_quaternion").style.display = 'none';
    document.getElementById("id_cobramaneuvre").style.display = 'none';
    document.getElementById("id_uv_demo").style.display = 'none';
    document.getElementById("id_blend_sort_demo").style.display = 'none';
    document.getElementById("id_mipmap_demo").style.display = 'none';
    document.getElementById("id_skybox_demo").style.display = 'none';
    document.getElementById("id_fresnel_demo").style.display = 'none';
    if (null != mUIUVMapping) {
        mUIUVMapping.style.display = 'none';
    }
    if (null != mUIBlendSort) {
        mUIBlendSort.style.display = 'none';
    }
    if (null != mUIMipmap) {
        mUIMipmap.style.display = 'none';
    }
    if (null != mUISkyBox) {
        mUISkyBox.style.display = 'none';
    }
    if (null != mUILight) {
        mUILight.style.display = 'none';
    }
    if (null != mUIFresnel) {
        mUIFresnel.style.display = 'none';
    }
    // 离开任何 demo 时关闭天空盒边界线，避免状态残留
    App.SkyBox.setShowEdge(false);
    if (null != mUIModelMatrix) {
        mUIModelMatrix.style.display = 'none';
    }
    if (null != mUIEulerAngle) {
        mUIEulerAngle.style.display = 'none';
    }
    if (null != mUIAxisAngle) {
        mUIAxisAngle.style.display = 'none';
    }
    if (null != mUIQuaternion) {
        mUIQuaternion.style.display = 'none';
    }
    if (null != mUIViewMatrix) {
        mUIViewMatrix.style.display = 'none';
    }
    if (null != mUIProjectionMatrix) {
        mUIProjectionMatrix.style.display = 'none';
    }
    document.getElementById("id_lightdemo").style.display = 'none';
    document.getElementById("id_per_vertex_or_frag_lighting").style.display = 'none';
    document.getElementById("id_shadowdemo").style.display = 'none';
    document.getElementById("id_yuv_video").style.display = 'none';
    document.getElementById("id_normal_mapping").style.display = 'none';
    document.getElementById("id_conclusion").style.display = 'none';

    switch (demoId) {
        case 'Conclusion':
            resumeMVPMatrix(true);
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            if (null == mUIConclusion) {
                mUIConclusion = document.getElementById("id_conclusion");

                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/conclusion.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIConclusion.innerHTML = htmlContent;
            }
            mUIConclusion.style.display = 'block';
            break;
        case 'NormalMapping':
            resumeMVPMatrix(true);
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            if (null == mUINormalMapping) {
                mUINormalMapping = document.getElementById("id_normal_mapping");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/normalMapping.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUINormalMapping.innerHTML = htmlContent;
            }
            mUINormalMapping.style.display = 'block';
            break;
        case 'Shader':
            resumeMVPMatrix(false);
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            document.getElementById("id_shader").style.display = 'flex';
            break;
        case 'EulerAngle':
            resumeMVPMatrix(false);
            mNeedDrawGimbal = true;
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_rotatematrix").style.display = 'flex';
            if (null == mUIEulerAngle) {
                mUIEulerAngle = document.getElementById("id_euler_angle_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/eulerAngle.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIEulerAngle.innerHTML = htmlContent;
            }
            mUIEulerAngle.style.display = 'block';
            break;
        case 'AxisAngle':
            mNeedDrawAngleAxis = true;
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_axisangle").style.display = 'flex';
            if (null == mUIAxisAngle) {
                mUIAxisAngle = document.getElementById("id_axis_angle_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/axisAngle.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIAxisAngle.innerHTML = htmlContent;
            }
            mUIAxisAngle.style.display = 'block';
            break;
        case 'Quaternion':
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_quaternion").style.display = 'flex';
            if (null == mUIQuaternion) {
                mUIQuaternion = document.getElementById("id_quaternion_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/quaternion.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIQuaternion.innerHTML = htmlContent;
            }
            mUIQuaternion.style.display = 'block';
            break;
        case 'MvpMatrix':
            mNeedDrawAssistObject = true;
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_mvpmatrix").style.display = 'flex';
            break;
        case 'ModelMatrix':
            resumeMVPMatrix(true);
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_modelmatrix").style.display = 'flex';
            mUIModelMatrix.style.display = 'block';
            break;
        case 'ViewMatrix':
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_viewmatrix").style.display = 'flex';
            if (null == mUIViewMatrix) {
                mUIViewMatrix = document.getElementById("id_view_matrix_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/viewMatrix.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIViewMatrix.innerHTML = htmlContent;
            }
            mUIViewMatrix.style.display = 'block';
            break;
        case 'ProjectionMatrix':
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_projmatrix").style.display = 'flex';
            if (null == mUIProjectionMatrix) {
                mUIProjectionMatrix = document.getElementById("id_projection_matrix_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/projectionMatrix.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIProjectionMatrix.innerHTML = htmlContent;
            }
            mUIProjectionMatrix.style.display = 'block';
            break;
        case 'UV':
            mNeedDrawUVDemoPlane = true;
            mNeedDrawSkyBox = true;
            resumeMVPMatrix(false);
            document.getElementById("id_uv_demo").style.display = 'flex';
            if (null == mUIUVMapping) {
                mUIUVMapping = document.getElementById("id_uv_mapping_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/uvMapping.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIUVMapping.innerHTML = htmlContent;
            }
            mUIUVMapping.style.display = 'block';
            break;
        case 'BlendSort':
            mNeedDrawBlendSort = true;
            mNeedDrawSkyBox = true;
            resumeMVPMatrix(false);
            document.getElementById("id_blend_sort_demo").style.display = 'flex';
            if (null == mUIBlendSort) {
                mUIBlendSort = document.getElementById("id_blend_sort_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/blendSort.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIBlendSort.innerHTML = htmlContent;
            }
            mUIBlendSort.style.display = 'block';
            break;
        case 'Mipmap':
            mNeedDrawMipmap = true;
            mNeedDrawSkyBox = true;
            resumeMVPMatrix(true);
            document.getElementById("id_mipmap_demo").style.display = 'flex';
            if (null == mUIMipmap) {
                mUIMipmap = document.getElementById("id_mipmap_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/mipmap.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIMipmap.innerHTML = htmlContent;
            }
            mUIMipmap.style.display = 'block';
            break;
        case 'SkyBox':
            resumeMVPMatrix(true);
            mNeedDrawSkyBox = true;
            App.SkyBox.setShowEdge(!document.getElementById('id_skybox_hide_edge').checked);
            document.getElementById("id_skybox_demo").style.display = 'flex';
            if (null == mUISkyBox) {
                mUISkyBox = document.getElementById("id_skybox_blog");
                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/skybox.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUISkyBox.innerHTML = htmlContent;
            }
            mUISkyBox.style.display = 'block';
            break;
        case 'PerVertexOrFragLighting':
            mNeedDrawSphere = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            document.getElementById("id_per_vertex_or_frag_lighting").style.display = 'flex';
            break;
        case 'Light':
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            mUsePhongForFighter = true;   // 用 Phong 替代 PBR，面板参数才生效
            document.getElementById("id_lightdemo").style.display = 'flex';
            if (null == mUILight) {
                mUILight = document.getElementById("id_light_blog");

                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/basicLighting.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUILight.innerHTML = htmlContent;
            }
            mUILight.style.display = 'block';
            break;
        case 'Fresnel':
            mNeedDrawFresnel = true;
            mNeedDrawSkyBox = true;
            resumeMVPMatrix(false);
            document.getElementById("id_fresnel_demo").style.display = 'flex';
            if (null == mUIFresnel) {
                mUIFresnel = document.getElementById("id_fresnel_blog");

                var markdownReader = new XMLHttpRequest();
                markdownReader.open('get', './blog/fresnel.md', false);
                markdownReader.send();

                let convertor = new showdown.Converter();
                let htmlContent = convertor.makeHtml(markdownReader.responseText);
                mUIFresnel.innerHTML = htmlContent;
            }
            mUIFresnel.style.display = 'block';
            break;
        case 'Shadow':
            resumeMVPMatrix(true);
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawShadow = true;
            mNeedDrawTerrain = true;
            document.getElementById("id_shadowdemo").style.display = 'flex';
            updateLightShader("shadowDemo");
            break;
        case 'LensFlare':
            resumeMVPMatrix(true);
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            mNeedDrawSkyBox = true;
            mNeedDrawLensFlare = true;
            document.getElementById("id_shadowdemo").style.display = 'flex';
            updateLightShader("shadowDemo");
            break;
        case 'CobraManeuvre':
            mNeedDrawCobraAnim = true;
            mNeedDrawFighter = true;
            mNeedDrawBackground = true;
            document.getElementById("id_cobramaneuvre").style.display = 'flex';
            // update mEye
            mEye[0] = EYE_INIT_POS_Z;
            mEye[1] = 0;
            mEye[2] = 0;
            mEyePosYawing = 0;
            mEyePosPitching = 0;
            mLastEyePosX = EYE_INIT_POS_X;
            mLastEyePosY = EYE_INIT_POS_Y;
            mLastEyePosZ = EYE_INIT_POS_Z;
            mLastLookAtX = 0.0;
            mLastLookAtY = 0.0;
            mLastLookAtZ = 0.0;
            mLookAtCenter = vec3.create();
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
            break;
        case 'YUVVideo':
            mNeedDrawYUVVideo = true;
            document.getElementById("id_yuv_video").style.display = 'flex';
            var vertexDiv = document.getElementById('file_filter_vertex_shader')
            vertexDiv.addEventListener('change', function() {
                handleFileSelect(event, 'id_video_filter_vertex_shader');
            }, false);
            var fragDiv = document.getElementById('file_filter_frag_shader')
            fragDiv.addEventListener('change', function() {
                handleFileSelect('id_video_filter_fragment_shader');
            }, false);
            setInterval(requestRender, 30);

            if (!mYUVInited) {
                App.Video.setupVideo('./texture/The_Infernal_Battlefiel_720P.mp4');
                mYUVInited = true;
            }
            App.Video.resumeVideo();
            resumeMVPMatrix(false);
            break;
        default:
            break;
    }

    requestRender();
}

function resumeMVPMatrix(isIncline) {
    mModelMatrix = mat4.create();
    mEyePosYawing = 0;
    if (isIncline) {
        mEyePosPitching = 0.2;
    } else {
        mEyePosPitching = 0;
    }
    mEye = vec3.fromValues(EYE_INIT_POS_X, EYE_INIT_POS_Y, EYE_INIT_POS_Z);
    mPitching = 0.0
    mYawing = 0.0;
    mRolling = 0.0;
    // projection
    mHalfFov = HALF_FOV;
    mNear = FRUSTOM_NEAR;
    mFar = FRUSTOM_FAR;
    mAspect = mViewportWidth / mViewportHeight;
    mCobraZOffset = 0.0;
    mCobraYOffset = 0.0;
    updateViewMatrixByMouse(true);
    updateProjMatrixHtml();
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

// function drawVideoCurFrame(gl, program, buffers, drawCount, isGodView) {
//     // Tell WebGL to use our program when drawing
//     gl.useProgram(program.program);

//     // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
//     {
//         const numComponents = 3;
//         const type = gl.FLOAT;
//         const normalize = false;
//         const stride = 0;
//         const offset = 0;
//         gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
//         gl.vertexAttribPointer(
//             program.attribLocations.vertexPosition,
//             numComponents,
//             type,
//             normalize,
//             stride,
//             offset);
//         gl.enableVertexAttribArray(
//             program.attribLocations.vertexPosition);
//     }

//     // Tell WebGL how to pull out the texture coordinates from the texture coordinate buffer into the textureCoord attribute.
//     {
//         const numComponents = 2;
//         const type = gl.FLOAT;
//         const normalize = false;
//         const stride = 0;
//         const offset = 0;
//         gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
//         gl.vertexAttribPointer(
//             program.attribLocations.textureCoord,
//             numComponents,
//             type,
//             normalize,
//             stride,
//             offset);
//         gl.enableVertexAttribArray(
//             program.attribLocations.textureCoord);
//     }

//     gl.activeTexture(gl.TEXTURE3);
//     gl.bindTexture(gl.TEXTURE_2D, mFrameBufferObject1.getTextureId());
//     gl.uniform1i(program.uniformLocations.uTexSamplerHandle, 3);

//     gl.activeTexture(gl.TEXTURE4);
//     gl.bindTexture(gl.TEXTURE_2D, !mNotFirstFrame ? mFrameBufferObject1.getTextureId() : mFrameBufferObject2.getTextureId());
//     gl.uniform1i(program.uniformLocations.uLastInputTexHandle, 4);

//     gl.activeTexture(gl.TEXTURE5);
//     gl.bindTexture(gl.TEXTURE_2D, mLutTexture);
//     gl.uniform1i(program.uniformLocations.uLookUpTableTexHandle, 5);

//     if (isGodView) {
//         gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mGodMvpMatrix);
//     } else {
//         gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mMvpMatrix);
//     }

//     gl.clear(gl.COLOR_BUFFER_BIT);
//     const drawOffset = 0;
//     gl.drawArrays(gl.TRIANGLE_STRIP, drawOffset, drawCount);

//     gl.disableVertexAttribArray(program.attribLocations.vertexPosition);
//     gl.disableVertexAttribArray(program.attribLocations.textureCoord);

//     // recover
//     gl.activeTexture(gl.TEXTURE3);
//     gl.bindTexture(gl.TEXTURE_2D, mFrameBufferObject1.getTextureId());
//     gl.activeTexture(gl.TEXTURE0);

//     gl.activeTexture(gl.TEXTURE4);
//     gl.bindTexture(gl.TEXTURE_2D, !mNotFirstFrame ? mFrameBufferObject1.getTextureId() : mFrameBufferObject2.getTextureId());
//     gl.activeTexture(gl.TEXTURE0);

//     gl.activeTexture(gl.TEXTURE5);
//     gl.bindTexture(gl.TEXTURE_2D, mLutTexture);
//     gl.activeTexture(gl.TEXTURE0);
// }

// function drawVideoToBuffer(gl, program, buffers, drawCount, isGodView) {
//     // Tell WebGL to use our program when drawing
//     gl.useProgram(program.program);

//     // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
//     {
//         const numComponents = 3;
//         const type = gl.FLOAT;
//         const normalize = false;
//         const stride = 0;
//         const offset = 0;
//         gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
//         gl.vertexAttribPointer(
//             program.attribLocations.vertexPosition,
//             numComponents,
//             type,
//             normalize,
//             stride,
//             offset);
//         gl.enableVertexAttribArray(
//             program.attribLocations.vertexPosition);
//     }

//     // Tell WebGL how to pull out the texture coordinates from the texture coordinate buffer into the textureCoord attribute.
//     {
//         const numComponents = 2;
//         const type = gl.FLOAT;
//         const normalize = false;
//         const stride = 0;
//         const offset = 0;
//         gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
//         gl.vertexAttribPointer(
//             program.attribLocations.textureCoord,
//             numComponents,
//             type,
//             normalize,
//             stride,
//             offset);
//         gl.enableVertexAttribArray(
//             program.attribLocations.textureCoord);
//     }

//     if (isGodView) {
//         gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mGodMvpMatrix);
//     } else {
//         gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mMvpMatrix);
//     }

//     gl.activeTexture(gl.TEXTURE3);
//     gl.bindTexture(gl.TEXTURE_2D, mFrameBufferObject3.getTextureId());
//     gl.uniform1i(program.uniformLocations.uTexSamplerHandle, 3);

//     gl.clear(gl.COLOR_BUFFER_BIT);
//     const drawOffset = 0;
//     gl.drawArrays(gl.TRIANGLE_STRIP, drawOffset, drawCount);

//     // recover
//     gl.activeTexture(gl.TEXTURE3);
//     gl.bindTexture(gl.TEXTURE_2D, mFrameBufferObject3.getTextureId());
//     gl.activeTexture(gl.TEXTURE0);
// }

function drawUVDemo(gl, program, buffers, texture, drawCount, deltaTime, isGodView) {
    // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            program.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            program.attribLocations.vertexPosition);
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
            program.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            program.attribLocations.textureCoord);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(program.program);

    // Specify the texture to map onto the faces.
    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // Bind the diffuseTexture to diffuseTexture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Tell the shader we bound the diffuseTexture to diffuseTexture unit 0
    gl.uniform1i(program.uniformLocations.uTexSamplerHandle, 0);

    if (isGodView) {
        gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mGodMvpMatrix);
    } else {
        gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mMvpMatrix);
    }

    const drawOffset = 0;
    gl.drawArrays(gl.TRIANGLE_STRIP, drawOffset, drawCount);
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

// share object's mvp
function drawObject(gl, pbrLightingProgram, shadowProgram, buffers, 
    diffuseTexture, 
    normalTexture, 
    metalnessTexture, 
    roughnessTexture,
    emissiveTexture,
    brdfLutTexture,
    diffuseEnvTexture,
    drawCount, deltaTime, isDrawShadow, isGodView) {
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

    if (isDrawShadow && null != shadowProgram) {    // draw shadow to texture
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
                shadowProgram.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                shadowProgram.attribLocations.vertexPosition);
        }

        gl.useProgram(shadowProgram.program);
        mat4.multiply(mMvpMatrixByLightCoord, mVpMatrixByLightCoord, mModelMatrix);
        
        gl.uniformMatrix4fv(shadowProgram.uniformLocations.uMVPMatrixHandle, false, mMvpMatrixByLightCoord);
    } else {
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
                pbrLightingProgram.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                pbrLightingProgram.attribLocations.vertexPosition);
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
                pbrLightingProgram.attribLocations.normalPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                pbrLightingProgram.attribLocations.normalPosition);
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
                pbrLightingProgram.attribLocations.textureCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                pbrLightingProgram.attribLocations.textureCoord);
        }

        // Tell WebGL which indices to use to index the vertices
        {
            // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
        }

        // Tell WebGL to use our pbrLightingProgram when drawing
        gl.useProgram(pbrLightingProgram.program);

        // Specify the diffuseTexture to map onto the faces.
        // Tell WebGL we want to affect diffuseTexture unit 0
        gl.activeTexture(gl.TEXTURE0);
        // Bind the diffuseTexture to diffuseTexture unit 0
        gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
        // Tell the shader we bound the diffuseTexture to diffuseTexture unit 0
        gl.uniform1i(pbrLightingProgram.uniformLocations.uBaseColorSamplerHandle, 0);

        // Tell the shader use normal mapping
        if (null != normalTexture) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, normalTexture);
            gl.uniform1i(pbrLightingProgram.uniformLocations.uNormalSamplerHandle, 1);
            gl.uniform1f(pbrLightingProgram.uniformLocations.uNormalScaleHandle, 1.0);
        }

        // if (null != mShadowFBO) {   // bind shadow texture
        //     gl.activeTexture(gl.TEXTURE2);
        //     gl.bindTexture(gl.TEXTURE_2D, mShadowFBO.getTextureId());
        //     gl.uniform1i(pbrLightingProgram.uniformLocations.uShadowSampler, 2);
        // }

        if (null != metalnessTexture) {
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, metalnessTexture);
            gl.uniform1i(pbrLightingProgram.uniformLocations.uMetallicSamplerHandle, 3);
            gl.uniform1f(pbrLightingProgram.uniformLocations.uMetallicValuesHandle, 0.8);
        }

        if (null != roughnessTexture) {
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, roughnessTexture);
            gl.uniform1i(pbrLightingProgram.uniformLocations.uRoughnessSamplerHandle, 4);
            gl.uniform1f(pbrLightingProgram.uniformLocations.uRoughnessValuesHandle, 0.2);
        }

        if (null != emissiveTexture) {
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, emissiveTexture);
            gl.uniform1i(pbrLightingProgram.uniformLocations.uEmissiveSamplerHandle, 5);
            gl.uniform3fv(pbrLightingProgram.uniformLocations.uEmissiveFactorHandle, DEFAULT_EMISSIVE_FACTOR); // vec3
        }

        if (null != brdfLutTexture) {
            gl.activeTexture(gl.TEXTURE6);
            gl.bindTexture(gl.TEXTURE_2D, brdfLutTexture);
            gl.uniform1i(pbrLightingProgram.uniformLocations.uBrdfLUTHandle, 6);
        }

        if (null != diffuseEnvTexture) {
            gl.activeTexture(gl.TEXTURE7);
            gl.bindTexture(gl.TEXTURE_2D, diffuseEnvTexture);
            gl.uniform1i(pbrLightingProgram.uniformLocations.uDiffuseEnvHandle, 7);
        }

        // Set the shader uniforms
        gl.uniformMatrix4fv(pbrLightingProgram.uniformLocations.uModelMatrixHandle, false, mModelMatrix);
        gl.uniformMatrix4fv(pbrLightingProgram.uniformLocations.uMITHandle, false, mMITMatrix);

        if (isGodView) {
            gl.uniformMatrix4fv(pbrLightingProgram.uniformLocations.uMVPMatrixHandle, false, mGodMvpMatrix);
            gl.uniformMatrix4fv(pbrLightingProgram.uniformLocations.uVIMatrixHandle, false, mGodVIMatrix); 
        } else {
            gl.uniformMatrix4fv(pbrLightingProgram.uniformLocations.uMVPMatrixHandle, false, mMvpMatrix);
            gl.uniformMatrix4fv(pbrLightingProgram.uniformLocations.uVIMatrixHandle, false, mVIMatrix); 
        }

        gl.uniform3fv(pbrLightingProgram.uniformLocations.uLightDirHandle, LIGHT_POSITION);    // TODO 
        gl.uniform3fv(pbrLightingProgram.uniformLocations.uLightColorHandle, LIGHT_COLOR);
        gl.uniform4fv(pbrLightingProgram.uniformLocations.uBaseColorFactorHandle, DEFAULT_BASECOLOR_FACTOR);
        gl.uniform4fv(pbrLightingProgram.uniformLocations.uScaleDiffBaseMRHandle, DEFAULT_SCALE_DIFF_BASE_MR);
        gl.uniform4fv(pbrLightingProgram.uniformLocations.uScaleFGDSpecHandle, DEFAULT_SCALE_FGD_SPEC);
        gl.uniform4fv(pbrLightingProgram.uniformLocations.uScaleIBLAmbientHandle, DEFAULT_SCALE_IBL_AMBIENT);
        gl.uniform3fv(pbrLightingProgram.uniformLocations.uCameraHandle, vec3.fromValues(0.0, 0.0, -5.0));
    }

    const drawOffset = 0;
    // const vertexCount = mIndices.length;
    const drawType = gl.UNSIGNED_SHORT;
    // gl.drawElements(gl.TRIANGLES, vertexCount, drawType, drawOffset);
    gl.drawArrays(gl.TRIANGLES, drawOffset, drawCount);
}

// Blinn-Phong 版本战机绘制 —— 与 drawObject 共享同一套模型矩阵逻辑，
// 但只用漫反射贴图 + Blinn-Phong 着色器，响应《基本光照》面板的滑块参数。
function drawObjectPhong(gl, phongProgram, buffers, diffuseTexture, isGodView) {
    // ── 和 drawObject 完全一致的模型矩阵 ──
    mModelMatrix = mat4.create();
    mat4.translate(mModelMatrix, mModelMatrix,
        [mTranslateX, mTranslateY, mTranslateZ]);

    mat4.rotate(mModelMatrix, mModelMatrix, mRolling,  [0, 0, 1]);
    mat4.rotate(mModelMatrix, mModelMatrix, mYawing,   [0, 1, 0]);
    mat4.rotate(mModelMatrix, mModelMatrix, mPitching, [1, 0, 0]);
    mat4.rotate(mModelMatrix, mModelMatrix, mRotAngle, mRotAxis);
    mat4.scale(mModelMatrix, mModelMatrix, [mScaleX, mScaleY, mScaleZ]);

    mat4.copy(mMITMatrix, mModelMatrix);
    mat4.invert(mMITMatrix, mMITMatrix);
    mat4.transpose(mMITMatrix, mMITMatrix);

    // ── 绑定顶点属性 ──
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(phongProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(phongProgram.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(phongProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(phongProgram.attribLocations.normalPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
    gl.vertexAttribPointer(phongProgram.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(phongProgram.attribLocations.textureCoord);

    // ── 着色器 + 贴图 ──
    gl.useProgram(phongProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(phongProgram.uniformLocations.uDiffuseSampler, 0);

    // ── 矩阵 ──
    if (isGodView) {
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uModelMatrix,  false, mModelMatrix);
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uViewMatrix,  false, mGodViewMatrix);
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uProjectionMatrix, false, mGodProjectionMatrix);
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uMITMatrix,  false, mMITMatrix);
        // 从 GodVI 取相机位置
        gl.uniform3fv(phongProgram.uniformLocations.uViewPos, [mGodVIMatrix[12], mGodVIMatrix[13], mGodVIMatrix[14]]);
    } else {
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uModelMatrix,  false, mModelMatrix);
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uViewMatrix,  false, mViewMatrix);
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uProjectionMatrix, false, mProjectionMatrix);
        gl.uniformMatrix4fv(phongProgram.uniformLocations.uMITMatrix,  false, mMITMatrix);
        gl.uniform3fv(phongProgram.uniformLocations.uViewPos, [mVIMatrix[12], mVIMatrix[13], mVIMatrix[14]]);
    }

    // ── 光照参数 ──
    gl.uniform4fv(phongProgram.uniformLocations.uKa, mAmbientColor);
    gl.uniform4fv(phongProgram.uniformLocations.uKd, mDiffuseColor);
    gl.uniform4fv(phongProgram.uniformLocations.uKs, mSpecularColor);
    gl.uniform1f(phongProgram.uniformLocations.uShininess, mSpecularShininess);
    gl.uniform3fv(phongProgram.uniformLocations.uLightPos, LIGHT_POSITION);
    gl.uniform1f(phongProgram.uniformLocations.uEnableAmbient,  mUseAmbientColor  ? 1.0 : 0.0);
    gl.uniform1f(phongProgram.uniformLocations.uEnableDiffuse,  mUseDiffuseColor  ? 1.0 : 0.0);
    gl.uniform1f(phongProgram.uniformLocations.uEnableSpecular, mUseSpecularColor ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, buffers.drawCnt);
}

function drawScene(gl, basicProgram, basicTexProgram, diffuseLightingProgram, now, deltaTime) {
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

    if (App.Shadow.getFBO() && mNeedDrawShadow) {
        App.Shadow.getFBO().bind();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, DEFAULT_RTT_RESOLUTION, DEFAULT_RTT_RESOLUTION);

        if (mNeedDrawFighter && mObjectBuffer.length > 0) {
            for (var i = 0; i < mObjectBuffer.length; i++) {
                drawObject(gl, mPBRLightProgram, App.Shadow.getProgram(), mObjectBuffer[i], mObjectDiffuseTexture,
                    mObjectNormalTexture, mObjectMetalnessTexture, mObjectRoughnessTexture, mObjectEmissiveTexture,
                    mBrdfLutTexture, mBackgroundTexture, mObjectBuffer[i].drawCnt, deltaTime, true, false);
            }
        }

        App.Shadow.getFBO().unbind();
    }

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, mViewportWidth, mViewportHeight);

    // draw background
    if (mNeedDrawBackground) {
        if (mNeedDrawCobraAnim) {
            var animProgress = mCobraAnimFrameEllapse / (COBRA_STEP1_FRAME_CNT + FALLING_LEAF1_FRAME_CNT + FALLING_LEAF2_FRAME_CNT 
                + FALLING_LEAF3_FRAME_CNT + FALLING_LEAF4_FRAME_CNT + COBRA_STEP2_FRAME_CNT);
            updateBackgroundUv(animProgress);
            mBackgroundBuffer = updateBackgroundBuffer(gl);
        }
        drawBackground(gl, mBackgroundProgram, mBackgroundBuffer, mBackgroundTexture, mBackgroundBuffer.drawCnt, deltaTime);
    }

    if (mNeedDrawSkyBox)
        App.SkyBox.draw(gl, false);

    if (mNeedDrawFighter && mObjectBuffer.length > 0) {
        for (var i = 0; i < mObjectBuffer.length; i++) {
            if (mUsePhongForFighter) {
                drawObjectPhong(gl, mPhongLightProgram, mObjectBuffer[i], mObjectDiffuseTexture, false);
            } else {
                drawObject(gl, mPBRLightProgram, App.Shadow.getProgram(), mObjectBuffer[i], mObjectDiffuseTexture,
                    mObjectNormalTexture, mObjectMetalnessTexture, mObjectRoughnessTexture, mObjectEmissiveTexture,
                    mBrdfLutTexture, mBackgroundTexture, mObjectBuffer[i].drawCnt, deltaTime, false, false);
            }
        }
    }
    // draw terrain
    if (mNeedDrawTerrain) {
        App.Terrain.draw(gl, deltaTime, false, false);
    }
    if (mNeedDrawSphere) {
        App.Sphere.draw(gl, deltaTime, false);
    }
    if (mNeedDrawBlendSort) {
        App.BlendSort.draw(gl, false);
    }
    if (mNeedDrawMipmap) {
        App.Mipmap.draw(gl, false);
    }
    if (mNeedDrawFresnel) {
        App.Fresnel.draw(gl, false);
    }
    if (mNeedDrawLensFlare)
        App.LensFlare.draw(gl);
    updateAnimQuatHtmlValue();
    mCobraAnimFrameEllapse++;

    // draw assist object use 
    mMvpMatrix = mat4.create();
    mat4.multiply(mMvpMatrix, mModelMatrix, mMvpMatrix);
    mat4.multiply(mMvpMatrix, mViewMatrix, mMvpMatrix);
    mat4.multiply(mMvpMatrix, mProjectionMatrix, mMvpMatrix);

    mGodMvpMatrix = mat4.create();
    mat4.multiply(mGodMvpMatrix, mModelMatrix, mGodMvpMatrix);
    mat4.multiply(mGodMvpMatrix, mGodViewMatrix, mGodMvpMatrix);
    mat4.multiply(mGodMvpMatrix, mGodProjectionMatrix, mGodMvpMatrix);

    // draw uv demo
    if (mNeedDrawUVDemoPlane) {
        drawUVDemo(gl, basicTexProgram, mUVDemoPlaneBuffer, mTerrainTexture, mUVDemoPlaneBuffer.drawCnt, deltaTime);
        drawUVDemo(gl, basicTexProgram, mUVDemoAssistPlaneBuffer, mTerrainTexture, mUVDemoAssistPlaneBuffer.drawCnt, deltaTime);
        drawArrays(gl, basicProgram, mUVDemoAssistUVAxisBuffer, mUVDemoAssistUVAxisVertices.length / 3, mMvpMatrix, gl.LINES, deltaTime);
        drawArrays(gl, basicProgram, mUVDemoAssistCubeBuffer, mUVDemoAssistCubeVertices.length / 3, mMvpMatrix, gl.LINE_LOOP, deltaTime);
    }

    // draw yuv video
    if (mNeedDrawYUVVideo) {
        App.Video.draw(gl, now, deltaTime, false);
    }
    
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
    if (mNeedDrawFighter && mObjectBuffer.length > 0) {
        for (var i = 0; i < mObjectBuffer.length; i++) {
            if (mUsePhongForFighter) {
                drawObjectPhong(gl, mPhongLightProgram, mObjectBuffer[i], mObjectDiffuseTexture, true);
            } else {
                drawObject(gl, mPBRLightProgram, App.Shadow.getProgram(), mObjectBuffer[i], mObjectDiffuseTexture,
                    mObjectNormalTexture, mObjectMetalnessTexture, mObjectRoughnessTexture, mObjectEmissiveTexture,
                    mBrdfLutTexture, mBackgroundTexture, mObjectBuffer[i].drawCnt, deltaTime, false, true);
            }
        }
    }
    if (mNeedDrawSkyBox)
        App.SkyBox.draw(gl, true);
    // draw terrain
    if (mNeedDrawTerrain) {
        App.Terrain.draw(gl, deltaTime, false, true);
    }
    // draw uv demo
    if (mNeedDrawUVDemoPlane) {
        drawUVDemo(gl, basicTexProgram, mUVDemoPlaneBuffer, mTerrainTexture, mUVDemoPlaneBuffer.drawCnt, deltaTime, true);
    }
    // draw yuv video
    if (mNeedDrawYUVVideo) {
        App.Video.draw(gl, now, deltaTime, true);
    }
    if (mNeedDrawSphere) {
        App.Sphere.draw(gl, deltaTime, true);
    }
    if (mNeedDrawBlendSort) {
        App.BlendSort.draw(gl, true);
    }
    if (mNeedDrawMipmap) {
        App.Mipmap.draw(gl, true);
    }
    if (mNeedDrawFresnel) {
        App.Fresnel.draw(gl, true);
    }
    drawArrays(gl, basicProgram, mAxisBuffer, mAxisVertices.length / 3, mGodViewProjectMatrix, gl.LINES, deltaTime);
    if (null != mViewFrustumBuffer) {
        drawArrays(gl, basicProgram, mViewFrustumBuffer, mViewFrustumVertices.length / 3, mViewFrustumMvpMatrix, gl.LINES, deltaTime);
    }
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

    updateHtmlParamByRender();

    if (mNeedDrawCobraAnim) {
        requestRender();
    }
}

function updateModelMatrixByInput() {
    mTranslateX = document.getElementById("id_m03").value;
    mTranslateY = document.getElementById("id_m13").value;
    mTranslateZ = document.getElementById("id_m23").value;

    requestRender();
}

function updateEulerAngleByInput() {
    mPitching = document.getElementById("id_pitch").value * DEGREE_TO_RADIUS;
    mYawing = document.getElementById("id_yaw").value * DEGREE_TO_RADIUS;
    mRolling = document.getElementById("id_roll").value * DEGREE_TO_RADIUS;

    requestRender();
}

function updateEulerAngleByInputEular() {
    mPitching = document.getElementById("id_pitch_eular").value * DEGREE_TO_RADIUS;
    mYawing = document.getElementById("id_yaw_eular").value * DEGREE_TO_RADIUS;
    mRolling = document.getElementById("id_roll_eular").value * DEGREE_TO_RADIUS;

    requestRender();
}

function updateTranslateByInput() {
    mTranslateX = document.getElementById("id_translate_x").value;
    mTranslateY = document.getElementById("id_translate_y").value;
    mTranslateZ = document.getElementById("id_translate_z").value;

    requestRender();
}

function updateScaleByInput() {
    mScaleX = document.getElementById("id_scale_x").value;
    mScaleY = document.getElementById("id_scale_y").value;
    mScaleZ = document.getElementById("id_scale_z").value;

    requestRender();
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

function updateViewMatrixByMouse(isResume) {
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
    updateViewFrustumPose(isResume);
    
    requestRender();
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

    requestRender();
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

    requestRender();
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
    updateViewFrustum();
    updateNearPlane();
    updateFarPlane();

    updateProjMatrixHtml();

    requestRender();
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

function worldToScreen(pos, modelViewMatrix, projectionMatrix) {
    // pos: [x, y, z]
    let v = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
    vec4.transformMat4(v, v, modelViewMatrix);
    vec4.transformMat4(v, v, projectionMatrix);
    v[0] /= v[3];
    v[1] /= v[3];
    // 转换到像素坐标
    return [
        (v[0] * 0.5 + 0.5) * mViewportWidth,
        (1.0 - (v[1] * 0.5 + 0.5)) * mViewportHeight
    ];
}

function worldToScreenNDC(pos, modelViewMatrix, projectionMatrix) {
    // pos: [x, y, z]
    let v = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
    vec4.transformMat4(v, v, modelViewMatrix);
    vec4.transformMat4(v, v, projectionMatrix);
    v[0] /= v[3];
    v[1] /= v[3];
    // 转换到像素坐标
    return [
        (v[0] * 0.5 + 0.5),
        (1.0 - (v[1] * 0.5 + 0.5))
    ];
}

function directionToScreenEdge(lightDir, viewMatrix, projMatrix) {
    // 1. 创建足够远的虚拟光源位置（确保在视锥体外）
    const farDistance = 1000;
    const virtualLightPos = [
        -lightDir[0] * farDistance,
        -lightDir[1] * farDistance, 
        -lightDir[2] * farDistance
    ];
    
    // 2. 投影到屏幕空间
    const ndc = worldToScreenNDC(virtualLightPos, viewMatrix, projMatrix);
    
    // 3. 将NDC坐标缩放到屏幕边缘
    const maxComponent = Math.max(Math.abs(ndc[0]), Math.abs(ndc[1]));
    const scale = 1.0 / maxComponent * 0.9; // 0.9确保在边缘内
    
    return [ndc[0] * scale, ndc[1] * scale];
}

