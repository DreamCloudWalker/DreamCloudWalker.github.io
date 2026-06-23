var App = App || {};

// 视差遮蔽贴图（Parallax Occlusion Mapping, POM）demo
// 4 面正方形墙分 2×2 网格排列，逐步叠加贴图技术：
//   左上 —— 仅漫反射贴图（纯平面）
//   右上 —— 漫反射 + 法线贴图（法线凹凸，掠射角穿帮）
//   左下 —— 漫反射 + 法线 + 视差贴图（UV 单次偏移）
//   右下 —— 漫反射 + 法线 + POM（沿视线逐层 ray-march + 层间插值）
//
// POM 的核心：沿切线空间视线方向分层步进采样高度图，
// 找到视线与高度场的交点，对该点 UV 做插值平滑。
// 比单次视差更准确地模拟了"遮挡/深度"。
App.POM = (function () {
    var _program = null;
    var _wallBuffer = null;
    var _diffuseTex = null;
    var _normalTex = null;
    var _heightTex = null;

    var _enablePOM = true;
    var _heightScale = 0.08;    // 总高度偏移量
    var _minLayers = 8.0;       // 正视最少步进层数
    var _maxLayers = 40.0;      // 掠射角最大步进层数

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
            uniform float uUsePOM;
            uniform float uHeightScale;
            uniform float uMinLayers;
            uniform float uMaxLayers;
            uniform float uAmbientStrength;
            uniform float uDiffuseStrength;
            uniform float uSpecularStrength;
            uniform float uShininess;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            varying mat3 vTBN;
            varying vec2 vTexCoord;

            // ── POM：沿视线逐层 ray-march ──
            vec2 pomOffset(vec2 texCoord, vec3 V_tangent, float scale, float minL, float maxL) {
                // 按视角动态调整步进层数：正视少、斜视多
                float numLayers = mix(maxL, minL, abs(V_tangent.z));
                float layerDepth = 1.0 / numLayers;
                float currentDepth = 0.0;
                vec2 deltaUV = (V_tangent.xy / abs(V_tangent.z)) * scale / numLayers;
                vec2 currentUV = texCoord;
                float currentHeight = texture2D(uHeightSampler, currentUV).r;
                // Linear search
                for (int i = 0; i < 40; i++) {
                    if (float(i) >= numLayers) break;
                    currentDepth += layerDepth;
                    currentUV -= deltaUV;
                    currentHeight = texture2D(uHeightSampler, currentUV).r;
                    if (currentHeight > currentDepth) break;
                }
                // 与前一层插值，平滑步进阶梯
                vec2 prevUV = currentUV + deltaUV;
                float prevHeight = texture2D(uHeightSampler, prevUV).r;
                float prevDepth = currentDepth - layerDepth;
                float weight = (currentDepth - currentHeight)
                    / (currentDepth - currentHeight - prevDepth + prevHeight + 0.0001);
                return mix(currentUV, prevUV, weight);
            }

            void main() {
                vec2 uv = vTexCoord;

                vec3 V_world = normalize(uViewPos - vWorldPos);
                vec3 V_tangent = vec3(
                    dot(V_world, vTBN[0]),
                    dot(V_world, vTBN[1]),
                    dot(V_world, vTBN[2]));
                V_tangent = normalize(V_tangent);

                // POM 偏移：逐层 ray-march
                vec2 pomUV = pomOffset(vTexCoord, V_tangent, uHeightScale, uMinLayers, uMaxLayers);

                // 视差偏移：单次 offset-limiting
                float h = texture2D(uHeightSampler, vTexCoord).r;
                vec2 offset = V_tangent.xy / (abs(V_tangent.z) + 0.001) * (h * uHeightScale - 0.03);
                vec2 parUV = vTexCoord + offset;

                // 按开关选择 UV
                if (uUsePOM > 0.5)      uv = pomUV;
                else if (uUseParallax > 0.5) uv = parUV;

                // 法线贴图
                vec4 diffColor = texture2D(uDiffuseSampler, uv);
                vec3 tangentNormal = texture2D(uNormalSampler, uv).rgb * 2.0 - 1.0;
                vec3 perturbedNormal = normalize(vTBN * tangentNormal);
                vec3 N = normalize(mix(vWorldNormal, perturbedNormal, uUseNormal));

                // Blinn-Phong
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
            alert('POM shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
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
                uUsePOM:           gl.getUniformLocation(shaderProgram, 'uUsePOM'),
                uHeightScale:      gl.getUniformLocation(shaderProgram, 'uHeightScale'),
                uMinLayers:        gl.getUniformLocation(shaderProgram, 'uMinLayers'),
                uMaxLayers:        gl.getUniformLocation(shaderProgram, 'uMaxLayers'),
                uAmbientStrength:  gl.getUniformLocation(shaderProgram, 'uAmbientStrength'),
                uDiffuseStrength:  gl.getUniformLocation(shaderProgram, 'uDiffuseStrength'),
                uSpecularStrength: gl.getUniformLocation(shaderProgram, 'uSpecularStrength'),
                uShininess:        gl.getUniformLocation(shaderProgram, 'uShininess'),
            },
        };
    }

    function _initBuffer(gl) {
        var hw = 0.85, hh = 0.85;         // 正方形墙：半宽=半高
        var uTile = 2.5, vTile = 2.5;
        var positions = [
            -hw, -hh, 0,   hw, -hh, 0,  -hw,  hh, 0,
            -hw,  hh, 0,   hw, -hh, 0,   hw,  hh, 0,
        ];
        var normals = []; for (var n = 0; n < 6; n++) normals.push(0, 0, 1);
        var tangents = []; for (var t = 0; t < 6; t++) tangents.push(1, 0, 0);
        var uvs = [0,vTile, uTile,vTile, 0,0, 0,0, uTile,vTile, uTile,0];
        return {
            position: _buf(gl, positions), normal: _buf(gl, normals),
            tangent: _buf(gl, tangents), uv: _buf(gl, uvs),
            vertexCount: positions.length / 3,
        };
    }
    function _buf(gl, a) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); return b; }

    function _drawWall(gl, p, buf, xOff, yOff, useN, useP, usePOM, vM, pM, vP) {
        var model = mat4.create();
        mat4.translate(model, model, [xOff, yOff, 0.0]);
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
        gl.uniformMatrix4fv(p.uniformLocations.uViewMatrix, false, vM);
        gl.uniformMatrix4fv(p.uniformLocations.uProjectionMatrix, false, pM);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, _diffuseTex);
        gl.uniform1i(p.uniformLocations.uDiffuseSampler, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, _normalTex);
        gl.uniform1i(p.uniformLocations.uNormalSampler, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, _heightTex);
        gl.uniform1i(p.uniformLocations.uHeightSampler, 2);

        gl.uniform1f(p.uniformLocations.uUseNormal, useN ? 1.0 : 0.0);
        gl.uniform1f(p.uniformLocations.uUseParallax, useP ? 1.0 : 0.0);
        gl.uniform1f(p.uniformLocations.uUsePOM, usePOM ? 1.0 : 0.0);
        gl.uniform1f(p.uniformLocations.uHeightScale, _heightScale);
        gl.uniform1f(p.uniformLocations.uMinLayers, _minLayers);
        gl.uniform1f(p.uniformLocations.uMaxLayers, _maxLayers);
        gl.uniform3fv(p.uniformLocations.uLightDir, [-0.38, 0.77, 0.51]);
        gl.uniform3fv(p.uniformLocations.uViewPos, vP);
        gl.uniform1f(p.uniformLocations.uAmbientStrength, 0.12);
        gl.uniform1f(p.uniformLocations.uDiffuseStrength, 0.88);
        gl.uniform1f(p.uniformLocations.uSpecularStrength, 0.3);
        gl.uniform1f(p.uniformLocations.uShininess, 32.0);
        gl.drawArrays(gl.TRIANGLES, 0, buf.vertexCount);
    }

    function _draw(gl, p, buf, isGodView) {
        if (!p || !buf || !_diffuseTex || !_normalTex || !_heightTex) return;
        var vM = isGodView ? mGodViewMatrix : mViewMatrix;
        var pM = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var vP = isGodView ? [mGodVIMatrix[12],mGodVIMatrix[13],mGodVIMatrix[14]]
                          : [mVIMatrix[12],mVIMatrix[13],mVIMatrix[14]];
        gl.useProgram(p.program);
        // 2×2 网格
        _drawWall(gl, p, buf, -1.1,  1.1, false, false, false, vM, pM, vP); // 左上: 仅漫反射
        _drawWall(gl, p, buf,  1.1,  1.1, true,  false, false, vM, pM, vP); // 右上: +法线
        _drawWall(gl, p, buf, -1.1, -1.1, true,  true,  false, vM, pM, vP); // 左下: +法线+视差
        _drawWall(gl, p, buf,  1.1, -1.1, true,  false, _enablePOM, vM, pM, vP); // 右下: +法线+POM

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
        setEnable: function (v) { _enablePOM = v; },
        setScale:  function (v) { _heightScale = v; },
        setMinLayers: function(v) { _minLayers = v; },
        setMaxLayers: function(v) { _maxLayers = v; },
    };
})();

function updatePOMOptions() {
    App.POM.setEnable(document.getElementById('id_pom_enable').checked);
    App.POM.setScale(parseFloat(document.getElementById('id_pom_scale').value));
    App.POM.setMinLayers(parseFloat(document.getElementById('id_pom_min_layers').value));
    App.POM.setMaxLayers(parseFloat(document.getElementById('id_pom_max_layers').value));
    document.getElementById('label_pom_scale').innerHTML
        = document.getElementById('id_pom_scale').value;
    document.getElementById('label_pom_min_layers').innerHTML
        = document.getElementById('id_pom_min_layers').value;
    document.getElementById('label_pom_max_layers').innerHTML
        = document.getElementById('id_pom_max_layers').value;
    requestRender();
}