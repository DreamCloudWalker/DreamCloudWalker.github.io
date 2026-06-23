var App = App || {};

// 法线贴图 demo
// 两堵并排的砖墙（同一块几何、左右偏移），共用同一张漫反射贴图：
//   左墙 —— 仅几何法线（flat），砖缝是"画上去的"，无立体感；
//   右墙 —— 法线贴图（bump），砖缝有真实的凹凸感。
// 通过 TBN 矩阵把切线空间法线转到世界空间，用 Blinn-Phong 打光。
App.NormalMap = (function () {
    var _program = null;
    var _wallBuffer = null;

    var _diffuseTex = null;       // bricks.jpg
    var _normalTex = null;        // bricks_normal.png

    var _enableNormalMap = true;  // 右墙默认开启法线贴图

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
            varying vec3 vTangentLightPos;
            varying vec3 vTangentViewPos;
            varying vec2 vTexCoord;
            void main() {
                vec4 worldPos = uModelMatrix * aPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
                vWorldPos = worldPos.xyz;
                vTexCoord = aTexCoord;

                // 构建 TBN 矩阵：T、B、N → tangent→world 变换
                vec3 T = normalize(mat3(uModelMatrix) * aTangent);
                vec3 N = normalize(mat3(uModelMatrix) * aNormal);
                T = normalize(T - dot(T, N) * N);     // Gram-Schmidt 正交化
                vec3 B = cross(N, T);
                mat3 TBN = mat3(T, B, N);

                // 把光源和相机方向转到切线空间（比在世界空间做灵活——法线贴图本身在切线空间）
                // 这里用 MVP 求逆不现实，直接在 CPU 侧传 world-space light/view pos，再在 shader 里转到 tangent
                // 注：为简洁，光/眼位置在 CPU 侧传入 world-space，这里不转 tangent，改为 world-space 做法线映射。
                // 真正的切线空间法线映射需要额外传递切→世矩阵的转置版本，这里做简化。
            }
        `;
        // 实际采用"世界空间法线 + TBN 逆变换"——把切线空间法线贴图采样值通过 TBN 转回世界空间。
        var vsSource2 = `
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
            uniform vec3 uLightDir;        // 方向光
            uniform vec3 uViewPos;
            uniform float uEnableNormal;
            uniform float uAmbientStrength;
            uniform float uDiffuseStrength;
            uniform float uSpecularStrength;
            uniform float uShininess;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            varying mat3 vTBN;
            varying vec2 vTexCoord;
            void main() {
                vec4 diffColor = texture2D(uDiffuseSampler, vTexCoord);

                // 从法线贴图采样并解码 [0,1] → [-1,1]
                vec3 tangentNormal = texture2D(uNormalSampler, vTexCoord).rgb * 2.0 - 1.0;

                // 把切线空间法线通过 TBN 转到世界空间
                vec3 perturbedNormal = normalize(vTBN * tangentNormal);
                // 未开启法线贴图时退化为几何法线
                vec3 N = normalize(mix(vWorldNormal, perturbedNormal, uEnableNormal));

                vec3 L = normalize(uLightDir);         // 方向光 —— 两面墙用完全相同的 L
                vec3 V = normalize(uViewPos - vWorldPos);
                vec3 H = normalize(L + V);

                float diff = max(dot(N, L), 0.0);
                float spec = pow(max(dot(N, H), 0.0), uShininess);

                vec3 ambient  = diffColor.rgb * uAmbientStrength;
                vec3 diffuse  = diffColor.rgb * diff * uDiffuseStrength;
                vec3 specular = vec3(1.0) * spec * uSpecularStrength;

                gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
            }
        `;

        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource2);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('NormalMap shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
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
                uLightDir:         gl.getUniformLocation(shaderProgram, 'uLightDir'),
                uViewPos:          gl.getUniformLocation(shaderProgram, 'uViewPos'),
                uEnableNormal:     gl.getUniformLocation(shaderProgram, 'uEnableNormal'),
                uAmbientStrength:  gl.getUniformLocation(shaderProgram, 'uAmbientStrength'),
                uDiffuseStrength:  gl.getUniformLocation(shaderProgram, 'uDiffuseStrength'),
                uSpecularStrength: gl.getUniformLocation(shaderProgram, 'uSpecularStrength'),
                uShininess:        gl.getUniformLocation(shaderProgram, 'uShininess'),
            },
        };
    }

    function _initBuffer(gl) {
        // 一面直立的大墙，面朝 +Z，贴图在 UV 上平铺多份
        var hw = 2.0, hh = 2.0;           // 半宽、半高
        var uTile = 5.0, vTile = 5.0;     // UV 平铺次数
        var positions = [
            -hw, -hh, 0,   hw, -hh, 0,  -hw,  hh, 0,
            -hw,  hh, 0,   hw, -hh, 0,   hw,  hh, 0,
        ];
        // 几何法线全部朝 +Z
        var normals = [];
        for (var n = 0; n < 6; n++) normals.push(0, 0, 1);
        // 切线沿 X 方向（u 方向）
        var tangents = [];
        for (var t = 0; t < 6; t++) tangents.push(1, 0, 0);
        // UV 平铺
        var uvs = [
            0,      vTile,
            uTile,  vTile,
            0,      0,
            0,      0,
            uTile,  vTile,
            uTile,  0,
        ];

        return {
            position: _makeBuffer(gl, positions),
            normal:   _makeBuffer(gl, normals),
            tangent:  _makeBuffer(gl, tangents),
            uv:       _makeBuffer(gl, uvs),
            vertexCount: positions.length / 3,
        };
    }

    function _makeBuffer(gl, arr) {
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
        return buf;
    }

    function _drawWall(gl, programInfo, buffer, xOffset, useNormal, viewMatrix, projMatrix, viewPos) {
        // 模型矩阵：平移到 xOffset，再应用全局鼠标拖拽旋转
        var modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [xOffset, 0.0, 0.0]);
        mat4.multiply(modelMatrix, modelMatrix, mRotateMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normalPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.tangent);
        gl.vertexAttribPointer(programInfo.attribLocations.tangentPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.tangentPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.uv);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMatrix, false, modelMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, projMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _diffuseTex);
        gl.uniform1i(programInfo.uniformLocations.uDiffuseSampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, _normalTex);
        gl.uniform1i(programInfo.uniformLocations.uNormalSampler, 1);

        gl.uniform1f(programInfo.uniformLocations.uEnableNormal, useNormal ? 1.0 : 0.0);
        gl.uniform3fv(programInfo.uniformLocations.uLightDir, [-0.38, 0.77, 0.51]);  // 方向光 = normalize(LIGHT_POSITION)
        gl.uniform3fv(programInfo.uniformLocations.uViewPos, viewPos);
        gl.uniform1f(programInfo.uniformLocations.uAmbientStrength, 0.15);
        gl.uniform1f(programInfo.uniformLocations.uDiffuseStrength, 0.85);
        gl.uniform1f(programInfo.uniformLocations.uSpecularStrength, 0.4);
        gl.uniform1f(programInfo.uniformLocations.uShininess, 32.0);

        gl.drawArrays(gl.TRIANGLES, 0, buffer.vertexCount);
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer || !_diffuseTex || !_normalTex) return;

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var viewPos = isGodView
            ? [mGodVIMatrix[12], mGodVIMatrix[13], mGodVIMatrix[14]]
            : [mVIMatrix[12], mVIMatrix[13], mVIMatrix[14]];

        gl.useProgram(programInfo.program);

        // 左墙：不开启法线贴图（使用几何法线）
        _drawWall(gl, programInfo, buffer, -1.5, false, viewMatrix, projMatrix, viewPos);
        // 右墙：开启法线贴图（TBN 扰动法线）
        _drawWall(gl, programInfo, buffer, 1.5, _enableNormalMap, viewMatrix, projMatrix, viewPos);

        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.normalPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.tangentPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    return {
        init: function (gl) {
            _program = _initShader(gl);
            _wallBuffer = _initBuffer(gl);
            // 异步加载两张贴图，完成后触发一次重绘
            var loaded = 0;
            function onTex() { loaded++; if (loaded >= 2) requestRender(); }
            _diffuseTex = loadTexture(gl, './texture/bricks.jpg', onTex);
            _normalTex = loadTexture(gl, './texture/bricks_normal.png', onTex);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _wallBuffer, isGodView);
        },
        setEnable: function (v) { _enableNormalMap = v; },
    };
})();

// ── 全局包装函数 ──
function updateNormalMapOptions() {
    App.NormalMap.setEnable(document.getElementById('id_normalmap_enable').checked);
    requestRender();
}