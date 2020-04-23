attribute vec4 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uLightDir;
uniform mat4 uVIMatrix;
uniform mat4 uMITMatrix;    // Inverse & Transpose of Model Matrix

varying vec4 vPosition;
varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vLightDir;
varying vec4 vViewDir;

void main() {
    vec4 pntPos = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
    gl_Position = pntPos;
    vPosition = uModelMatrix * aPosition;
    vNormal = normalize(vec3(uMITMatrix * vec4(aNormal, 0.0)));
    vLightDir = normalize(uLightDir);
    vViewDir = normalize(uVIMatrix * vec4(0.0, 0.0, 0.0, 1.0) - vPosition);
    vTexCoord = aTexCoord;
}