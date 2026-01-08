### CocosCraft
![Voxel World](./repo/voxel-gifs.gif)
![Infinite World](./repo/voxel-gifs-fps.gif)

Simple Voxel world engine and Minecraft-like playability made with Cocos Creator v3.8.8 and TypeScript

* Threaded logic using Web Workers
* Generates only the visible vertices together with collision and normals for the mesh
* Biome generator with customizable layers and configurations
* Octave Perlin noise together with domain warping for more natural landscapes
* Infinite world chunk generation based on observer position
* Basic implementation of FPS controller using CharacterController API


## References
Many parts of this logic was based on 2 available references on the topic, which greatly guided me to develop this solution with Cocos and to fill up my knowledge gaps regarding world generation algorithms. Thanks to them, I was able to share this code with you.

* [SunnyValleyStudio - World Voxel Engine Tutorial](https://github.com/SunnyValleyStudio/Unity-2020-Voxel-World-Tutorial-Voxel-Engine-members)
* [SimonDev - Quick Minecraft Clone 2](https://github.com/simondevyoutube/Quick_MinecraftClone2)
