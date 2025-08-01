precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uLutTexture;
uniform float uTileSize;
uniform vec2 uLutSize;

varying vec2 vTexCoord;

void main() {
    vec4 textureColor = texture2D(uTexture, vTexCoord);
    highp float blueColor = textureColor.b * (uTileSize * uTileSize - 1.0);

    // 计算方格索引
    highp float quad1Y = floor(floor(blueColor) / uTileSize);
    highp vec2 quad1 = vec2(floor(blueColor) - quad1Y * uTileSize, quad1Y);
    
    highp float quad2Y = floor(ceil(blueColor) / uTileSize);
    highp vec2 quad2 = vec2(ceil(blueColor) - quad2Y * uTileSize, quad2Y);

    // 动态计算纹理坐标
    highp float tileSizeNorm = 1.0 / uTileSize;
    highp float halfPixel = 0.5 / uLutSize.x;
    highp float texelSize = tileSizeNorm - 2.0 * halfPixel;

    highp vec2 texPos1 = vec2(
        quad1.x * tileSizeNorm + halfPixel + texelSize * textureColor.r,
        quad1.y * tileSizeNorm + halfPixel + texelSize * textureColor.g
    );
    
    highp vec2 texPos2 = vec2(
        quad2.x * tileSizeNorm + halfPixel + texelSize * textureColor.r,
        quad2.y * tileSizeNorm + halfPixel + texelSize * textureColor.g
    );

    // 采样并混合
    highp vec4 newColor = mix(
        texture2D(uLutTexture, texPos1),
        texture2D(uLutTexture, texPos2),
        fract(blueColor)
    );
    
    gl_FragColor = vec4(newColor.rgb, textureColor.a);
}