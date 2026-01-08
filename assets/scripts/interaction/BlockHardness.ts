import { BlockType } from '../map/models';

// Time in seconds to break each block type (with bare hands)
export const BLOCK_HARDNESS: Record<BlockType, number> = {
    [BlockType.Empty]: Infinity,
    [BlockType.Air]: Infinity,
    [BlockType.GrassDirt]: 0.0,
    [BlockType.Dirt]: 0.0,
    [BlockType.SandDirt]: 0.0,
    [BlockType.Sand]: 0.0,
    [BlockType.Stone]: 0.0,
    [BlockType.Water]: Infinity,
    [BlockType.Tree]: 0.0,
    [BlockType.Grass]: 0.0, // Instant break
};

export interface ToolEffect {
    speedMultiplier: number;
    applicableBlocks: BlockType[];
}
