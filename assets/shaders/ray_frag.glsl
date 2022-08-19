#version 300 es

precision highp float;
precision highp usampler3D;

uniform float uTime;

uniform vec3 worldBounds;
uniform float voxelSize;
uniform usampler3D uVoxelData;

uniform vec3 uCamera;
uniform vec3 uViewDir;
uniform vec3 uLight; // TODO: Array
uniform vec2 uResolution;
uniform bool debugNormals;

out vec4 oColor;

struct MaterialInfo {
   uint number;
   vec4 color;
};

struct RaycastResult {
   float distance;
   vec3 intersection;
   MaterialInfo materialInfo;
   vec3 normal;
};

MaterialInfo materialToColor(const uint material) {
   if(material == 0u) {
      return MaterialInfo(
         0u,
         vec4(0.)
         );
   } else if(material == 1u) {
      return MaterialInfo(
         material,
         vec4(1., 0., 0., 1.)
         );
   } else if(material == 2u) {
      return MaterialInfo(
         material,
         vec4(0., 1., 0., 1.)
      );
   } else if(material == 3u) {
      return MaterialInfo(
         material,
         vec4(0., 0., 1., 1.)
         );
   }
   return MaterialInfo(
      0u,
      vec4(vec3(.5, .5, .5), 1.)
      );
}

vec3 getVoxelOrigin(const vec3 position) {
   return floor(position);
}

float maxcomp(const vec3 p) {
    return max(max(p.x, p.y), p.z);
}  

float sdBox(const vec3 p, const vec3 c) {
    return maxcomp(abs(p-c));
}

vec3 getBoxNormal(const vec3 point) {
   vec3 origin = getVoxelOrigin(point) + .5;

   float distanceBox = sdBox(point, origin);
   const vec2 e = vec2( 0.0001, 0);
   
   vec3 direction = distanceBox - vec3(
      sdBox(point - e.xyy, origin),
      sdBox(point - e.yxy, origin),
      sdBox(point - e.yyx, origin)
   );

   return normalize(direction);
}


bool boxIntersectAdvanced(const vec3 point, const vec3 invDir, const vec3 minB, const vec3 maxB, out float tOut) {
    float tmin = 0.0, tmax = 100.;

    for (int i = 0; i < 3; ++i) {
        float t1 = (minB[i] - point[i]) * invDir[i];
        float t2 = (maxB[i] - point[i]) * invDir[i];

        tmin = min(max(t1, tmin), max(t2, tmin));
        tmax = max(min(t1, tmax), min(t2, tmax));
    }

    tOut = max( max(tmin, 0.), tmax);

    return tmin <= tmax;
}

bool sdSphere(const vec3 point, const vec3 light) {
   return length(point - light) <= 0.5;
}

RaycastResult perfomRaycast(const vec3 rayOrigin, const vec3 rayDirection, const float maxDistance) {
   
   MaterialInfo materialInfo;
   vec3 normal;

   float distance = 0.001; // Some offset
   vec3 currentPos = rayOrigin + distance * rayDirection;
   vec3 currentBox = getVoxelOrigin(currentPos);
   vec3 invDir = 1. / rayDirection;

   // tMin would be entry, tMax exit
   // we always use tMax because the ray always originates inside a box ...
   float tMax;

   const vec3 minBounds = vec3(0.);
   vec3 maxBounds = vec3(voxelSize);

   do {

      if(sdSphere(currentPos, uLight)) {
         distance = maxDistance;
         materialInfo = MaterialInfo(
            10u,
            vec4(vec3(1., 1., 0.), 1.)
         );
         break;
      }

       boxIntersectAdvanced(currentPos - currentBox, invDir, minBounds, maxBounds, tMax);

      distance += tMax + 0.00001;

      vec3 nextPos =  rayOrigin + distance * rayDirection;
      vec3 nextBox = getVoxelOrigin(nextPos);

      uint texelValue = texelFetch(uVoxelData, ivec3(nextBox), 0).r;
      materialInfo = materialToColor(texelValue);

      // found color
      if(materialInfo.color.w > 0.) {
         normal = getBoxNormal(nextPos);
         break;
      } 

      currentBox = nextBox;
      currentPos = nextPos;
   } while(distance < maxDistance);

   return RaycastResult(
      distance,
      currentPos,
      materialInfo,
      normal
   );
}

float getLight(const vec3 light,const RaycastResult ray) {
   vec3 lightVector = light - ray.intersection;
   vec3 lightDir = normalize(lightVector);

   float dif = clamp( dot(ray.normal, lightDir), 0., 1.);

   float maxDistance = length(lightVector);
   float distance = perfomRaycast(ray.intersection + ray.normal * 0.01, lightDir, maxDistance).distance;

   if(distance < maxDistance ) {
      dif *= .1;
    }
    
   return dif;
}

vec3 debugNormalColor(const vec3 color) {
   return color * (sign(color) + .5);
}

void main(void) {
   vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
   vec3 rayOrigin = uCamera;
   vec3 rayDirection = normalize(vec3(uv.x, uv.y, 1) * uViewDir);

   RaycastResult boxRay = perfomRaycast(rayOrigin, rayDirection, worldBounds.x * 3.);

   if(boxRay.materialInfo.number == 10u) {
      oColor = boxRay.materialInfo.color;
      return;
   }

   if(boxRay.distance >= worldBounds.x) {
      oColor = vec4(vec3(173., 216. ,230.) / 255., 1.);
      return;
   }

   if(debugNormals) {
      oColor = vec4(debugNormalColor(boxRay.normal), 1.);
   } else {
      float diffuse = getLight(uLight, boxRay);
      oColor = vec4( boxRay.materialInfo.color.xyz * diffuse, boxRay.materialInfo.color.w);
   }
   // oColor = vec4( boxRay.materialInfo.color.xyz, boxRay.materialInfo.color.w);
}