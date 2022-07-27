# WebGL_UniformVoxelGrid_Raytracer


Renderes a scene defined by a 3d texture representing a voxel and its material (color.r = u8) for each corresponding coordinate. 
You can move by using wasdqe. Performance on a 3050 varies heavily depending on view distance.

It would be wiser to use an octree based renderer in order to let the ray skip large areas of empty voxels.
