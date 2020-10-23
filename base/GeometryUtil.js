const TWO_PI = Math.PI * 2.0;
const DEGREE_TO_RADIUS = Math.PI / 180;
const RADIUS_TO_DEGREE = 180 / Math.PI;
const ICOSAHEDRON_SHORT = 0.525731112119133606;
const ICOSAHEDRON_LONG = 0.850650808352039932;

/****************************** Sphere ******************************/
function initSphereBuffers(gl, radius, spanDegree, color) {
    var vertices = createSphereByLL(radius, spanDegree);
    var normals = vertices;
    var colors = [];

    for (var i = 0; i < vertices.length; i += 3) {
        colors.push(color[0]);
        colors.push(color[1]);
        colors.push(color[2]);
        colors.push(color[3]);
    }

    /* create buffer */
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 

    // normal
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        normal: normalBuffer,
        drawCnt: vertices.length / 3,
    };
}

function createSphereByLL(sphereRadius, sphereSpanDegree) {
    const positions = [];
    for (var vAngle = -90; vAngle < 90; vAngle += sphereSpanDegree) {
        for (var hAngle = 0; hAngle <= 360; hAngle += sphereSpanDegree) {
            var x0 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.cos(hAngle * DEGREE_TO_RADIUS);
            var y0 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.sin(hAngle * DEGREE_TO_RADIUS);
            var z0 = sphereRadius * Math.sin(vAngle * DEGREE_TO_RADIUS);

            var x1 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.cos((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var y1 = sphereRadius * Math.cos(vAngle * DEGREE_TO_RADIUS) * Math.sin((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var z1 = sphereRadius * Math.sin(vAngle * DEGREE_TO_RADIUS);

            var x2 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.cos((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var y2 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.sin((hAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);
            var z2 = sphereRadius * Math.sin((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);

            var x3 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.cos(hAngle * DEGREE_TO_RADIUS);
            var y3 = sphereRadius * Math.cos((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS) * Math.sin(hAngle * DEGREE_TO_RADIUS);
            var z3 = sphereRadius * Math.sin((vAngle + sphereSpanDegree) * DEGREE_TO_RADIUS);

            positions.push(x1);
            positions.push(y1);
            positions.push(z1);
            positions.push(x3);
            positions.push(y3);
            positions.push(z3);
            positions.push(x0);
            positions.push(y0);
            positions.push(z0);

            positions.push(x1);
            positions.push(y1);
            positions.push(z1);
            positions.push(x2);
            positions.push(y2);
            positions.push(z2);
            positions.push(x3);
            positions.push(y3);
            positions.push(z3);
        }
    }
    return positions;
}

function createSphereBySubdivideIcosahedron(subdivideLevel) {
    var vectors = [
        vec3.fromValues(0,                  ICOSAHEDRON_LONG,   -ICOSAHEDRON_SHORT),
        vec3.fromValues(0,                  ICOSAHEDRON_LONG,   ICOSAHEDRON_SHORT),
        vec3.fromValues(ICOSAHEDRON_LONG,   ICOSAHEDRON_SHORT,  0),
        vec3.fromValues(ICOSAHEDRON_SHORT,  0,                  -ICOSAHEDRON_LONG),
        vec3.fromValues(-ICOSAHEDRON_SHORT, 0,                  -ICOSAHEDRON_LONG),
        vec3.fromValues(-ICOSAHEDRON_LONG,  ICOSAHEDRON_SHORT,  0),

        vec3.fromValues(-ICOSAHEDRON_SHORT, 0,                  ICOSAHEDRON_LONG),
        vec3.fromValues(ICOSAHEDRON_SHORT,  0,                  ICOSAHEDRON_LONG),
        vec3.fromValues(ICOSAHEDRON_LONG,   -ICOSAHEDRON_SHORT, 0),
        vec3.fromValues(0,                  -ICOSAHEDRON_LONG,  -ICOSAHEDRON_SHORT),
        vec3.fromValues(-ICOSAHEDRON_LONG,  -ICOSAHEDRON_SHORT, 0),
        vec3.fromValues(0,                  -ICOSAHEDRON_LONG,  ICOSAHEDRON_SHORT) 
    ];
    var indices = [
        0,1,2,
        0,2,3,
        0,3,4,
        0,4,5,
        0,5,1,

        1,6,7,
        1,7,2,
        2,7,8,
        2,8,3,
        3,8,9,
        3,9,4,
        4,9,10,
        4,10,5,
        5,10,6,
        5,6,1,

        6,11,7,
        7,11,8,
        8,11,9,
        9,11,10,
        10,11,6 
    ];

    for (var i = 0; i < subdivideLevel; i++) {
        var tmpVecs = [];
        var j = 0
        for (; j < vectors.length - 1; j++) {
            var centerVec = getCenterVecFromTwoVec(vectors[j], vectors[j+1]);
            vec3.normalize(centerVec,  centerVec);
            tmpVecs.push(vectors[j]);
            tmpVecs.push(centerVec);
        }
        tmpVecs.push(vectors[j]);

        vectors = tmpVecs;
    }

    var position = [];
    for (var i = 0; i < vectors.length - 1; i++) {
        position.push(vectors[i][0]);
        position.push(vectors[i][1]);
        position.push(vectors[i][2]);
    }

    return position;
}

function getCenterVecFromTwoVec(vec1, vec2) {
    return vec3.fromValues((vec1[0] + vec2[0]) / 2, (vec1[1] + vec2[1]) / 2, (vec1[2] + vec2[2]) / 2);
}

/****************************** Cylinder ******************************/
function initCylinderBuffers(gl, radius, height, steps, color, offset, dir) {
    var subdivideDegree = TWO_PI / steps;
    var vertices = [];
    var normals = [];
    var colors = [];
    // cylinder tube, triangle_strip
    for (var angle = 0.0; angle < TWO_PI; angle += subdivideDegree) {
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (dir == TubeDir.DIR_X) {
            vertices.push(-height / 2.0 + offset[0]);
            vertices.push(x + offset[1]);
            vertices.push(y + offset[2]);
        } else if (dir == TubeDir.DIR_Z) {
            vertices.push(x + offset[0]);
            vertices.push(y + offset[1]);
            vertices.push(-height / 2.0 + offset[2]);
        } else {
            vertices.push(x + offset[0]);
            vertices.push(-height / 2.0 + offset[1]);
            vertices.push(y + offset[2]);
        }
    }
    for (var angle = 0.0; angle < TWO_PI; angle += subdivideDegree) {
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (dir == TubeDir.DIR_X) {
            vertices.push(height / 2.0 + offset[0]);
            vertices.push(x + offset[1]);
            vertices.push(y + offset[2]);
        } else if (dir == TubeDir.DIR_Z) {
            vertices.push(x + offset[0]);
            vertices.push(y + offset[1]);
            vertices.push(height / 2.0 + offset[2]);
        } else {
            vertices.push(x + offset[0]);
            vertices.push(height / 2.0 + offset[1]);
            vertices.push(y + offset[2]);
        }
    }
    
    if (dir == TubeDir.DIR_X) {
        // top center
        vertices.push(-height / 2.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
        // bottom center
        vertices.push(height / 2.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
    } else if (dir == TubeDir.DIR_Z) {
        // top center
        vertices.push(0.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(-height / 2.0 + offset[2]);
        // bottom center
        vertices.push(0.0 + offset[0]);
        vertices.push(0.0 + offset[1]);
        vertices.push(height / 2.0 + offset[2]);
    } else {
        // top center
        vertices.push(0.0 + offset[0]);
        vertices.push(-height / 2.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
        // bottom center
        vertices.push(0.0 + offset[0]);
        vertices.push(height / 2.0 + offset[1]);
        vertices.push(0.0 + offset[2]);
    }

    normals = vertices;

    for (var i = 0; i < vertices.length; i += 3) {
        colors.push(color[0]);
        colors.push(color[1]);
        colors.push(color[2]);
        colors.push(color[3]);
    }

    var indices = new Array(4 * steps * 3);
    for (var i = 0; i < steps; ++i) {
        var i1 = i;
        var i2 = (i1 + 1) % steps;
        var i3 = i1 + steps;
        var i4 = i2 + steps;

        // sides
        indices[i * 6 + 0] = i1;
        indices[i * 6 + 1] = i3;
        indices[i * 6 + 2] = i2;

        indices[i * 6 + 3] = i4;
        indices[i * 6 + 4] = i2;
        indices[i * 6 + 5] = i3;
        // caps
        indices[steps * 6 + i * 6 + 0] = steps * 2 + 0;   // top center
        indices[steps * 6 + i * 6 + 1] = i1;
        indices[steps * 6 + i * 6 + 2] = i2;
        
        indices[steps * 6 + i * 6 + 3] = steps * 2 + 1;   // bottom center
        indices[steps * 6 + i * 6 + 4] = i4;
        indices[steps * 6 + i * 6 + 5] = i3;
    }

    /* create buffer */
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 

    // normal
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // index
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        drawCnt: indices.length,
    };
}

/****************************** Tube ******************************/
function initTubeBuffers(gl, innerRadius, outerRadius, height, steps, color, dir) {
    var subdivideDegree = TWO_PI / steps;
    var vertices = [];
    var normals = [];
    var colors = [];
    var indices = [];
    // cylinder tube, triangle_strip
    for (var angle = 0.0; angle < TWO_PI; angle += subdivideDegree) {
        var xOuterBottom;
        var yOuterBottom;
        var zOuterBottom;
        var xOuterTop;
        var yOuterTop;
        var zOuterTop;

        var xInnerBottom;
        var yInnerBottom;
        var zInnerBottom;
        var xInnerTop;
        var yInnerTop;
        var zInnerTop;
        if (dir == TubeDir.DIR_X) {
            xOuterBottom = -height / 2.0;
            yOuterBottom = outerRadius * Math.cos(angle);
            zOuterBottom = outerRadius * Math.sin(angle);
            xOuterTop = height / 2.0;
            yOuterTop = outerRadius * Math.cos(angle);
            zOuterTop = outerRadius * Math.sin(angle);

            xInnerBottom = -height / 2.0;
            yInnerBottom = innerRadius * Math.cos(angle);
            zInnerBottom = innerRadius * Math.sin(angle);
            xInnerTop = height / 2.0;
            yInnerTop = innerRadius * Math.cos(angle);
            zInnerTop = innerRadius * Math.sin(angle);
        } else if (dir == TubeDir.DIR_Z) {
            xOuterBottom = outerRadius * Math.cos(angle);
            yOuterBottom = outerRadius * Math.sin(angle);
            zOuterBottom = -height / 2.0;
            xOuterTop = outerRadius * Math.cos(angle);
            yOuterTop = outerRadius * Math.sin(angle);
            zOuterTop = height / 2.0;

            xInnerBottom = innerRadius * Math.cos(angle);
            yInnerBottom = innerRadius * Math.sin(angle);
            zInnerBottom = -height / 2.0;
            xInnerTop = innerRadius * Math.cos(angle);
            yInnerTop = innerRadius * Math.sin(angle);
            zInnerTop = height / 2.0;
        } else {    // default TubeDir.DIR_Y, y axis is the tube's pivot
            xOuterBottom = outerRadius * Math.cos(angle);
            yOuterBottom = -height / 2.0;
            zOuterBottom = outerRadius * Math.sin(angle);
            xOuterTop = outerRadius * Math.cos(angle);
            yOuterTop = height / 2.0;
            zOuterTop = outerRadius * Math.sin(angle);

            xInnerBottom = innerRadius * Math.cos(angle);
            yInnerBottom = -height / 2.0;
            zInnerBottom = innerRadius * Math.sin(angle);
            xInnerTop = innerRadius * Math.cos(angle);
            yInnerTop = height / 2.0;
            zInnerTop = innerRadius * Math.sin(angle);
        }

        vertices.push(xOuterBottom);
        vertices.push(yOuterBottom);
        vertices.push(zOuterBottom);
        vertices.push(xOuterTop);
        vertices.push(yOuterTop);
        vertices.push(zOuterTop);
        vertices.push(xInnerBottom);
        vertices.push(yInnerBottom);
        vertices.push(zInnerBottom);
        vertices.push(xInnerTop);
        vertices.push(yInnerTop);
        vertices.push(zInnerTop);
    }

    // TODO normal
    normals = vertices;
    
    // colors
    for (var i = 0; i < vertices.length; i += 3) {
        colors.push(color[0]);
        colors.push(color[1]);
        colors.push(color[2]);
        colors.push(color[3]);
    }

    // indiceNum = innerSideIndiceNum + outterSideIndiceNum + bottomCapIndiceNum + topCapIndiceNum;
    var indiceNum = (steps * 2 * 3) * 4; 
    var indices = new Array(indiceNum);
    for (var i = 0; i < steps; ++i) {
        var i1 = i * 4;
        var i2 = (i1 + 1) % (steps * 4);
        var i3 = (i1 + 2) % (steps * 4);
        var i4 = (i1 + 3) % (steps * 4);
        var i5 = (i1 + 4) % (steps * 4);
        var i6 = (i1 + 5) % (steps * 4);
        var i7 = (i1 + 6) % (steps * 4);
        var i8 = (i1 + 7) % (steps * 4);

        // outter sides
        indices[i * 24 + 0] = i1;
        indices[i * 24 + 1] = i2;
        indices[i * 24 + 2] = i5;

        indices[i * 24 + 3] = i2;
        indices[i * 24 + 4] = i6;
        indices[i * 24 + 5] = i5;

        // top caps
        indices[i * 24 + 6] = i2;
        indices[i * 24 + 7] = i8;
        indices[i * 24 + 8] = i6;

        indices[i * 24 + 9] = i2;
        indices[i * 24 + 10] = i4;
        indices[i * 24 + 11] = i8;

        // inner sides
        indices[i * 24 + 12] = i4;
        indices[i * 24 + 13] = i3;
        indices[i * 24 + 14] = i8;

        indices[i * 24 + 15] = i3;
        indices[i * 24 + 16] = i7;
        indices[i * 24 + 17] = i8;

        // bottom caps
        indices[i * 24 + 18] = i3;
        indices[i * 24 + 19] = i5;
        indices[i * 24 + 20] = i7;

        indices[i * 24 + 21] = i3;
        indices[i * 24 + 22] = i1;
        indices[i * 24 + 23] = i5;
    }

    /* create buffer */
    // Create a buffer for the sphere's positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 

    // normal
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // index
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        indices: indexBuffer,
        drawCnt: indices.length,
    };
}
