import { BlockType } from '../map/models';

export interface DropEntry {
    blockType: BlockType;
    quantity: number;
    probability: number; // 0.0 to 1.0
}

const BLOCK_DROPS: Record<BlockType, DropEntry[]> = {
    [BlockType.GrassDirt]: [{ blockType: BlockType.Dirt, quantity: 1, probability: 1.0 }],
    [BlockType.Dirt]: [{ blockType: BlockType.Dirt, quantity: 1, probability: 1.0 }],
    [BlockType.Stone]: [{ blockType: BlockType.Stone, quantity: 1, probability: 1.0 }],
    [BlockType.Sand]: [{ blockType: BlockType.Sand, quantity: 1, probability: 1.0 }],
    [BlockType.SandDirt]: [{ blockType: BlockType.Sand, quantity: 1, probability: 1.0 }],
    [BlockType.Tree]: [{ blockType: BlockType.Tree, quantity: 1, probability: 1.0 }],
    [BlockType.Grass]: [{ blockType: BlockType.Grass, quantity: 1, probability: 0.5 }], // 50% drop
    [BlockType.Water]: [], // No drop
    [BlockType.Air]: [],
    [BlockType.Empty]: [],
};

export function getDropsForBlock(blockType: BlockType): DropEntry[] {
    const drops = BLOCK_DROPS[blockType] ?? [];
    return drops.filter(d => Math.random() < d.probability);
}
