precision highp float;
varying vec4 vTexCoord;

uniform samplerCube uSkybox;
uniform mat4 uViewDirectionProjectionInverse;

void main() {
    vec4 t = uViewDirectionProjectionInverse * v_position;
    gl_FragColor = textureCube(uSkybox, normalize(t.xyz / t.w));
}