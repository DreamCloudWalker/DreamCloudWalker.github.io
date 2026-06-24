var App = App || {};

// 分形着色器 demo（Mandelbrot / Julia 集）
// 一整块全屏四边形，所有像素的颜色都由片元着色器里的一段"逃逸时间算法"算出来 —— 没有任何贴图。
// 这是"片元着色器 = 逐像素运行的小程序"最纯粹的演示：每个像素独立跑一段复数迭代循环。
//
// 逃逸时间算法（Mandelbrot）：对每个像素对应的复平面坐标 c，迭代 z = z² + c（z 从 0 开始），
//   看它要多少步才"逃逸"（|z| > 2）。逃得越慢颜色越深 —— 永不逃逸的点就是分形集合本身（黑色）。
// Julia 集：把 c 固定为常数，z 的初值取像素坐标，迭代同一公式。
//
// 控制：Mandelbrot/Julia 切换、缩放、平移、最大迭代次数、配色。
App.Fractal = (function () {
    var _program = null;
    var _quadBuffer = null;

    // 视图参数（复平面）
    var _centerX = -0.5;     // Mandelbrot 经典居中点
    var _centerY = 0.0;
    var _scale = 1.5;        // 复平面半高（越小越放大）
    var _maxIter = 200;      // 最大迭代次数
    var _isJulia = false;    // false=Mandelbrot, true=Julia
    var _juliaCX = -0.8;     // Julia 常数 c
    var _juliaCY = 0.156;
    var _palette = 0;        // 配色方案 0/1/2

    // 全屏四边形（NDC，直接覆盖整个裁剪空间）
    const _quadVerts = [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ];

    function _initShader(gl) {
        // 顶点：把 NDC 坐标透传给片元，用作复平面采样基准
        var vsSource = `
            attribute vec2 aPosition;
            varying vec2 vNdc;
            void main() {
                vNdc = aPosition;
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;
        // 片元：逃逸时间算法。highp 很关键 —— mediump 在放大后会迅速出现色块/抖动。
        var fsSource = `
            precision highp float;
            varying vec2 vNdc;
            uniform vec2  uCenter;     // 复平面中心
            uniform float uScale;      // 复平面半高
            uniform float uAspect;     // 视口宽高比，避免分形被拉伸
            uniform int   uMaxIter;    // 最大迭代次数
            uniform bool  uIsJulia;    // 是否 Julia 集
            uniform vec2  uJuliaC;     // Julia 常数
            uniform int   uPalette;    // 配色方案

            // 迭代步数 → 颜色。用 cos 调色板生成平滑彩虹/火焰/冰蓝。
            vec3 palette(float t) {
                if (uPalette == 0) {
                    // 彩虹
                    return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67)));
                } else if (uPalette == 1) {
                    // 火焰（黑→红→黄→白）
                    return clamp(vec3(t * 3.0, t * 3.0 - 1.0, t * 3.0 - 2.0), 0.0, 1.0);
                } else {
                    // 冰蓝
                    return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.6, 0.5, 0.3)));
                }
            }

            void main() {
                // NDC → 复平面坐标，x 方向乘以宽高比保持不变形
                vec2 c = uCenter + vec2(vNdc.x * uAspect, vNdc.y) * uScale;

                vec2 z;
                vec2 k;
                if (uIsJulia) {
                    z = c;          // Julia：z 初值=像素坐标
                    k = uJuliaC;    // c 固定为常数
                } else {
                    z = vec2(0.0);  // Mandelbrot：z 从 0 开始
                    k = c;          // c=像素坐标
                }

                float iter = 0.0;
                const int MAX = 1000;   // GLSL ES 循环上界须为常量，内部再用 uMaxIter 提前 break
                for (int i = 0; i < MAX; i++) {
                    if (i >= uMaxIter) break;
                    // 复数平方：(x+yi)² = x²-y² + 2xy i
                    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + k;
                    if (dot(z, z) > 4.0) break;   // |z|>2 即逃逸
                    iter += 1.0;
                }

                if (iter >= float(uMaxIter)) {
                    // 永不逃逸 → 属于分形集合本身，画黑色
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                } else {
                    // 平滑着色：用连续逃逸值消除颜色台阶
                    float sn = iter - log2(log2(dot(z, z))) + 4.0;
                    vec3 col = palette(sn * 0.02);
                    gl_FragColor = vec4(col, 1.0);
                }
            }
        `;
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Fractal shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            },
            uniformLocations: {
                uCenter:  gl.getUniformLocation(shaderProgram, 'uCenter'),
                uScale:   gl.getUniformLocation(shaderProgram, 'uScale'),
                uAspect:  gl.getUniformLocation(shaderProgram, 'uAspect'),
                uMaxIter: gl.getUniformLocation(shaderProgram, 'uMaxIter'),
                uIsJulia: gl.getUniformLocation(shaderProgram, 'uIsJulia'),
                uJuliaC:  gl.getUniformLocation(shaderProgram, 'uJuliaC'),
                uPalette: gl.getUniformLocation(shaderProgram, 'uPalette'),
            },
        };
    }

    function _initBuffer(gl) {
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_quadVerts), gl.STATIC_DRAW);
        return {
            position: positionBuffer,
            vertexCount: _quadVerts.length / 2,
        };
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;
        // 分形是纯 2D 屏幕特效，上帝视角没有意义，只在主视口绘制
        if (isGodView) return;

        gl.useProgram(programInfo.program);
        gl.disable(gl.DEPTH_TEST);   // 全屏铺满，无需深度

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.uniform2f(programInfo.uniformLocations.uCenter, _centerX, _centerY);
        gl.uniform1f(programInfo.uniformLocations.uScale, _scale);
        gl.uniform1f(programInfo.uniformLocations.uAspect, mViewportWidth / mViewportHeight);
        gl.uniform1i(programInfo.uniformLocations.uMaxIter, _maxIter);
        gl.uniform1i(programInfo.uniformLocations.uIsJulia, _isJulia ? 1 : 0);
        gl.uniform2f(programInfo.uniformLocations.uJuliaC, _juliaCX, _juliaCY);
        gl.uniform1i(programInfo.uniformLocations.uPalette, _palette);

        gl.drawArrays(gl.TRIANGLES, 0, buffer.vertexCount);

        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.enable(gl.DEPTH_TEST);
    }

    return {
        init: function (gl) {
            _program = _initShader(gl);
            _quadBuffer = _initBuffer(gl);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _quadBuffer, isGodView);
        },
        setJulia:   function (v) { _isJulia = v; },
        setScale:   function (v) { _scale = v; },
        setCenter:  function (x, y) { _centerX = x; _centerY = y; },
        setMaxIter: function (v) { _maxIter = v; },
        setPalette: function (v) { _palette = v; },
        setJuliaC:  function (x, y) { _juliaCX = x; _juliaCY = y; },
    };
})();

// ── 全局包装函数，供 HTML 控件调用 ──
function updateFractalOptions() {
    var isJulia = document.getElementById('id_fractal_julia').checked;
    App.Fractal.setJulia(isJulia);

    var scale = parseFloat(document.getElementById('id_fractal_scale').value);
    App.Fractal.setScale(scale);
    document.getElementById('label_fractal_scale').innerHTML = scale.toFixed(4);

    var iter = parseInt(document.getElementById('id_fractal_iter').value, 10);
    App.Fractal.setMaxIter(iter);
    document.getElementById('label_fractal_iter').innerHTML = iter;

    var palette = 0;
    if (document.getElementById('id_fractal_pal_fire').checked) palette = 1;
    else if (document.getElementById('id_fractal_pal_ice').checked) palette = 2;
    App.Fractal.setPalette(palette);

    // Julia 常数滑块（仅 Julia 模式有效）
    var jx = parseFloat(document.getElementById('id_fractal_jx').value);
    var jy = parseFloat(document.getElementById('id_fractal_jy').value);
    App.Fractal.setJuliaC(jx, jy);
    document.getElementById('label_fractal_jx').innerHTML = jx.toFixed(3);
    document.getElementById('label_fractal_jy').innerHTML = jy.toFixed(3);

    // Mandelbrot 默认居中 -0.5，Julia 居中 0
    App.Fractal.setCenter(isJulia ? 0.0 : -0.5, 0.0);

    requestRender();
}
