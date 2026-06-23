var App = App || {};

// Mipmap 贴图 demo
// 主视口里并排两条向远处延伸的长地面，贴同一张高频棋盘格纹理：
//   左地面 —— 不启用 Mipmap，远处会闪烁 / 摩尔纹（aliasing）；
//   右地面 —— 启用 Mipmap，远处平滑。
// 三个教学点：开/关 Mipmap 对比、每级 mip 染色、三种 min filter。
// 工程是 WebGL1（无 textureLod），"每级 mip 染色"用手动逐级 texImage2D 实现。
App.Mipmap = (function () {
    var _program = null;
    var _groundBuffer = null;

    // 4 个纹理对象：是否染色 × 是否带 mip 链。
    // filter 绑在 texture 对象上，左右地面要同时显示"开/关 mipmap"必须用不同对象。
    var _texPlainMip = null;    // 棋盘格 + 自动 mip 链（右地面常规）
    var _texPlainNoMip = null;  // 棋盘格，无 mip（左地面）
    var _texColorMip = null;    // 棋盘格(level0) + 各级染色（右地面染色）
    var _texColorNoMip = null;  // 仅 level0，无 mip（左地面染色，其实就是棋盘格）

    var _enableMipmap = true;   // 右地面是否启用 mipmap
    var _colored = false;       // 每级 mip 染色
    var _minFilterMode = 2;     // 0:NEAREST 1:LINEAR_MIPMAP_NEAREST 2:LINEAR_MIPMAP_LINEAR

    var TEX_SIZE = 256;
    // 各级 mip 的染色（level0 是棋盘格本身，从 level1 起染色）
    var MIP_COLORS = [
        [255, 80, 80],    // level1 红
        [80, 220, 80],    // level2 绿
        [80, 140, 255],   // level3 蓝
        [240, 220, 60],   // level4 黄
        [220, 80, 220],   // level5 品红
        [60, 220, 220],   // level6 青
        [255, 150, 40],   // level7 橙
        [160, 110, 240],  // level8 紫
    ];

    function _makeCheckerCanvas(size) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        var cells = 16;               // 16×16 格，制造高频
        var cell = size / cells;
        for (var y = 0; y < cells; y++) {
            for (var x = 0; x < cells; x++) {
                var on = (x + y) % 2 === 0;
                ctx.fillStyle = on ? '#ffffff' : '#202020';
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
        }
        return canvas;
    }

    function _makeSolidCanvas(size, rgb) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.fillRect(0, 0, size, size);
        return canvas;
    }

    // 棋盘格 + 自动生成 mip 链
    function _buildPlainMipTexture(gl) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _makeCheckerCanvas(TEX_SIZE));
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return tex;
    }

    // 棋盘格，无 mip 链（只有 level0）
    function _buildPlainNoMipTexture(gl) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _makeCheckerCanvas(TEX_SIZE));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return tex;
    }

    // 手动逐级上传：level0 = 棋盘格，level1 起每级填纯色，直到 1×1。
    // GPU 自动选了哪一级，地面对应距离段就显示哪种颜色 —— 直观揭示 mip 自动选级。
    function _buildColoredMipTexture(gl) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        var level = 0;
        var size = TEX_SIZE;
        gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _makeCheckerCanvas(size));
        level = 1;
        size = size >> 1;
        while (size >= 1) {
            var rgb = MIP_COLORS[(level - 1) % MIP_COLORS.length];
            gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _makeSolidCanvas(size, rgb));
            level++;
            size = size >> 1;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return tex;
    }

    // 按当前开关给纹理设置 min/mag filter
    function _applyFilter(gl, tex, useMip) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        var minFilter;
        if (!useMip) {
            // 不启用 mipmap：min filter 退化为 NEAREST / LINEAR
            minFilter = (_minFilterMode === 0) ? gl.NEAREST : gl.LINEAR;
        } else {
            if (_minFilterMode === 0) minFilter = gl.NEAREST;                    // 不用 mip
            else if (_minFilterMode === 1) minFilter = gl.LINEAR_MIPMAP_NEAREST; // 选最近一级
            else minFilter = gl.LINEAR_MIPMAP_LINEAR;                            // 三线性
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

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
        var fsSource = `
            precision mediump float;
            uniform sampler2D uTexSampler;
            varying vec2 vTexCoord;
            void main() {
                gl_FragColor = texture2D(uTexSampler, vTexCoord);
            }
        `;
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
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
            },
        };
    }

    // 一条水平地面，沿 -z 向远处延伸。UV 在长度方向大幅平铺，制造高频。
    function _initBuffer(gl) {
        var x0 = -1.0, x1 = 1.0;     // 单条地面宽度
        var zNear = 1.0, zFar = -40.0;
        var y = -1.0;
        // 两个三角形组成的长条
        var positions = [
            x0, y, zNear,
            x1, y, zNear,
            x0, y, zFar,
            x0, y, zFar,
            x1, y, zNear,
            x1, y, zFar,
        ];
        // UV：宽度方向平铺 4 次，长度方向平铺 40 次（远处纹素被压缩 → aliasing）
        var uTile = 4.0, vTile = 40.0;
        var uvs = [
            0,      0,
            uTile,  0,
            0,      vTile,
            0,      vTile,
            uTile,  0,
            uTile,  vTile,
        ];
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
        return {
            position: positionBuffer,
            uv: uvBuffer,
            vertexCount: positions.length / 3,
        };
    }

    function _drawStrip(gl, programInfo, buffer, mvpMatrix, tex) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.uv);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uMVPMatrix, false, mvpMatrix);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(programInfo.uniformLocations.uTexSampler, 0);

        gl.drawArrays(gl.TRIANGLES, 0, buffer.vertexCount);
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;

        // 选纹理：左地面恒不带 mip；右地面按开关决定
        var leftTex = _colored ? _texColorNoMip : _texPlainNoMip;
        var rightTex = _colored
            ? (_enableMipmap ? _texColorMip : _texColorNoMip)
            : (_enableMipmap ? _texPlainMip : _texPlainNoMip);
        _applyFilter(gl, leftTex, false);
        _applyFilter(gl, rightTex, _enableMipmap);

        gl.useProgram(programInfo.program);

        var vp = mat4.create();
        mat4.multiply(vp, projMatrix, viewMatrix);

        // 左地面：向 -x 平移 1.2；右地面：向 +x 平移 1.2
        var model = mat4.create();
        var mvp = mat4.create();

        mat4.fromTranslation(model, [-1.2, 0, 0]);
        mat4.multiply(mvp, vp, model);
        _drawStrip(gl, programInfo, buffer, mvp, leftTex);

        mat4.fromTranslation(model, [1.2, 0, 0]);
        mat4.multiply(mvp, vp, model);
        _drawStrip(gl, programInfo, buffer, mvp, rightTex);

        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    return {
        init: function (gl) {
            _program = _initShader(gl);
            _groundBuffer = _initBuffer(gl);
            _texPlainMip = _buildPlainMipTexture(gl);
            _texPlainNoMip = _buildPlainNoMipTexture(gl);
            _texColorMip = _buildColoredMipTexture(gl);
            _texColorNoMip = _buildPlainNoMipTexture(gl);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _groundBuffer, isGodView);
        },
        setEnableMipmap: function (v) { _enableMipmap = v; },
        setColored: function (v) { _colored = v; },
        setMinFilterMode: function (m) { _minFilterMode = m; },
    };
})();

// ── 全局包装函数，供 HTML 控件 onchange 调用 ──
function updateMipmapOptions() {
    App.Mipmap.setEnableMipmap(document.getElementById('id_mipmap_enable').checked);
    App.Mipmap.setColored(document.getElementById('id_mipmap_colored').checked);
    var mode = 2;
    if (document.getElementById('id_mipmap_filter_nearest').checked) mode = 0;
    else if (document.getElementById('id_mipmap_filter_mip_nearest').checked) mode = 1;
    else mode = 2;
    App.Mipmap.setMinFilterMode(mode);
    requestRender();
}

