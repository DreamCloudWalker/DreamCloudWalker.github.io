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
    // 计算世界坐标系下的顶点位置
    vec4 worldPosition = uModelMatrix * aPosition;
    vPosition = worldPosition.xyz;

    // 计算世界坐标系下的法线
    vNormal = normalize(vec3(uMITMatrix * vec4(aNormal, 0.0)));

    // 传递纹理坐标
    vTexCoord = aTexCoord;

    // 最终顶点位置
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}