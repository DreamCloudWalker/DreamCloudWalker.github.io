attribute vec4 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uMITMatrix;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

void main() {
    vec4 worldPosition = uModelMatrix * aPosition;
    vPosition = worldPosition.xyz;
    vNormal = normalize(vec3(uMITMatrix * vec4(aNormal, 0.0)));
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}