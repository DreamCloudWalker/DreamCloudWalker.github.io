precision mediump float;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

uniform vec3 uLightPosition;     // 光源位置
uniform vec3 uLightColor;        // 光源颜色
uniform vec3 uCameraPosition;   // 摄像机位置

uniform sampler2D uBaseColorMap;   // 漫反射纹理
uniform sampler2D uMetallicMap;  // 高光纹理

// Phong光照参数
uniform float uShininess;        // 高光指数（替代roughness）
uniform vec3 uAmbientColor;      // 环境光颜色

void main() {
    // 从纹理采样
    vec3 diffuseColor = texture2D(uBaseColorMap, vTexCoord).rgb;
    vec3 specularColor = texture2D(uMetallicMap, vTexCoord).rgb;
    
    // 向量计算
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPosition - vPosition);
    vec3 V = normalize(uCameraPosition - vPosition);
    vec3 R = reflect(-L, N); // 反射向量（Phong核心）
    
    // 环境光分量
    vec3 ambient = uAmbientColor * diffuseColor;
    
    // 漫反射分量（Lambert）
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = diff * diffuseColor * uLightColor;
    
    // 镜面反射分量（Phong）
    float spec = pow(max(dot(R, V), 0.0), uShininess);
    vec3 specular = spec * specularColor * uLightColor;
    
    // 合并光照
    vec3 result = ambient + diffuse + specular;
    
    // Gamma校正（可选）
    result = pow(result, vec3(1.0/2.2));
    
    gl_FragColor = vec4(result, 1.0);
}