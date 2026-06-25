var App = App || {};

// 球体光照 demo（per-vertex vs per-fragment 切换）
App.Sphere = (function () {
    var _program = null;
    var _buffer = null;
    var _isPerFrag = false;

    function _buildShader(gl) {
        var vsSource, fsSource;
        if (_isPerFrag) {
            vsSource = document.getElementById('id_per_frag_vertex_shader').value;
            fsSource = document.getElementById('id_per_frag_fragment_shader').value;
        } else {
            vsSource = document.getElementById('id_per_vertex_vertex_shader').value;
            fsSource = document.getElementById('id_per_vertex_fragment_shader').value;
        }

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
                vertexColor: gl.getAttribLocation(shaderProgram, 'aColor'),
                normalPosition: gl.getAttribLocation(shaderProgram, 'aNormal'),
            },
            uniformLocations: {
                uProjectionMatrixHandle: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                uModelMatrixHandle: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                uViewMatrixHandle: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                uVIHandle: gl.getUniformLocation(shaderProgram, 'uVIMatrix'),
                uMITHandle: gl.getUniformLocation(shaderProgram, 'uMITMatrix'),
                uSpecularHandle: gl.getUniformLocation(shaderProgram, 'uSpecular'),
                uKaHandle: gl.getUniformLocation(shaderProgram, 'uKa'),
                uKdHandle: gl.getUniformLocation(shaderProgram, 'uKd'),
                uKsHandle: gl.getUniformLocation(shaderProgram, 'uKs'),
                uLightDirHandle: gl.getUniformLocation(shaderProgram, 'uLightDir'),
            },
        };
        // 同步全局变量，兼容可能直接引用 mSphereProgram 的现有代码
        mSphereProgram = _program;
        return _program;
    }

    function _draw(gl, lightingProgram, buffers, drawCount, deltaTime, isGodView) {
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(lightingProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(lightingProgram.attribLocations.vertexPosition);
        }
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
            gl.vertexAttribPointer(lightingProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(lightingProgram.attribLocations.normalPosition);
        }
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
            gl.vertexAttribPointer(lightingProgram.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(lightingProgram.attribLocations.vertexColor);
        }

        gl.useProgram(lightingProgram.program);
        gl.uniformMatrix4fv(lightingProgram.uniformLocations.uModelMatrixHandle, false, mModelMatrix);
        gl.uniformMatrix4fv(lightingProgram.uniformLocations.uMITHandle, false, mMITMatrix);
        if (isGodView) {
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uProjectionMatrixHandle, false, mGodProjectionMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uViewMatrixHandle, false, mGodViewMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uVIHandle, false, mGodVIMatrix);
        } else {
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uProjectionMatrixHandle, false, mProjectionMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uViewMatrixHandle, false, mViewMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uVIHandle, false, mVIMatrix);
        }
        gl.uniform1f(lightingProgram.uniformLocations.uSpecularHandle, mSpecularShininess);
        gl.uniform4fv(lightingProgram.uniformLocations.uKaHandle, mAmbientColor);
        gl.uniform4fv(lightingProgram.uniformLocations.uKdHandle, mDiffuseColor);
        gl.uniform4fv(lightingProgram.uniformLocations.uKsHandle, mSpecularColor);
        gl.uniform3fv(lightingProgram.uniformLocations.uLightDirHandle, LIGHT_POSITION);

        gl.drawArrays(gl.TRIANGLES, 0, drawCount);
    }

    return {
        init: function (gl) {
            // 用较粗的细分（45°/段），让逐顶点 vs 逐像素的差异明显：
            // 粗网格上逐顶点光照会把高光在大三角面间线性插值 → 高光被拉成多边形/发散甚至丢失；
            // 逐像素则在每个片元重新算 → 高光始终是锐利的圆点。球太细就看不出区别。
            _buffer = initSphereBuffers(gl, 1.0, 45, vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            mSphereBuffer = _buffer;
            _buildShader(gl);
        },
        rebuildShader: function (gl) {
            _buildShader(gl);
        },
        setPerFrag: function (isPerFrag) {
            _isPerFrag = isPerFrag;
        },
        draw: function (gl, deltaTime, isGodView) {
            if (!_program || !_buffer) return;
            _draw(gl, _program, _buffer, _buffer.drawCnt, deltaTime, isGodView);
        },
    };
})();

// ── 全局包装函数，保持 HTML radio button 调用不变 ──

function updateSphereShader() {
    App.Sphere.rebuildShader(mGLCanvas.getGL());
}

function updatePerVflSwitch() {
    var perVertexChecked = document.getElementById('id_per_vertex_rb').checked;
    var perFragChecked = document.getElementById('id_per_frag_rb').checked;
    var isPerFrag = perFragChecked && !perVertexChecked;
    App.Sphere.setPerFrag(isPerFrag);

    if (isPerFrag) {
        document.getElementById('id_per_vertex_shader').style.display = 'none';
        document.getElementById('id_per_frag_shader').style.display = 'flex';
    } else {
        document.getElementById('id_per_vertex_shader').style.display = 'flex';
        document.getElementById('id_per_frag_shader').style.display = 'none';
    }
    App.Sphere.rebuildShader(mGLCanvas.getGL());
    requestRender();
}
