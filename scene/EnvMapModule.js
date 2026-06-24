var App = App || {};

// 环境映射（Environment Mapping）反射/折射 demo
// 一个球体 + 天空盒背景。球面像镜子/玻璃一样映出周围的天空盒：
//   反射：把视线 V 关于法线 N 反射，得到方向 R = reflect(-V, N)，用 R 采样 cubemap。
//   折射：视线穿过表面发生弯折，方向 R = refract(-V, N, eta)，用 R 采样 cubemap。
//   菲涅尔：正对表面时偏折射(透光)，掠射边缘时偏反射 —— 用 Schlick 在两者间混合，更真实。
//
// 复用 App.SkyBox 已加载的 cubemap（getTexture()），无需重复加载贴图。
//
// 控制：反射/折射/菲涅尔混合 三种模式、折射率(eta)、反射强度。
App.EnvMap = (function () {
    var _program = null;
    var _sphereBuffer = null;

    var _mode = 0;        // 0=纯反射 1=纯折射 2=菲涅尔混合
    var _eta = 0.66;      // 折射率比 (空气/玻璃≈1/1.5)
    var _reflectivity = 1.0;

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
                vWorldNormal = normalize(mat3(uModelMatrix) * aNormal);
            }
        `;
        var fsSource = `
            precision highp float;
            uniform samplerCube uEnvMap;
            uniform vec3  uViewPos;
            uniform int   uMode;          // 0反射 1折射 2菲涅尔
            uniform float uEta;           // 折射率比
            uniform float uReflectivity;  // 反射强度
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;

            void main() {
                vec3 N = normalize(vWorldNormal);
                vec3 V = normalize(vWorldPos - uViewPos);   // 入射视线方向（相机→表面）

                vec3 reflectDir = reflect(V, N);
                vec3 refractDir = refract(V, N, uEta);
                vec3 reflectCol = textureCube(uEnvMap, reflectDir).rgb;
                vec3 refractCol = textureCube(uEnvMap, refractDir).rgb;

                vec3 color;
                if (uMode == 0) {
                    color = reflectCol * uReflectivity;
                } else if (uMode == 1) {
                    color = refractCol;
                } else {
                    // Schlick 菲涅尔：F0≈0.04（玻璃），边缘 NoV→0 时趋向全反射
                    float NoV = max(dot(N, -V), 0.0);
                    float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
                    color = mix(refractCol, reflectCol, F);
                }
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('EnvMap shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
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
                uEnvMap:           gl.getUniformLocation(shaderProgram, 'uEnvMap'),
                uViewPos:          gl.getUniformLocation(shaderProgram, 'uViewPos'),
                uMode:             gl.getUniformLocation(shaderProgram, 'uMode'),
                uEta:              gl.getUniformLocation(shaderProgram, 'uEta'),
                uReflectivity:     gl.getUniformLocation(shaderProgram, 'uReflectivity'),
            },
        };
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;
        var envTex = App.SkyBox.getTexture();
        if (!envTex) return;   // 天空盒还没加载完

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var viMatrix = isGodView ? mGodVIMatrix : mVIMatrix;

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normalPosition);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, projMatrix);
        gl.uniform3fv(programInfo.uniformLocations.uViewPos, [viMatrix[12], viMatrix[13], viMatrix[14]]);
        gl.uniform1i(programInfo.uniformLocations.uMode, _mode);
        gl.uniform1f(programInfo.uniformLocations.uEta, _eta);
        gl.uniform1f(programInfo.uniformLocations.uReflectivity, _reflectivity);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, envTex);
        gl.uniform1i(programInfo.uniformLocations.uEnvMap, 0);

        // 球体模型矩阵：应用拖拽旋转，让反射随视角变化更直观
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
    }

    return {
        init: function (gl) {
            _sphereBuffer = initSphereBuffers(gl, 1.3, 20, vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            _program = _initShader(gl);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _sphereBuffer, isGodView);
        },
        setMode:         function (v) { _mode = v; },
        setEta:          function (v) { _eta = v; },
        setReflectivity: function (v) { _reflectivity = v; },
    };
})();

// ── 全局包装函数 ──
function updateEnvMapOptions() {
    var mode = 0;
    if (document.getElementById('id_envmap_refract').checked) mode = 1;
    else if (document.getElementById('id_envmap_fresnel').checked) mode = 2;
    App.EnvMap.setMode(mode);

    var eta = parseFloat(document.getElementById('id_envmap_eta').value);
    App.EnvMap.setEta(eta);
    document.getElementById('label_envmap_eta').innerHTML = eta.toFixed(2);

    var refl = parseFloat(document.getElementById('id_envmap_reflectivity').value);
    App.EnvMap.setReflectivity(refl);
    document.getElementById('label_envmap_reflectivity').innerHTML = refl.toFixed(2);

    requestRender();
}
