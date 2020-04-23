precision mediump float;

uniform sampler2D uTexDiffuseSampler;
uniform sampler2D uTexNormalSampler;
uniform int uUseNormalMapping;

uniform int uUseAmbient;
uniform int uUseDiffuse;
uniform int uUseSpecular;
uniform float uSpecular;
uniform vec4 uKa;
uniform vec4 uKd;
uniform vec4 uKs;

varying vec4 vPosition;
varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec3 vLightDir;
varying vec4 vViewDir;

void main() {
    vec4 color = texture2D(uTexDiffuseSampler, vTexCoord);
    vec4 defaultColor = vec4(0.0, 0.0, 0.0, 0.0);

    vec3 reflectDir = normalize(2.0 * dot(vNormal, vLightDir) * vNormal - vLightDir);
    vec4 ambientColor = (1 == uUseAmbient) ? uKa : defaultColor;
    vec4 diffuseColor = (1 == uUseDiffuse) ? vec4(uKd.rgb * clamp(dot(vNormal, vLightDir), 0.0, 1.0), uKd.a) : defaultColor;
    vec4 specularColor = (1 == uUseSpecular) ? vec4(uKs.rgb * pow(clamp(dot(reflectDir, vec3(vViewDir.xyz)), 0.0, 1.0), uSpecular), uKs.a) : defaultColor;
    if (1 == uUseNormalMapping && 1 == uUseDiffuse) {
        vec3 normal = texture2D(uTexNormalSampler, vTexCoord).rgb;
        normal = normalize(normal * 2.0 - 1.0); // (0.0~1.0) -> (-1.0~1.0)
        diffuseColor = diffuseColor * (max(0.0, dot(normal, vLightDir)));
    }
    gl_FragColor = (ambientColor + diffuseColor + specularColor) * color;
    gl_FragColor.a = 1.0;
}