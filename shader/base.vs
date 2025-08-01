attribute vec4 aPosition;
attribute vec2 aTexCoord;

uniform mat4   uModelMatrix;
uniform mat4   uViewMatrix;
uniform mat4   uProjectionMatrix;

varying vec2   vTexCoord;

void main() {
    vec4 pntPos = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition.x, aPosition.y, aPosition.z, 1);
    gl_Position = pntPos;

    vTexCoord = aTexCoord;
}