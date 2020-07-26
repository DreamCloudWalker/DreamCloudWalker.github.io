attribute vec4 aPosition;

#ifdef HAS_NORMALS
attribute vec3 aNormal;
#endif

#ifdef HAS_TANGENTS
attribute vec4 aTangent;
#endif

#ifdef HAS_UV
attribute vec2 aUV;
#endif

uniform mat4 uMVPMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uVIMatrix;
uniform mat4 uMITMatrix;

varying vec3 vPosition;
varying vec2 vUV;
varying vec3 vViewDir;

#ifdef HAS_NORMALS
#ifdef HAS_TANGENTS
varying mat3 vTBN;
#else
varying vec3 vNormal;
#endif
#endif


void main()
{
    vec4 pos = uModelMatrix * aPosition;
    vPosition = vec3(pos.xyz) / pos.w;
    vViewDir = vec3(normalize(uVIMatrix * vec4(0.0, 0.0, 0.0, 1.0) - pos).xyz);

    #ifdef HAS_NORMALS
    #ifdef HAS_TANGENTS
    vec3 normalW = normalize(vec3(uMITMatrix * vec4(aNormal.xyz, 0.0)));
    vec3 tangentW = normalize(vec3(uModelMatrix * vec4(aTangent.xyz, 0.0)));
    vec3 bitangentW = cross(normalW, tangentW) * aTangent.w;
    vTBN = mat3(tangentW, bitangentW, normalW);
    #else // HAS_TANGENTS != 1
    vNormal = normalize(vec3(uModelMatrix * vec4(aNormal.xyz, 0.0)));
    #endif
    #endif

    #ifdef HAS_UV
    vUV = aUV;
    #else
    vUV = vec2(0.,0.);
    #endif

    gl_Position = uMVPMatrix * aPosition; // needs w for proper perspective correction
}