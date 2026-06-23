var App = App || {};

App.LensFlare = (function () {
    var _program = null;
    var _vboBuffer = null;
    var _textures = [];
    var _elements = [];

    const _quadVerts = new Float32Array([
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
         0.5,  0.5
    ]);

    function _initShader(gl) {
        const vsSource = `
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            uniform vec2 uCenter;
            uniform vec2 uScale;
            uniform vec2 uResolution;
            void main() {
                vec2 screenPosition = aPosition * uScale + uCenter;
                screenPosition.x = screenPosition.x * 2.0 - 1.0;
                screenPosition.y = screenPosition.y * -2.0 + 1.0;
                gl_Position = vec4(screenPosition, 0.0, 1.0);
                vTexCoord = aTexCoord;
            }
        `;
        const fsSource = `
            precision mediump float;
            uniform sampler2D uTexture;
            uniform float uBrightness;
            varying vec2 vTexCoord;
            void main() {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                gl_FragColor = texColor * uBrightness;
            }
        `;
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
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
                uCenterHandle: gl.getUniformLocation(shaderProgram, 'uCenter'),
                uScaleHandle: gl.getUniformLocation(shaderProgram, 'uScale'),
                uResolutionHandle: gl.getUniformLocation(shaderProgram, 'uResolution'),
                uTextureHandle: gl.getUniformLocation(shaderProgram, 'uTexture'),
                uBrightnessHandle: gl.getUniformLocation(shaderProgram, 'uBrightness'),
            },
        };
    }

    function _initBuffers(gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_quadVerts), gl.STATIC_DRAW);

        const texCoords = new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0
        ]);
        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        return { position: positionBuffer, uv: uvBuffer };
    }

    function _renderOne(gl, buffers, flarePos, texture, scale, brightness) {
        gl.enable(gl.BLEND);
        // 加色混合（additive）：光晕是"光"，应叠加到背景上而非覆盖。
        // 贴图背景是黑色透明，黑色加 0 不影响背景，亮处发光叠加 —— 才有真实镜头光感。
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        // 关闭深度测试与深度写入：光晕永远画在场景最上层，且互不遮挡
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(_program.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(_program.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
        gl.vertexAttribPointer(_program.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(_program.attribLocations.textureCoord);

        gl.useProgram(_program.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(_program.uniformLocations.uTextureHandle, 0);

        // 宽高比校正：屏幕非正方形，x 方向缩放要除以 aspect，否则圆形光斑变椭圆
        var aspect = mViewportWidth / mViewportHeight;
        gl.uniform2fv(_program.uniformLocations.uCenterHandle, flarePos);
        gl.uniform2fv(_program.uniformLocations.uScaleHandle, [scale / aspect, scale]);
        gl.uniform2fv(_program.uniformLocations.uResolutionHandle, [mViewportWidth, mViewportHeight]);
        gl.uniform1f(_program.uniformLocations.uBrightnessHandle, brightness);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disableVertexAttribArray(_program.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(_program.attribLocations.textureCoord);
        // 恢复默认渲染状态，避免污染后续绘制
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
    }

    // 射线-包围球遮挡测试：从相机沿"指向太阳"的方向射出，
    // 若射线穿过飞机的包围球（球心在原点，半径 FIGHTER_RADIUS），说明太阳被飞机挡住。
    // 返回 0（完全遮挡）~1（完全可见）的平滑系数。
    const FIGHTER_RADIUS = 1.6;   // 飞机包围球半径（模型在原点、scale 1）
    function _sunVisibility(sunDir) {
        // 归一化的视线方向（相机 → 太阳）
        var d = vec3.normalize(vec3.create(), vec3.clone(sunDir));
        // 相机到球心(原点)的向量
        var oc = vec3.fromValues(-mEye[0], -mEye[1], -mEye[2]);
        var tca = vec3.dot(oc, d);
        if (tca < 0.0) return 1.0;     // 飞机在相机背后，不可能遮挡太阳
        // 视线到球心的最近距离平方
        var d2 = vec3.dot(oc, oc) - tca * tca;
        var r = FIGHTER_RADIUS;
        var r2 = r * r;
        if (d2 >= r2) return 1.0;      // 视线没碰到包围球 → 完全可见
        // 越接近球心，遮挡越强；用 smoothstep 平滑过渡，边缘半透明
        var edge = Math.sqrt(d2 / r2); // 0(正中心)~1(球边缘)
        // edge 0→0.4 完全遮挡，0.4→1 渐亮
        var t = (edge - 0.4) / 0.6;
        return Math.max(0.0, Math.min(1.0, t));
    }

    function _draw(gl) {
        if (!_program || !_vboBuffer || _elements.length === 0) return;

        // 太阳方向（镜头光晕专用，指向初始相机前方），放到足够远处当作太阳位置
        const sunWorld = [
            LENS_FLARE_LIGHT_DIR[0] * 1000.0,
            LENS_FLARE_LIGHT_DIR[1] * 1000.0,
            LENS_FLARE_LIGHT_DIR[2] * 1000.0
        ];

        // 投影到裁剪空间，保留 w 用于判断是否在相机前方
        let clip = vec4.fromValues(sunWorld[0], sunWorld[1], sunWorld[2], 1.0);
        vec4.transformMat4(clip, clip, mViewMatrix);
        vec4.transformMat4(clip, clip, mProjectionMatrix);

        // w <= 0：太阳在相机后方 → 不渲染任何光晕
        if (clip[3] <= 0.0) return;

        // 透视除法得到 NDC [-1,1]
        const ndcX = clip[0] / clip[3];
        const ndcY = clip[1] / clip[3];

        // 太阳必须落在视锥体内（屏幕范围 + 少量余量）才显示光晕
        if (ndcX < -1.1 || ndcX > 1.1 || ndcY < -1.1 || ndcY > 1.1) return;

        // NDC → [0,1] 屏幕坐标（y 翻转）
        const lightScreen = [ndcX * 0.5 + 0.5, 1.0 - (ndcY * 0.5 + 0.5)];

        // 光晕方向：从太阳屏幕位置指向画面中心
        const screenCenter = [0.5, 0.5];
        const flareVec = [screenCenter[0] - lightScreen[0], screenCenter[1] - lightScreen[1]];

        // distToCenter：太阳偏离画面中心的程度（0 = 正对太阳，越大越偏）
        const distToCenter = Math.sqrt(flareVec[0] * flareVec[0] + flareVec[1] * flareVec[1]);

        // 遮挡测试：太阳被飞机挡住时光线无法进入镜头，光晕（尤其核心辉光）应随之消退
        const visibility = _sunVisibility(sunWorld);

        // 整体亮度：太阳在画面内即可见，靠边缘渐隐，并乘以遮挡可见度
        let brightness = Math.max(0.0, 1.0 - distToCenter / 0.85) * visibility;
        if (brightness <= 0.0) return;

        // ── 耀眼核心（dazzle glow）──
        // directness：相机越正对太阳（distToCenter 越小）→ 越接近 1，辉光越强。
        // 用高次幂让"正对"时辉光急剧增强，模拟直视太阳的刺眼感。被遮挡时辉光同样消退。
        const directness = Math.max(0.0, 1.0 - distToCenter / 0.5);
        const glowIntensity = Math.pow(directness, 2.0) * visibility;

        if (glowIntensity > 0.01) {
            // 大范围柔光（sun.png）：随正对程度放大并增亮
            const glowScale = 0.5 + glowIntensity * 1.2;
            _renderOne(gl, _vboBuffer, lightScreen, _textures[0].texture, glowScale, glowIntensity * 1.5);
            // 叠加一层更亮更小的核心，增强"白热"感
            _renderOne(gl, _vboBuffer, lightScreen, _textures[0].texture, 0.25 + glowIntensity * 0.3, glowIntensity * 2.0);
        }

        // 太阳本体（受遮挡影响）
        _renderOne(gl, _vboBuffer, lightScreen, _elements[0].texture.texture, _elements[0].scale, visibility);
        // 其余光晕元素沿 太阳→中心 连线排布
        for (let i = 1; i < _elements.length; i++) {
            const flarePos = [
                lightScreen[0] + flareVec[0] * i * LENS_FLARE_SPACING,
                lightScreen[1] + flareVec[1] * i * LENS_FLARE_SPACING
            ];
            _renderOne(gl, _vboBuffer, flarePos, _elements[i].texture.texture, _elements[i].scale, brightness);
        }
    }

    return {
        init: function (gl, onLoad) {
            _program = _initShader(gl);
            _vboBuffer = _initBuffers(gl);
            _textures = [
                loadTextureByUrl(gl, './texture/LensFlare1/sun.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex1.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex2.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex3.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex4.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex5.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex6.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex7.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex8.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex9.png', onLoad),
            ];
            _elements = [
                { texture: _textures[6], scale: 0.5 },
                { texture: _textures[4], scale: 0.23 },
                { texture: _textures[2], scale: 0.1 },
                { texture: _textures[7], scale: 0.05 },
                { texture: _textures[1], scale: 0.02 },
                { texture: _textures[3], scale: 0.06 },
                { texture: _textures[9], scale: 0.12 },
                { texture: _textures[5], scale: 0.07 },
                { texture: _textures[1], scale: 0.012 },
                { texture: _textures[7], scale: 0.2 },
                { texture: _textures[9], scale: 0.1 },
                { texture: _textures[3], scale: 0.07 },
                { texture: _textures[5], scale: 0.3 },
                { texture: _textures[4], scale: 0.4 },
                { texture: _textures[8], scale: 0.6 },
            ];
        },
        draw: function (gl) {
            _draw(gl);
        },
    };
})();
