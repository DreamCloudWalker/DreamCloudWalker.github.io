var App = App || {};

// ═══════════════════════════════════════════════════════════════════════
// 《空战模拟》Demo（作品）
// 飞机始终向前飞行；键盘控制姿态：
//   A/D = 向左/向右桶滚(roll)   W/S = 俯仰(pitch)   Q/E = 偏航(yaw，转速较慢)
// 相机第三人称跟在飞机背后；右窗口(上帝视角)也用第三人称相机，飞机始终在画面中央。
// 撞到地形 → 播放精灵图集爆炸动画 + 提示坠毁，1 秒后重生。
//
// 姿态用四元数维护(避免欧拉角万向节锁)，每帧绕机体轴施加角速度。飞机的最终朝向通过
// 把"四元数 → 轴角"写入全局 mRotAxis/mRotAngle 经既有 drawObject 路径渲染(无需改 drawObject)。
// 相机/投影矩阵每帧被本模块覆盖，切走 demo 时由 learnOpenGLES 的 resumeMVPMatrix 复位。
// ═══════════════════════════════════════════════════════════════════════
App.AirCombat = (function () {
    // ── 飞行状态 ──
    var _pos = vec3.create();        // 飞机世界位置（未缩放地形坐标系，与相机平移同一空间）
    var _orient = quat.create();     // 飞机朝向四元数
    var _speed = 30.0;               // 前进速度（单位/秒）
    var _boost = false;              // 按住 Shift 加速
    var BOOST_MULT = 2.5;            // 加速倍率
    var _alive = true;
    var _crashT = 0;                 // 坠毁后计时（秒）
    var RESPAWN_DELAY = 1.0;         // 坠毁后重生延迟
    var _started = false;

    // 角速度（弧度/秒）
    var ROLL_RATE  = 1.8;
    var PITCH_RATE = 1.2;
    var YAW_RATE   = 0.5;            // 偏航较慢

    // 相机第三人称参数（机体坐标系：飞机前方 -Z，上方 +Y）
    var CAM_BACK = 9.0;              // 相机在飞机后方距离
    var CAM_UP   = 2.5;              // 相机在飞机上方高度
    var GOD_BACK = 26.0;             // 上帝视角更远
    var GOD_UP   = 12.0;

    // 地形相对平缓（200 宽的 chunk、起伏仅 ±3.7），飞机(机长约2)放大到 3 倍更醒目，
    // 起飞高度压低到 ~12，让平缓丘陵也能构成"撞地"威胁，俯冲一会就能撞上。
    var PLANE_SCALE = 3.0;           // 飞机模型缩放
    var START_Y = 12.0;              // 初始飞行高度（未缩放地形坐标）

    // 机体局部轴（模型空间）：约定模型机头朝 -Z、上方 +Y、右翼 +X
    var FWD_LOCAL   = vec3.fromValues(0, 0, -1);
    var UP_LOCAL    = vec3.fromValues(0, 1, 0);
    var RIGHT_LOCAL = vec3.fromValues(1, 0, 0);

    var _keys = {};   // 当前按住的控制键

    // 把局部向量按当前朝向旋转到世界
    function _rotByOrient(out, local) {
        vec3.transformQuat(out, local, _orient);
        return out;
    }

    // 绕机体某个【世界】轴增量旋转飞机：dq = quat(axis, angle)，左乘到 _orient
    function _applyBodyRotation(worldAxis, angle) {
        var dq = quat.create();
        quat.setAxisAngle(dq, worldAxis, angle);
        quat.multiply(_orient, dq, _orient);
        quat.normalize(_orient, _orient);
    }

    function _reset() {
        vec3.set(_pos, 0, START_Y, 0);
        quat.identity(_orient);
        _alive = true;
        _crashT = 0;
        _boost = false;
    }

    // 每帧推进飞行（dt 秒）。返回当前飞机世界位置供相机/地形流式用。
    function _update(gl, dt) {
        dt = Math.min(dt || 0.016, 0.05);

        if (!_alive) {
            // 坠毁：累计时间，到点重生
            _crashT += dt;
            if (_crashT >= RESPAWN_DELAY) {
                _reset();
                _hideCrashTip();
            }
            return;
        }

        // ── 姿态控制：绕机体当前世界轴施加角速度 ──
        var fwd = _rotByOrient(vec3.create(), FWD_LOCAL);
        var up = _rotByOrient(vec3.create(), UP_LOCAL);
        var right = _rotByOrient(vec3.create(), RIGHT_LOCAL);

        // A/D 桶滚（绕机头前向轴）。A=左滚、D=右滚
        if (_keys['a']) _applyBodyRotation(fwd, -ROLL_RATE * dt);
        if (_keys['d']) _applyBodyRotation(fwd,  ROLL_RATE * dt);
        // W/S 俯仰（绕右翼轴）。W=机头下压(俯冲)、S=机头上拉(爬升)
        if (_keys['w']) _applyBodyRotation(right, -PITCH_RATE * dt);
        if (_keys['s']) _applyBodyRotation(right,  PITCH_RATE * dt);
        // Q/E 偏航（绕机体上轴，较慢）
        if (_keys['q']) _applyBodyRotation(up,  YAW_RATE * dt);
        if (_keys['e']) _applyBodyRotation(up, -YAW_RATE * dt);

        // ── 始终向前飞（按住 Shift 加速）──
        var spd = _boost ? _speed * BOOST_MULT : _speed;
        vec3.scaleAndAdd(_pos, _pos, fwd, spd * dt);

        // ── 撞地检测：飞机世界高度 vs 地形高度（都用未缩放坐标）──
        // 地形渲染时整体乘了 worldScale，这里把渲染高度换算回未缩放空间比较。
        var ws = App.InfiniteTerrain.getWorldScale() || 1.0;
        var groundRender = App.InfiniteTerrain.getHeight(_pos[0], _pos[2]); // 已是渲染空间高度
        var groundWorld = groundRender / ws;
        if (_pos[1] <= groundWorld + 1.5) {
            _crash();
        }

        // 流式地形跟随飞机
        App.InfiniteTerrain.updateLOD(gl, _pos[0], _pos[2]);
    }

    function _crash() {
        if (!_alive) return;
        _alive = false;
        _crashT = 0;
        // 播放爆炸：让精灵图集从第 0 帧开始播
        if (App.SpriteSheet) {
            App.SpriteSheet.setFps(30);
            App.SpriteSheet.setPlaying(true);
            App.SpriteSheet.setFrame(0);
        }
        _showCrashTip();
    }

    function _showCrashTip() {
        var el = document.getElementById('id_aircombat_tip');
        if (el) { el.innerHTML = '飞机已坠毁！1 秒后重新开始…'; el.style.display = 'block'; }
    }
    function _hideCrashTip() {
        var el = document.getElementById('id_aircombat_tip');
        if (el) el.style.display = 'none';
    }

    // 把飞机朝向写进全局 mRotAxis/mRotAngle（drawObject 用 mat4.rotate(model, mRotAngle, mRotAxis)），
    // 位置写进 mTranslateX/Y/Z。其余欧拉旋转项清零，避免叠加干扰。
    function _syncPlaneToGlobals() {
        // 四元数 → 轴角
        var axis = vec3.create();
        var angle = _quatToAxisAngle(_orient, axis);
        mRotAxis = axis;
        mRotAngle = angle;
        mRolling = 0; mYawing = 0; mPitching = 0;
        // 渲染空间位置 = 未缩放飞行坐标（飞机不随地形 worldScale 缩放，这里 1:1）
        mTranslateX = _pos[0];
        mTranslateY = _pos[1];
        mTranslateZ = _pos[2];
        mScaleX = PLANE_SCALE; mScaleY = PLANE_SCALE; mScaleZ = PLANE_SCALE;
    }

    function _quatToAxisAngle(q, axisOut) {
        // 归一化保证 w∈[-1,1]
        var nq = quat.create(); quat.normalize(nq, q);
        var w = Math.max(-1, Math.min(1, nq[3]));
        var angle = 2 * Math.acos(w);
        var s = Math.sqrt(1 - w * w);
        if (s < 1e-5) { vec3.set(axisOut, 1, 0, 0); return 0; }
        vec3.set(axisOut, nq[0] / s, nq[1] / s, nq[2] / s);
        return angle;
    }

    // 第三人称相机：机位 = 飞机后上方，看向飞机前方一点。写入全局视图/投影矩阵。
    function _updateCameras() {
        var fwd = _rotByOrient(vec3.create(), FWD_LOCAL);
        var up = _rotByOrient(vec3.create(), UP_LOCAL);

        // 主视口相机
        var eye = vec3.create();
        vec3.scaleAndAdd(eye, _pos, fwd, -CAM_BACK);   // 后方
        vec3.scaleAndAdd(eye, eye, up, CAM_UP);        // 上方
        var center = vec3.create();
        vec3.scaleAndAdd(center, _pos, fwd, 10.0);     // 看向飞机前方一点
        mat4.lookAt(mViewMatrix, eye, center, up);
        mat4.copy(mVIMatrix, mViewMatrix);
        mat4.invert(mVIMatrix, mVIMatrix);

        // 上帝视角相机：稳定的第三人称跟拍。机位在飞机正后方+上方，看向飞机；
        // 用【世界上方】做相机 up（而非随飞机滚转的机体 up），这样地平线稳定、
        // 飞机的机头朝向(飞行方向)在画面里清晰可辨——即"看向相机指向(飞行方向)"。
        // fwdFlat：飞机前向在水平面的投影（去掉俯仰/滚转分量），保证跟拍方向=飞行方向。
        var fwdFlat = vec3.fromValues(fwd[0], 0, fwd[2]);
        if (vec3.length(fwdFlat) < 1e-4) vec3.set(fwdFlat, 0, 0, -1); // 垂直飞行时兜底
        vec3.normalize(fwdFlat, fwdFlat);
        var worldUp = vec3.fromValues(0, 1, 0);
        var godEye = vec3.create();
        vec3.scaleAndAdd(godEye, _pos, fwdFlat, -GOD_BACK);   // 飞行方向的正后方
        godEye[1] += GOD_UP;                                  // 抬高
        mat4.lookAt(mGodViewMatrix, godEye, _pos, worldUp);
        mat4.copy(mGodVIMatrix, mGodViewMatrix);
        mat4.invert(mGodVIMatrix, mGodVIMatrix);
    }

    // 爆炸 billboard 在飞机坠毁位置绘制，由 learnOpenGLES 主循环通过 SpriteSheet.drawAt 完成。

    return {
        // 进入 demo：复位飞行状态、初始化地形流式（投影远裁剪面由 learnOpenGLES 设置）
        enter: function (gl) {
            _reset();
            _started = true;
            _keys = {};
            _hideCrashTip();
            App.InfiniteTerrain.setWorldScale(1.0);   // 飞机与地形 1:1 同一世界尺度
            App.InfiniteTerrain.setGroundY(0.0);
            // 空战要自然实体地形，不要 LOD demo 的线框/分级染色，也不要散布的球柱锥
            if (App.InfiniteTerrain.setLODWireframe) App.InfiniteTerrain.setLODWireframe(false);
            if (App.InfiniteTerrain.setLODColorByLevel) App.InfiniteTerrain.setLODColorByLevel(false);
            if (App.InfiniteTerrain.setLODShowShapes) App.InfiniteTerrain.setLODShowShapes(false);
            // 加大加载半径，让地形一直铺到远裁剪面(1000)处的地平线，远处不至于"空"
            if (App.InfiniteTerrain.setLODRadius) App.InfiniteTerrain.setLODRadius(6);
            App.InfiniteTerrain.initLOD(gl);
            App.InfiniteTerrain.updateLOD(gl, _pos[0], _pos[2]);
        },
        // 每帧：推进飞行 + 写全局飞机变换 + 覆盖相机矩阵
        update: function (gl, dt) {
            if (!_started) return;
            _update(gl, dt);
            _syncPlaneToGlobals();
            _updateCameras();
        },
        // 键盘：返回 true 表示本键被空战 demo 消费（拦截全局 WASD 平移）
        onKey: function (k, down) {
            if (k === 'shift') { _boost = down; return true; }
            if (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === 'q' || k === 'e') {
                if (down) _keys[k] = true; else delete _keys[k];
                return true;
            }
            return false;
        },
        isStarted: function () { return _started; },
        isPlaneVisible: function () { return _alive; },   // 坠毁时藏飞机露爆炸
        isAlive: function () { return _alive; },
        getCrashPos: function () { return _pos; },        // 爆炸 billboard 世界中心
        leave: function () { _started = false; _keys = {}; _boost = false; _hideCrashTip(); },
    };
})();
