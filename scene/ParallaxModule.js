var App = App || {};

// 视差贴图（Parallax Mapping）demo
// 三堵并排的砖墙，共用同一张漫反射贴图和法线贴图：
//   左 —— 仅漫反射贴图（flat，纯平面）
//   中 —— 漫反射 + 法线贴图（砖缝有凹凸，但掠射角下穿帮）
//   右 —— 漫反射 + 法线贴图 + 视差贴图（bricks_parallax.jpg 高度图做 UV 偏移）
//
// 视差贴图的核心：根据视线方向和高度值，偏移纹理采样坐标，
// 让低处（砖缝）的纹素被"推进去"，高处（砖面）保持原位，
// 从而在掠射角下产生真正的"深度遮挡"——法线贴图做不到这一点。
App.Parallax = (function () {
    var _program = null;
    var _wallBuffer = null;

    var _diffuseTex = null;
    var _normalTex = null;
    var _heightTex = null;

    var _enableParallax = true;
    var _parallaxScale = 0.06;   // 视差强度 —— 调太大纹理会撕裂
    var _parallaxBias = 0.03;    // 偏移偏置，避免在平坦区域也偏移

    function _initShader(gl) {
        var vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            attribute vec3 aTangent;
            attribute vec2 aTexCoord;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            varying mat3 vTBN;
            varying vec2 vTexCoord;
            void main() {
                vec4 worldPos = uModelMatrix * aPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
                vWorldPos = worldPos.xyz;
                vWorldNormal = normalize(mat3(uModelMatrix) * aNormal);
                vTexCoord = aTexCoord;

                vec3 T = normalize(mat3(uModelMatrix) * aTangent);
                vec3 N = vWorldNormal;
                T = normalize(T - dot(T, N) * N);
                vec3 B = cross(N, T);
                vTBN = mat3(T, B, N);
            }
        `;
        var fsSource = `
            precision mediump float;
            uniform sampler2D uDiffuseSampler;
            uniform sampler2D uNormalSampler;
            uniform sampler2D uHeightSampler;
            uniform vec3 uLightDir;
            uniform vec3 uViewPos;
            uniform float uUseNormal;
            uniform float uUseParallax;
            uniform float uParallaxScale;
            uniform float uParallaxBias;
            uniform float uAmbientStrength;
            uniform float uDiffuseStrength;
            uniform float uSpecularStrength;
            uniform float uShininess;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            varying mat3 vTBN;
            varying vec2 vTexCoord;
            void main() {
                vec2 uv = vTexCoord;

                // ── 视差映射：沿视线方向偏移 UV ──
                // 把世界空间视线转到切线空间，取其 xy 分量做偏移。
                // 除以 z 避免陡峭角度偏移过大（offset limiting）。
                vec3 V_world = normalize(uViewPos - vWorldPos);
                vec3 V_tangent = vec3(
                    dot(V_world, vTBN[0]),   // 世界→切线（TBN^T = inv(TBN)，正交矩阵）
                    dot(V_world, vTBN[1]),
                    dot(V_world, vTBN[2])
                );
                float height = texture2D(uHeightSampler, vTexCoord).r;
                vec2 offset = V_tangent.xy / (abs(V_tangent.z) + 0.001) * (height * uParallaxScale - uParallaxBias);
                uv = mix(vTexCoord, vTexCoord + offset, uUseParallax);

                // ── 法线贴图 ──
                vec4 diffColor = texture2D(uDiffuseSampler, uv);
                vec3 tangentNormal = texture2D(uNormalSampler, uv).rgb * 2.0 - 1.0;
                vec3 perturbedNormal = normalize(vTBN * tangentNormal);
                vec3 N = normalize(mix(vWorldNormal, perturbedNormal, uUseNormal));

                // ── Blinn-Phong ──
                vec3 L = normalize(uLightDir);
                vec3 V = normalize(V_world);
                vec3 H = normalize(L + V);
                float diff = max(dot(N, L), 0.0);
                float spec = pow(max(dot(N, H), 0.0), uShininess);

                vec3 ambient  = diffColor.rgb * uAmbientStrength;
                vec3 diffuse  = diffColor.rgb * diff * uDiffuseStrength;
                vec3 specular = vec3(1.0) * spec * uSpecularStrength;

                gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
            }
        `;

        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Parallax shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                normalPosition:  gl.getAttribLocation(shaderProgram, 'aNormal'),
                tangentPosition: gl.getAttribLocation(shaderProgram, 'aTangent'),
                textureCoord:    gl.getAttribLocation(shaderProgram, 'aTexCoord'),
            },
            uniformLocations: {
                uModelMatrix:      gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                uViewMatrix:       gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                uProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                uDiffuseSampler:   gl.getUniformLocation(shaderProgram, 'uDiffuseSampler'),
                uNormalSampler:    gl.getUniformLocation(shaderProgram, 'uNormalSampler'),
                uHeightSampler:    gl.getUniformLocation(shaderProgram, 'uHeightSampler'),
                uLightDir:         gl.getUniformLocation(shaderProgram, 'uLightDir'),
                uViewPos:          gl.getUniformLocation(shaderProgram, 'uViewPos'),
                uUseNormal:        gl.getUniformLocation(shaderProgram, 'uUseNormal'),
                uUseParallax:      gl.getUniformLocation(shaderProgram, 'uUseParallax'),
                uParallaxScale:    gl.getUniformLocation(shaderProgram, 'uParallaxScale'),
                uParallaxBias:     gl.getUniformLocation(shaderProgram, 'uParallaxBias'),
                uAmbientStrength:  gl.getUniformLocation(shaderProgram, 'uAmbientStrength'),
                uDiffuseStrength:  gl.getUniformLocation(shaderProgram, 'uDiffuseStrength'),
                uSpecularStrength: gl.getUniformLocation(shaderProgram, 'uSpecularStrength'),
                uShininess:        gl.getUniformLocation(shaderProgram, 'uShininess'),
            },
        };
    }

    function _initBuffer(gl) {
        var hw = 1.2, hh = 2.0;          // 窄墙：半宽 1.2，半高 2.0
        var uTile = 3.0, vTile = 5.0;    // UV 平铺
        var positions = [
            -hw, -hh, 0,   hw, -hh, 0,  -hw,  hh, 0,
            -hw,  hh, 0,   hw, -hh, 0,   hw,  hh, 0,
        ];
        var normals = [];
        for (var n = 0; n < 6; n++) normals.push(0, 0, 1);
        var tangents = [];
        for (var t = 0; t < 6; t++) tangents.push(1, 0, 0);
        var uvs = [
            0,      vTile,  uTile,  vTile,  0,      0,
            0,      0,      uTile,  vTile,  uTile,  0,
        ];
        return {
            position: _makeBuf(gl, positions),
            normal:   _makeBuf(gl, normals),
            tangent:  _makeBuf(gl, tangents),
            uv:       _makeBuf(gl, uvs),
            vertexCount: positions.length / 3,
        };
    }
    function _makeBuf(gl, arr) {
        var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
        return b;
    }

    function _drawWall(gl, p, buf, xOff, useNormal, useParallax, vMat, pMat, vPos) {
        var model = mat4.create();
        mat4.translate(model, model, [xOff, 0.0, 0.0]);
        mat4.multiply(model, model, mRotateMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, buf.position);
        gl.vertexAttribPointer(p.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribLocations.vertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.normal);
        gl.vertexAttribPointer(p.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribLocations.normalPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.tangent);
        gl.vertexAttribPointer(p.attribLocations.tangentPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribLocations.tangentPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv);
        gl.vertexAttribPointer(p.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribLocations.textureCoord);

        gl.uniformMatrix4fv(p.uniformLocations.uModelMatrix, false, model);
        gl.uniformMatrix4fv(p.uniformLocations.uViewMatrix, false, vMat);
        gl.uniformMatrix4fv(p.uniformLocations.uProjectionMatrix, false, pMat);

        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, _diffuseTex);
        gl.uniform1i(p.uniformLocations.uDiffuseSampler, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, _normalTex);
        gl.uniform1i(p.uniformLocations.uNormalSampler, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, _heightTex);
        gl.uniform1i(p.uniformLocations.uHeightSampler, 2);

        gl.uniform1f(p.uniformLocations.uUseNormal, useNormal ? 1.0 : 0.0);
        gl.uniform1f(p.uniformLocations.uUseParallax, useParallax ? 1.0 : 0.0);
        gl.uniform1f(p.uniformLocations.uParallaxScale, _parallaxScale);
        gl.uniform1f(p.uniformLocations.uParallaxBias, _parallaxBias);
        gl.uniform3fv(p.uniformLocations.uLightDir, [0.45, 0.75, 0.35]);
        gl.uniform3fv(p.uniformLocations.uViewPos, vPos);
        gl.uniform1f(p.uniformLocations.uAmbientStrength, 0.12);
        gl.uniform1f(p.uniformLocations.uDiffuseStrength, 0.88);
        gl.uniform1f(p.uniformLocations.uSpecularStrength, 0.3);
        gl.uniform1f(p.uniformLocations.uShininess, 32.0);

        gl.drawArrays(gl.TRIANGLES, 0, buf.vertexCount);
    }

    function _draw(gl, p, buf, isGodView) {
        if (!p || !buf || !_diffuseTex || !_normalTex || !_heightTex) return;
        var vMat = isGodView ? mGodViewMatrix : mViewMatrix;
        var pMat = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var vPos = isGodView
            ? [mGodVIMatrix[12], mGodVIMatrix[13], mGodVIMatrix[14]]
            : [mVIMatrix[12], mVIMatrix[13], mVIMatrix[14]];
        gl.useProgram(p.program);

        // 左：仅漫反射
        _drawWall(gl, p, buf, -2.6, false, false, vMat, pMat, vPos);
        // 中：漫反射 + 法线贴图
        _drawWall(gl, p, buf, 0.0,  true,  false, vMat, pMat, vPos);
        // 右：漫反射 + 法线贴图 + 视差贴图
        _drawWall(gl, p, buf, 2.6,  true,  _enableParallax, vMat, pMat, vPos);

        gl.disableVertexAttribArray(p.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(p.attribLocations.normalPosition);
        gl.disableVertexAttribArray(p.attribLocations.tangentPosition);
        gl.disableVertexAttribArray(p.attribLocations.textureCoord);
    }

    return {
        init: function (gl) {
            _program = _initShader(gl);
            _wallBuffer = _initBuffer(gl);
            var loaded = 0;
            function onTex() { loaded++; if (loaded >= 3) requestRender(); }
            _diffuseTex = loadTexture(gl, './texture/bricks.jpg', onTex);
            _normalTex  = loadTexture(gl, './texture/bricks_normal.png', onTex);
            _heightTex  = loadTexture(gl, './texture/bricks_parallax.jpg', onTex);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _wallBuffer, isGodView);
        },
        setEnable: function (v) { _enableParallax = v; },
        setScale:  function (v) { _parallaxScale = v; },
        setBias:   function (v) { _parallaxBias  = v; },
    };
})();

// ── 全局包装函数 ──
function updateParallaxOptions() {
    App.Parallax.setEnable(document.getElementById('id_parallax_enable').checked);
    App.Parallax.setScale(parseFloat(document.getElementById('id_parallax_scale').value));
    App.Parallax.setBias(parseFloat(document.getElementById('id_parallax_bias').value));
    document.getElementById('label_parallax_scale').innerHTML = parseFloat(document.getElementById('id_parallax_scale').value).toFixed(3);
    document.getElementById('label_parallax_bias').innerHTML  = parseFloat(document.getElementById('id_parallax_bias').value).toFixed(3);
    requestRender();
}