### [ WIP ] CocosCraft
![Voxel World](./repo/voxel-gifs.gif)

Simple Voxel world engine and Minecraft-like playability made with Cocos Creator v3.8.1 and TypeScript

* Generates only the visible vertices together with collision and normals for the mesh
* Biome generator with customizable layers and configurations
* Octave Perlin noise together with domain warping for more natural landscapes

## TODO:
* Dig mechanics with dynamic meshes
* Generate a world using service workers
* Add more biomes/generator logic

## Issues:
* Edge voxels need to ask the world for adjacent block type info
* When regenerating the world it seems meshes are not entirely cleaned up, messing up new mesh colliders

