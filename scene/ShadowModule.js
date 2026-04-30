var App = App || {};

App.Shadow = (function () {
    var _fbo = null;
    var _program = null;

    function _buildProgram(gl) {
        var vertTextArea = document.getElementById('id_fbo_vertex_shader');
        var fragTextArea = document.getElementById('id_fbo_fragment_shader');
        var vertReader = new XMLHttpRequest();
        var fragReader = new XMLHttpRequest();
        vertReader.open('get', './shader/shadow.vs', false);
        fragReader.open('get', './shader/shadow.fs', false);
        vertReader.send();
        fragReader.send();
        vertTextArea.innerHTML = vertReader.responseText;
        fragTextArea.innerHTML = fragReader.responseText;

        var vsSource = vertReader.responseText;
        var fsSource = fragReader.responseText;
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
            },
            uniformLocations: {
                uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
            },
        };
    }

    return {
        init: function (gl) {
            _program = _buildProgram(gl);
            _fbo = new FrameBufferObject(gl, gl.TEXTURE2, DEFAULT_RTT_RESOLUTION, DEFAULT_RTT_RESOLUTION);
            // 同步全局变量，保持与直接引用 mShadowProgram 代码的兼容性
            mShadowProgram = _program;
        },
        // 重新编译 shadow shader（由 HTML 按钮触发的 updateShadowProgram() 调用）
        rebuildProgram: function (gl) {
            _program = _buildProgram(gl);
            mShadowProgram = _program;
            return _program;
        },
        getFBO: function () { return _fbo; },
        getProgram: function () { return _program; },
    };
})();

// 全局包装函数，保持 HTML 按钮 onclick="updateShadowProgram()" 不变
function updateShadowProgram() {
    var gl = mGLCanvas.getGL();
    return App.Shadow.rebuildProgram(gl);
}
