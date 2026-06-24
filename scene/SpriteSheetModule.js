var App = App || {};

// 精灵图集（Sprite Sheet / 序列帧动画）demo
// 把一张 explosion.png 大图（8 列 × 5 行 = 40 帧）当成一段动画：
// 每帧都是同一张纹理上的一小块矩形，靠不断切换采样的 UV 子区域，
// 在一个正对相机的四边形上"翻页"播放出爆炸动画。
//
// 教学点：
//   1. 一张图 = 多帧，省去逐帧切换纹理 / 多次 IO 的开销；
//   2. 帧 → UV 子矩形的换算（uUvOffset + vTexCoord * uUvScale）；
//   3. 用真实时间驱动帧率（fps），与渲染帧率解耦。
App.SpriteSheet = (function () {
    var _program = null;
    var _quadBuffer = null;
    var _texture = null;

    // 图集布局：explosion.png 为 1000×625，8 列 × 5 行，每帧 125×125。
    var COLS = 8;
    var ROWS = 5;
    var FRAME_COUNT = COLS * ROWS;   // 40 帧

    var _playing = true;
    var _fps = 20;                   // 动画播放速度（帧/秒）
    var _curFrame = 0;               // 当前帧索引 0..39
    var _accum = 0;                  // 帧时间累加器（秒）
    var _lastT = 0;                  // 上一次更新的时间戳（ms）

    function _initShader(gl) {
        var vsSource = `
            attribute vec4 aPosition;
            attribute vec2 aTexCoord;
            uniform mat4 uMVPMatrix;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = uMVPMatrix * aPosition;
                vTexCoord = aTexCoord;
            }
        `;
        // 关键：把基准 UV(0..1) 映射到当前帧所在的子矩形。
        var fsSource = `
            precision mediump float;
            uniform sampler2D uTexSampler;
            uniform vec2 uUvOffset;   // 当前帧左上角在图集中的 UV
            uniform vec2 uUvScale;    // 单帧占整张图的 UV 尺寸 (1/COLS, 1/ROWS)
            varying vec2 vTexCoord;
            void main() {
                vec2 uv = uUvOffset + vTexCoord * uUvScale;
                gl_FragColor = texture2D(uTexSampler, uv);
            }
        `;
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('SpriteSheet shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                textureCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
            },
            uniformLocations: {
                uMVPMatrix: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
                uTexSampler: gl.getUniformLocation(shaderProgram, 'uTexSampler'),
                uUvOffset: gl.getUniformLocation(shaderProgram, 'uUvOffset'),
                uUvScale: gl.getUniformLocation(shaderProgram, 'uUvScale'),
            },
        };
    }

    // 正对相机的正方形四边形（帧为 125×125 正方形）。
    // 基准 UV 取 0..1，片元里再缩放/平移到具体帧；UV 原点在左上（v=0 为顶部）。
    function _initBuffer(gl) {
        var h = 1.3;
        var positions = [
            -h,  h, 0.0,   // 左上
            -h, -h, 0.0,   // 左下
             h,  h, 0.0,   // 右上
             h, -h, 0.0,   // 右下
        ];
        var uvs = [
            0, 0,
            0, 1,
            1, 0,
            1, 1,
        ];
        var indices = [0, 1, 2, 2, 1, 3];

        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            uv: uvBuffer,
            index: indexBuffer,
            indexCount: indices.length,
        };
    }

    // 自带纹理加载：精灵图集不翻转 Y（让 v=0 对应图顶部），
    // 不预乘 alpha，CLAMP_TO_EDGE 防止相邻帧渗色。
    function _loadTexture(gl, url, callback) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 0]));
        var image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            if (callback) callback();
        };
        image.src = url;
        return tex;
    }

    // 用真实时间推进帧（与渲染帧率解耦）。每渲染一帧只调用一次。
    function _update() {
        var now = Date.now();
        if (_lastT === 0) _lastT = now;
        var dt = (now - _lastT) / 1000.0;
        _lastT = now;
        if (!_playing || _fps <= 0) return;
        _accum += dt;
        var spf = 1.0 / _fps;     // 每帧应停留的秒数
        while (_accum >= spf) {
            _accum -= spf;
            _curFrame = (_curFrame + 1) % FRAME_COUNT;
        }
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;

        // 帧推进只在主视口那一次调用里做，避免一帧被推进两次（主视口 + 上帝视角）
        if (!isGodView) _update();

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;

        gl.useProgram(programInfo.program);

        // 半透明叠加在背景上：标准 alpha 混合 + 关闭深度写入
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.uv);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        // 模型矩阵：应用拖拽旋转，可从不同角度观察这块"贴片"
        var model = mat4.create();
        mat4.rotate(model, model, mRolling, [0, 0, 1]);
        mat4.rotate(model, model, mYawing, [0, 1, 0]);
        mat4.rotate(model, model, mPitching, [1, 0, 0]);
        var mvp = mat4.create();
        mat4.multiply(mvp, projMatrix, viewMatrix);
        mat4.multiply(mvp, mvp, model);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uMVPMatrix, false, mvp);

        // 当前帧 → UV 子矩形
        var col = _curFrame % COLS;
        var row = Math.floor(_curFrame / COLS);
        gl.uniform2f(programInfo.uniformLocations.uUvScale, 1.0 / COLS, 1.0 / ROWS);
        gl.uniform2f(programInfo.uniformLocations.uUvOffset, col / COLS, row / ROWS);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _texture);
        gl.uniform1i(programInfo.uniformLocations.uTexSampler, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.index);
        gl.drawElements(gl.TRIANGLES, buffer.indexCount, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    return {
        init: function (gl, requestRenderCb) {
            _program = _initShader(gl);
            _quadBuffer = _initBuffer(gl);
            _texture = _loadTexture(gl, './texture/explosion.png', requestRenderCb);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _quadBuffer, isGodView);
        },
        setPlaying: function (v) {
            _playing = v;
            _lastT = 0;   // 重新计时，避免暂停期间累积出大 dt
        },
        setFps: function (v) { _fps = v; },
        setFrame: function (i) {
            _curFrame = ((i % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
            _accum = 0;
        },
        getFrame: function () { return _curFrame; },
        getFrameCount: function () { return FRAME_COUNT; },
    };
})();

// ── 全局包装函数，供 HTML 控件调用 ──
function updateSpriteSheetOptions() {
    var playing = document.getElementById('id_sprite_playing').checked;
    App.SpriteSheet.setPlaying(playing);
    var fps = parseInt(document.getElementById('id_sprite_fps').value, 10);
    App.SpriteSheet.setFps(fps);
    document.getElementById('id_sprite_fps_val').innerHTML = fps;
    // 暂停时允许用滑块手动选帧
    var frameSlider = document.getElementById('id_sprite_frame');
    frameSlider.disabled = playing;
    if (!playing) {
        App.SpriteSheet.setFrame(parseInt(frameSlider.value, 10));
    }
    requestRender();
}

function updateSpriteSheetFrame() {
    var i = parseInt(document.getElementById('id_sprite_frame').value, 10);
    App.SpriteSheet.setFrame(i);
    document.getElementById('id_sprite_frame_val').innerHTML = i;
    requestRender();
}
