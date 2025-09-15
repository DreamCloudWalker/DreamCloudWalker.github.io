attribute vec3 aPosition;
varying vec3 vTexCoord;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    // mat4 viewMatrix = mat4(mat3(uViewMatrix)); // 移除平移部分
    vTexCoord = aPosition;
    gl_Position = uProjectionMatrix * mat4(mat3(uViewMatrix)) * vec4(aPosition, 1.0);
    gl_Position.z = gl_Position.w; // 确保天空盒在最远处
}