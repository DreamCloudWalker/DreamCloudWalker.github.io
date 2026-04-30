var App = App || {};

const VideoFilter = {
    NORMAL: 0,
    INVERSE: 1,
    SNOW_REMINISCENCE: 2,
    LUT_ILLUSION: 3,
    SOUL_OUT: 4,
};

App.Video = (function () {
    var _program = null;
    var _planeBuffer = null;
    var _planeRot180Buffer = null;
    var _texture = null;
    var _fbo = null;
    var _souloutModifyTime = 0;

    var _video = null;
    var _copyVideo = false;
    var _intervalID = null;
    var _videoFilter = VideoFilter.NORMAL;

    var _planeVertices = [];
    var _planeRot180Vertices = [];
    var _planeUvs = [];
    var _planeUvsRot90 = [];

    function _initGeometry() {
        const vertexCoords = [
            [-1.0,  1.0, 3.0],
            [ 1.0,  1.0, 3.0],
            [-1.0, -1.0, 3.0],
            [ 1.0, -1.0, 3.0],
        ];
        _planeVertices = [];
        for (var j = 0; j < vertexCoords.length; ++j) {
            _planeVertices = _planeVertices.concat(vertexCoords[j]);
        }

        const vertexCoordsRot180 = [
            [-1.0,  1.0, 0.0],
            [ 1.0,  1.0, 0.0],
            [-1.0, -1.0, 0.0],
            [ 1.0, -1.0, 0.0],
        ];
        _planeRot180Vertices = [];
        for (var j = 0; j < vertexCoordsRot180.length; ++j) {
            _planeRot180Vertices = _planeRot180Vertices.concat(vertexCoordsRot180[j]);
        }

        const uvCoords = [0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0];
        _planeUvs = [];
        for (var i = 0; i < uvCoords.length; i++) _planeUvs.push(uvCoords[i]);

        const uvCoordsRot90 = [1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        _planeUvsRot90 = [];
        for (var i = 0; i < uvCoordsRot90.length; i++) _planeUvsRot90.push(uvCoordsRot90[i]);
    }

    function _createPlaneBuffer(gl, vertices) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_planeUvs), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            uv: uvBuffer,
            drawCnt: vertices.length / 3,
        };
    }

    function _buildShader(gl) {
        var vsSource = document.getElementById('id_video_filter_vertex_shader').value;
        var fsSource = document.getElementById('id_video_filter_fragment_shader').value;

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
                uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
                uTexSamplerHandle: gl.getUniformLocation(shaderProgram, 'uTexSampler'),
                uSouloutTexSamplerHandle: gl.getUniformLocation(shaderProgram, 'uSouloutTexSampler'),
                uProgressHandle: gl.getUniformLocation(shaderProgram, 'uProgress'),
                uDrawFBOHandle: gl.getUniformLocation(shaderProgram, 'uDrawFBO'),
            },
        };
    }

    function _drawVideo(gl, program, buffers, texture, drawCount, now, deltaTime, drawFBO, isGodView) {
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(program.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.attribLocations.vertexPosition);
        }
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
            gl.vertexAttribPointer(program.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.attribLocations.textureCoord);
        }

        gl.useProgram(program.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniformLocations.uTexSamplerHandle, 0);

        if (VideoFilter.SOUL_OUT == _videoFilter && !drawFBO) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, _fbo.getTextureId());
            gl.uniform1i(program.uniformLocations.uSouloutTexSamplerHandle, 1);
            var progress = (now - _souloutModifyTime) / 1000.0;
            gl.uniform1f(program.uniformLocations.uProgressHandle, progress);
            gl.uniform1i(program.uniformLocations.uDrawFBOHandle, drawFBO ? 1 : 0);
        }

        if (isGodView) {
            gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mGodMvpMatrix);
        } else {
            gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, drawFBO ? mIdentityMatrix : mMvpMatrix);
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, drawCount);
        gl.disableVertexAttribArray(program.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(program.attribLocations.textureCoord);
    }

    return {
        init: function (gl) {
            _initGeometry();
            _planeBuffer = _createPlaneBuffer(gl, _planeVertices);
            _planeRot180Buffer = _createPlaneBuffer(gl, _planeRot180Vertices);
            _texture = createTexture(gl);
            _fbo = new FrameBufferObject(gl, gl.TEXTURE3, 512, 512);
            // shader will be built when updateYUVVideoShader() is called from UI
        },
        buildShader: function (gl) {
            _program = _buildShader(gl);
        },
        updateFilterSwitch: function () {
            var fragTextArea = document.getElementById('id_video_filter_fragment_shader');
            var fragReader = new XMLHttpRequest();
            if (document.getElementById('id_filter_normal_rb').checked) {
                _videoFilter = VideoFilter.NORMAL;
                fragReader.open('get', './shader/filter/normal.fs', false);
            } else if (document.getElementById('id_filter_inverse_rb').checked) {
                _videoFilter = VideoFilter.INVERSE;
                fragReader.open('get', './shader/filter/inverse.fs', false);
            } else if (document.getElementById('id_filter_reminiscence_rb').checked) {
                _videoFilter = VideoFilter.SNOW_REMINISCENCE;
                fragReader.open('get', './shader/filter/reminiscence.fs', false);
            } else if (document.getElementById('id_filter_lut_illusion_rb').checked) {
                _videoFilter = VideoFilter.LUT_ILLUSION;
                fragReader.open('get', './shader/filter/illusion.fs', false);
            } else if (document.getElementById('id_filter_soul_out_rb').checked) {
                _videoFilter = VideoFilter.SOUL_OUT;
                fragReader.open('get', './shader/filter/soulout.fs', false);
            } else {
                _videoFilter = VideoFilter.NORMAL;
                fragReader.open('get', './shader/filter/normal.fs', false);
            }
            fragReader.send();
            fragTextArea.innerHTML = fragReader.responseText;
            this.buildShader(mGLCanvas.getGL());
        },
        setupVideo: function (url) {
            const videoElement = document.createElement('video');
            var playing = false;
            var timeupdate = false;
            videoElement.autoplay = true;
            videoElement.src = url;
            videoElement.muted = true;
            videoElement.loop = true;
            videoElement.addEventListener('playing', function () {
                playing = true;
                if (playing && timeupdate) _copyVideo = true;
            }, true);
            videoElement.addEventListener('timeupdate', function () {
                timeupdate = true;
                if (playing && timeupdate) _copyVideo = true;
            }, true);
            videoElement.addEventListener('canplaythrough', function () { videoElement.play(); }, true);
            videoElement.addEventListener('ended', function () {
                if (!videoElement.loop) clearInterval(_intervalID);
            }, true);
            _video = videoElement;
            return videoElement;
        },
        resumeVideo: function () { if (_video) _video.play(); },
        pauseVideo: function () { if (_video) _video.pause(); },
        updateTextureFromVideo: function (gl) {
            if (!_copyVideo || !_video || !_texture) return;
            const level = 0;
            gl.bindTexture(gl.TEXTURE_2D, _texture);
            gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _video);
        },
        draw: function (gl, now, deltaTime, isGodView) {
            if (!_program || !_planeBuffer) return;

            if (VideoFilter.SOUL_OUT == _videoFilter && (now - _souloutModifyTime > 1000)) {
                _souloutModifyTime = now;
                _fbo.bind();
                _drawVideo(gl, _program, _planeRot180Buffer, _texture, _planeRot180Buffer.drawCnt, now, deltaTime, true, false);
                _fbo.unbind();
            }
            _drawVideo(gl, _program, _planeBuffer, _texture, _planeBuffer.drawCnt, now, deltaTime, false, isGodView);
        },
    };
})();

// ── 全局包装函数，保持 HTML onclick/onchange 调用不变 ──

function setupVideo(url) { return App.Video.setupVideo(url); }
function resumeVideo(video) { App.Video.resumeVideo(); }
function pauseVideo(video) { App.Video.pauseVideo(); }

function updateYUVVideoFilterSwitch() {
    App.Video.updateFilterSwitch();
    requestRender();
}

function updateYUVVideoShader() {
    App.Video.buildShader(mGLCanvas.getGL());
    requestRender();
}

function handleFileSelect(event, id) {
    var files = event.target.files;
    for (var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader();
        reader.onload = (function (theFile) {
            return function (e) {
                document.getElementById(id).value = e.target.result;
            };
        })(f);
        reader.readAsText(f);
    }
    App.Video.buildShader(mGLCanvas.getGL());
}
