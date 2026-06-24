var App = App || {};

// PBR（基于物理的渲染）解析光照 demo
// 一个球体 + 天空盒背景，用 Cook-Torrance BRDF 演示金属度/粗糙度/透明度对外观的影响。
//
// 直接光照（单个方向光）：
//   Lo = (kD * albedo / PI + DGF / (4 * NoV * NoL)) * radiance * NoL
//   D = GGX 法线分布   G = Smith 几何遮蔽   F = Schlick 菲涅尔
// 环境项用一个常量近似（非 IBL），便于隔离演示参数。
//
// 控制：金属度、粗糙度、透明度、反照率颜色、环境光强度。
App.PBRSphere = (function () {
    var _program = null;
    var _sphereBuffer = null;

    // 默认参数
    var _albedo = vec3.fromValues(1.0, 0.3, 0.2);   // 反照率（基础色）
    var _metallic = 0.0;                             // 金属度 0=电介质 1=金属
    var _roughness = 0.35;                           // 粗糙度 0=镜面 1=粗糙
    var _alpha = 1.0;                                // 透明度（alpha）
    var _ambient = 0.15;                             // 环境光强度

    function _initShader(gl) {
        var vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            void main() {
                vec4 worldPos = uModelMatrix * aPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
                vWorldPos = worldPos.xyz;
                // 模型仅旋转+均匀缩放，法线可直接用 mat3(model) 变换
                vWorldNormal = normalize(mat3(uModelMatrix) * aNormal);
            }
        `;
        var fsSource = `
            precision mediump float;
            #define PI 3.14159265359

            uniform vec3  uAlbedo;
            uniform float uMetallic;
            uniform float uRoughness;
            uniform float uAlpha;
            uniform float uAmbient;
            uniform vec3  uLightDir;     // 指向光源的方向（世界空间）
            uniform vec3  uLightColor;
            uniform vec3  uViewPos;

            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;

            // GGX / Trowbridge-Reitz 法线分布函数
            float DistributionGGX(vec3 N, vec3 H, float roughness) {
                float a = roughness * roughness;
                float a2 = a * a;
                float NoH = max(dot(N, H), 0.0);
                float NoH2 = NoH * NoH;
                float denom = NoH2 * (a2 - 1.0) + 1.0;
                return a2 / (PI * denom * denom);
            }

            // Smith 几何遮蔽（直接光照 k = (r+1)^2 / 8）
            float GeometrySchlickGGX(float NoX, float roughness) {
                float r = roughness + 1.0;
                float k = (r * r) / 8.0;
                return NoX / (NoX * (1.0 - k) + k);
            }
            float GeometrySmith(float NoV, float NoL, float roughness) {
                return GeometrySchlickGGX(NoV, roughness) * GeometrySchlickGGX(NoL, roughness);
            }

            // Schlick 菲涅尔近似
            vec3 fresnelSchlick(float cosTheta, vec3 F0) {
                return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
            }

            void main() {
                vec3 N = normalize(vWorldNormal);
                vec3 V = normalize(uViewPos - vWorldPos);
                vec3 L = normalize(uLightDir);
                vec3 H = normalize(V + L);

                float NoV = max(dot(N, V), 0.0);
                float NoL = max(dot(N, L), 0.0);

                // 电介质基础反射率 0.04；金属用反照率作为 F0
                vec3 F0 = mix(vec3(0.04), uAlbedo, uMetallic);

                float D = DistributionGGX(N, H, uRoughness);
                float G = GeometrySmith(NoV, NoL, uRoughness);
                vec3  F = fresnelSchlick(max(dot(H, V), 0.0), F0);

                vec3 numerator = D * G * F;
                float denominator = 4.0 * NoV * NoL + 0.001;
                vec3 specular = numerator / denominator;

                // 能量守恒：镜面占 kS，剩余给漫反射；金属无漫反射
                vec3 kS = F;
                vec3 kD = (vec3(1.0) - kS) * (1.0 - uMetallic);

                vec3 Lo = (kD * uAlbedo / PI + specular) * uLightColor * NoL;

                // 简化环境项（非 IBL）
                vec3 ambient = uAmbient * uAlbedo;
                vec3 color = ambient + Lo;

                // HDR tone mapping + gamma 校正
                color = color / (color + vec3(1.0));
                color = pow(color, vec3(1.0 / 2.2));

                gl_FragColor = vec4(color, uAlpha);
            }
        `;
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('PBRSphere shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                normalPosition: gl.getAttribLocation(shaderProgram, 'aNormal'),
            },
            uniformLocations: {
                uModelMatrix:      gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                uViewMatrix:       gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                uProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                uAlbedo:           gl.getUniformLocation(shaderProgram, 'uAlbedo'),
                uMetallic:         gl.getUniformLocation(shaderProgram, 'uMetallic'),
                uRoughness:        gl.getUniformLocation(shaderProgram, 'uRoughness'),
                uAlpha:            gl.getUniformLocation(shaderProgram, 'uAlpha'),
                uAmbient:          gl.getUniformLocation(shaderProgram, 'uAmbient'),
                uLightDir:         gl.getUniformLocation(shaderProgram, 'uLightDir'),
                uLightColor:       gl.getUniformLocation(shaderProgram, 'uLightColor'),
                uViewPos:          gl.getUniformLocation(shaderProgram, 'uViewPos'),
            },
        };
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var viMatrix = isGodView ? mGodVIMatrix : mVIMatrix;

        // 透明时启用混合（半透明球体叠加在天空盒之上）
        var transparent = _alpha < 0.999;
        if (transparent) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);   // 关闭深度写入，避免半透明自遮挡裁剪
        }

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normalPosition);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, projMatrix);
        gl.uniform3fv(programInfo.uniformLocations.uAlbedo, _albedo);
        gl.uniform1f(programInfo.uniformLocations.uMetallic, _metallic);
        gl.uniform1f(programInfo.uniformLocations.uRoughness, _roughness);
        gl.uniform1f(programInfo.uniformLocations.uAlpha, _alpha);
        gl.uniform1f(programInfo.uniformLocations.uAmbient, _ambient);
        gl.uniform3fv(programInfo.uniformLocations.uLightDir, LIGHT_POSITION);
        gl.uniform3fv(programInfo.uniformLocations.uLightColor, LIGHT_COLOR);
        gl.uniform3fv(programInfo.uniformLocations.uViewPos, [viMatrix[12], viMatrix[13], viMatrix[14]]);

        // 球体模型矩阵：应用当前拖拽旋转，便于从不同角度观察高光/边缘
        var modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -0.5]);
        mat4.rotate(modelMatrix, modelMatrix, mRolling,  [0, 0, 1]);
        mat4.rotate(modelMatrix, modelMatrix, mYawing,   [0, 1, 0]);
        mat4.rotate(modelMatrix, modelMatrix, mPitching, [1, 0, 0]);
        mat4.rotate(modelMatrix, modelMatrix, mRotAngle, mRotAxis);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMatrix, false, modelMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, buffer.drawCnt);

        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.normalPosition);

        if (transparent) {
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }
    }

    return {
        init: function (gl) {
            _sphereBuffer = initSphereBuffers(gl, 1.3, 10, vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            _program = _initShader(gl);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _sphereBuffer, isGodView);
        },
        setAlbedo:    function (r, g, b) { _albedo[0] = r; _albedo[1] = g; _albedo[2] = b; },
        setMetallic:  function (v) { _metallic = v; },
        setRoughness: function (v) { _roughness = v; },
        setAlpha:     function (v) { _alpha = v; },
        setAmbient:   function (v) { _ambient = v; },
    };
})();

// ── 全局包装函数 ──
function updatePBRSphereOptions() {
    var metallic = parseFloat(document.getElementById('id_pbr_metallic').value);
    var roughness = parseFloat(document.getElementById('id_pbr_roughness').value);
    var alpha = parseFloat(document.getElementById('id_pbr_alpha').value);
    var ambient = parseFloat(document.getElementById('id_pbr_ambient').value);
    var r = parseFloat(document.getElementById('id_pbr_albedo_r').value);
    var g = parseFloat(document.getElementById('id_pbr_albedo_g').value);
    var b = parseFloat(document.getElementById('id_pbr_albedo_b').value);

    App.PBRSphere.setMetallic(metallic);
    App.PBRSphere.setRoughness(roughness);
    App.PBRSphere.setAlpha(alpha);
    App.PBRSphere.setAmbient(ambient);
    App.PBRSphere.setAlbedo(r, g, b);

    document.getElementById('label_pbr_metallic').innerHTML = metallic.toFixed(2);
    document.getElementById('label_pbr_roughness').innerHTML = roughness.toFixed(2);
    document.getElementById('label_pbr_alpha').innerHTML = alpha.toFixed(2);
    document.getElementById('label_pbr_ambient').innerHTML = ambient.toFixed(2);
    requestRender();
}
