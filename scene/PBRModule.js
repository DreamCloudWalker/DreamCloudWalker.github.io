var App = App || {};

App.PBR = (function () {
    var _defines = { HAS_UV: 1, USE_IBL: 1 };
    var _program = null;

    function _buildProgram(gl, vertSource, fragSource) {
        var definesToString = function (defines) {
            var outStr = '';
            for (var def in defines) {
                outStr += '#define ' + def + ' ' + defines[def] + '\n';
            }
            return outStr;
        };
        var shaderDefines = definesToString(_defines);
        var vsSource = shaderDefines + vertSource;
        var fsSource = shaderDefines + fragSource;

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
        _program = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                textureCoord: gl.getAttribLocation(shaderProgram, 'aUV'),
                normalPosition: gl.getAttribLocation(shaderProgram, 'aNormal'),
                tangentVector: gl.getAttribLocation(shaderProgram, 'aTangent'),
            },
            uniformLocations: {
                uMITHandle: gl.getUniformLocation(shaderProgram, 'uMITMatrix'),
                uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
                uModelMatrixHandle: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                uVIMatrixHandle: gl.getUniformLocation(shaderProgram, 'uVIMatrix'),
                uLightDirHandle: gl.getUniformLocation(shaderProgram, 'uLightDirection'),
                uLightColorHandle: gl.getUniformLocation(shaderProgram, 'uLightColor'),
                uDiffuseEnvHandle: gl.getUniformLocation(shaderProgram, 'uDiffuseEnvSampler'),
                uSpecularEnvHandle: gl.getUniformLocation(shaderProgram, 'uSpecularEnvSampler'),
                uBrdfLUTHandle: gl.getUniformLocation(shaderProgram, 'uBrdfLUT'),
                uBaseColorSamplerHandle: gl.getUniformLocation(shaderProgram, 'uBaseColorSampler'),
                uNormalSamplerHandle: gl.getUniformLocation(shaderProgram, 'uNormalSampler'),
                uNormalScaleHandle: gl.getUniformLocation(shaderProgram, 'uNormalScale'),
                uEmissiveSamplerHandle: gl.getUniformLocation(shaderProgram, 'uEmissiveSampler'),
                uEmissiveFactorHandle: gl.getUniformLocation(shaderProgram, 'uEmissiveFactor'),
                uMetallicSamplerHandle: gl.getUniformLocation(shaderProgram, 'uMetallicSampler'),
                uRoughnessSamplerHandle: gl.getUniformLocation(shaderProgram, 'uRoughnessSampler'),
                uOcclusionSamplerHandle: gl.getUniformLocation(shaderProgram, 'uOcclusionSampler'),
                uOcclusionStrengthHandle: gl.getUniformLocation(shaderProgram, 'uOcclusionStrength'),
                uMetallicValuesHandle: gl.getUniformLocation(shaderProgram, 'uMetallicValues'),
                uRoughnessValuesHandle: gl.getUniformLocation(shaderProgram, 'uRoughnessValues'),
                uBaseColorFactorHandle: gl.getUniformLocation(shaderProgram, 'uBaseColorFactor'),
                uScaleDiffBaseMRHandle: gl.getUniformLocation(shaderProgram, 'uScaleDiffBaseMR'),
                uScaleFGDSpecHandle: gl.getUniformLocation(shaderProgram, 'uScaleFGDSpec'),
                uScaleIBLAmbientHandle: gl.getUniformLocation(shaderProgram, 'uScaleIBLAmbient'),
                uCameraHandle: gl.getUniformLocation(shaderProgram, 'uCamera'),
            },
        };
        // 同步全局变量，兼容直接引用 mPBRLightProgram 的现有代码
        mPBRLightProgram = _program;
        return _program;
    }

    return {
        buildShader: function (gl, demoType) {
            var vertTextArea = document.getElementById('id_light_vertex_shader');
            var fragTextArea = document.getElementById('id_light_fragment_shader');
            if (demoType === 'shadowDemo') {
                vertTextArea = document.getElementById('id_shadow_vertex_shader');
                fragTextArea = document.getElementById('id_shadow_fragment_shader');
            }
            var vertReader = new XMLHttpRequest();
            var fragReader = new XMLHttpRequest();
            vertReader.open('get', './shader/pbr_lighting.vs', false);
            fragReader.open('get', './shader/pbr_lighting.fs', false);
            vertReader.send();
            fragReader.send();
            vertTextArea.innerHTML = vertReader.responseText;
            fragTextArea.innerHTML = fragReader.responseText;

            _defines.HAS_NORMALS = 1;
            if (null != mObjectDiffuseTexture)  _defines.HAS_BASECOLORMAP = 1;
            if (null != mObjectNormalTexture)    _defines.HAS_NORMALMAP = 1;
            if (null != mObjectEmissiveTexture)  _defines.HAS_EMISSIVEMAP = 1;
            if (null != mObjectMetalnessTexture) _defines.HAS_METALMAP = 1;
            if (null != mObjectRoughnessTexture) _defines.HAS_ROUGHNESSMAP = 1;

            _buildProgram(gl, vertTextArea.value, fragTextArea.value);
            requestRender();
        },
        getProgram: function () { return _program; },
    };
})();

// ── 全局包装函数，保持 HTML 按钮调用不变 ──

function initPBRLightingShader(demoType) {
    App.PBR.buildShader(mGLCanvas.getGL(), demoType);
}
