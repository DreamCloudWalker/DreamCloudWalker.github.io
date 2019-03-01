var mStats;
var mRenderer;
var mCamera;
var mScene;
var mTrackballControls
var mAmbientLight;
var mDirectionalLight;
var mCube;
var mSwitchBoard;
var mMeshGrid;

function initThree() {
    width = document.getElementById('canvas-frame').clientWidth;
    height = document.getElementById('canvas-frame').clientHeight;
    mRenderer = new THREE.WebGLRenderer({
        antialias : true
    });
    mRenderer.setSize(width, height);
    document.getElementById('canvas-frame').appendChild(mRenderer.domElement);
    mRenderer.setClearColor(0xFFFFFF, 1.0);

    mStats = new Stats();
    mStats.domElement.style.position = 'absolute';
    mStats.domElement.style.left = '5px';
    mStats.domElement.style.top = '5px';
    document.getElementById('canvas-frame').appendChild(mStats.domElement);

    // onSurfaceChanged
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    mCamera.aspect = window.innerWidth / window.innerHeight;
    mCamera.updateProjectionMatrix();
    mRenderer.setSize(window.innerWidth, window.innerHeight);
}

function initCamera() {
    mCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    mCamera.position.x = 5;
    mCamera.position.y = 5;
    mCamera.position.z = 5;
    mCamera.up.x = 0;
    mCamera.up.y = 1;
    mCamera.up.z = 0;
    mCamera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));
}

function initScene() {
    mScene = new THREE.Scene();

    var axis = new THREE.AxisHelper(20);
    mScene.add(axis);

    // 创建控件并绑定在相机上
    mTrackballControls = new THREE.TrackballControls(mCamera);
    mTrackballControls.rotateSpeed = 1.0;
    mTrackballControls.zoomSpeed = 1.0;
    mTrackballControls.panSpeed = 1.0;
    mTrackballControls.noZoom=false;
    mTrackballControls.noPan=false;
    mTrackballControls.staticMoving = true;
    mTrackballControls.dynamicDampingFactor = 0.3;
}

function initLight() {
    mAmbientLight = new THREE.AmbientLight(0x333333);
    mScene.add(mAmbientLight);
    mDirectionalLight = new THREE.DirectionalLight();
    mDirectionalLight.position.set(100, 100, 100);
    mScene.add(mDirectionalLight);
}

function initObject() {
    var onProgress = function(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% loading');
        }
    };
    var onError = function(error) {
        console.log('load error!' + error.getWebGLErrorMessage());
    };

    mMeshGrid = new THREE.Geometry();
    mMeshGrid.vertices.push(new THREE.Vector3(-5, 0, 0));
    mMeshGrid.vertices.push(new THREE.Vector3( 5, 0, 0));
    for (var i = 0; i <= 20; i ++) {
        var line = new THREE.Line(mMeshGrid, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2}));
        line.position.z = (i * 1) - 5;
        mScene.add(line);

        var line = new THREE.Line(mMeshGrid, new THREE.LineBasicMaterial({color: 0x000000, opacity: 0.2}));
        line.position.x = (i * 1) - 5;
        line.rotation.y = 90 * Math.PI / 180;
        mScene.add(line);
    }

    // cube and texture
    var geometry = new THREE.CubeGeometry(1, 1, 1);
    var texture = THREE.ImageUtils.loadTexture("texture/spider.png",null,function(t){});
    var material = new THREE.MeshLambertMaterial({map:texture});
    // var material = new THREE.MeshLambertMaterial({color: 0x00ff00});
    mCube = new THREE.Mesh(geometry, material);
    mCube.position.z = 4;
    mScene.add(mCube);

    // obj loader
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('texture/');
    mtlLoader.load('SU-30.mtl', function(material) {
        material.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(material);
        objLoader.setPath('model/');
        objLoader.load('SU-30.obj', function(object) {
            mSwitchBoard = object;
            mSwitchBoard.rotation.y = 2.0;
            mSwitchBoard.scale.set(0.005, 0.005, 0.005);
            mScene.add(mSwitchBoard);
        }, onProgress, onError);
    });

    // gltf loader
    var gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load('model/bull_thumb.glb', function(obj) {
        console.log(obj);
        obj.scene.position.z = 3;
        mScene.add(obj.scene);
    }, onProgress, onError);

    // fbx loader
    var fbxLoader = new THREE.FBXLoader();
    fbxLoader.load('model/fbx/zombienurse_Rig.FBX', function(obj) {
        object.mixer = new THREE.AnimationMixer(object);
        mixers.push(object.mixer);

        var action = object.mixer.clipAction(object.animations[0]);
        action.play();

        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );

        object.scale.set(15.0, 15.0, 15.0);
        object.position.z = 3;
        mScene.add(object);
    });
}

function render() {
    var clock = new THREE.Clock();
    var delta = clock.getDelta();
    mTrackballControls.update(delta);

    mRenderer.clear();
    mRenderer.render(mScene, mCamera);

    mCube.rotation.x += 0.01;
    mCube.rotation.y += 0.01;
    if (null != mSwitchBoard) {
        mSwitchBoard.rotation.y += 0.01;
    }

    mStats.update();

    requestAnimationFrame(render);
}

function main() {
    initThree();
    initCamera();
    initScene();
    initLight();
    initObject();
    render();
}