precision mediump float;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

uniform vec3 uLightPosition;         // 光源位置
uniform vec3 uLightColor;            // 光源颜色
uniform vec3 uCameraPosition;        // 摄像机位置

uniform sampler2D uBaseColorMap;     // 基础颜色纹理
uniform sampler2D uNormalMap;        // 法线纹理
uniform sampler2D uRoughnessMap;     // 粗糙度纹理
uniform sampler2D uMetallicMap;      // 金属度纹理

#define PI 3.14159265359

// Fresnel-Schlick 近似
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

// GGX 法线分布函数
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;

    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    return a2 / (PI * denom * denom);
}

// 几何遮蔽函数
float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;

    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return num / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float ggx1 = GeometrySchlickGGX(max(dot(N, V), 0.0), roughness);
    float ggx2 = GeometrySchlickGGX(max(dot(N, L), 0.0), roughness);
    return ggx1 * ggx2;
}

void main() {
    // 从纹理中采样
    vec3 albedo = texture2D(uBaseColorMap, vTexCoord).rgb;
    vec3 normal = normalize(texture2D(uNormalMap, vTexCoord).rgb * 2.0 - 1.0);
    float roughness = texture2D(uRoughnessMap, vTexCoord).r;
    float metallic = texture2D(uMetallicMap, vTexCoord).r;

    // 光照计算
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPosition - vPosition);
    vec3 L = normalize(uLightPosition - vPosition);
    vec3 H = normalize(V + L);

    // Fresnel-Schlick 反射率
    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

    // 法线分布函数
    float NDF = DistributionGGX(N, H, roughness);

    // 几何遮蔽函数
    float G = GeometrySmith(N, V, L, roughness);

    // 反射光分量
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
    vec3 specular = numerator / max(denominator, 0.001);

    // 漫反射光分量
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;

    float NdotL = max(dot(N, L), 0.0);
    vec3 Lo = (kD * albedo / PI + specular) * uLightColor * NdotL;

    // 最终颜色
    vec3 color = Lo;

    // Gamma 校正
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
}