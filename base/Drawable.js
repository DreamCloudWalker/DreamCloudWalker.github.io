function drawArrays(gl, basicProgram, buffers, vertexCount, mvpMatrix, drawType, deltaTime) {
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(basicProgram.program);
    gl.uniformMatrix4fv(basicProgram.uniformLocations.uMVPMatrixHandle, false, mvpMatrix);

    const drawOffset = 0;
    gl.drawArrays(drawType, drawOffset, vertexCount);
}

function drawElements(gl, basicProgram, buffers, vertexCount, mvpMatrix, drawType, deltaTime) {
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the normals from the normal
    // buffer into the normalPosition attribute.
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.normalPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.normalPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            basicProgram.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            basicProgram.attribLocations.vertexColor);
    }

    // Tell WebGL which indices to use to index the vertices
    {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(basicProgram.program);
    gl.uniformMatrix4fv(basicProgram.uniformLocations.uMVPMatrixHandle, false, mvpMatrix);

    const drawOffset = 0;
    const dataType = gl.UNSIGNED_SHORT;
    gl.drawElements(drawType, vertexCount, dataType, drawOffset);
}