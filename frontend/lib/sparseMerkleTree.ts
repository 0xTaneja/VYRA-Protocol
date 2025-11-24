

import { poseidonHashPair } from './crypto/poseidon';

export class SparseMerkleTree {
  private levels: number;
  private zeroValue: bigint;
  private leaves: Map<number, bigint>;

  constructor(levels: number, zeroValue: bigint = 0n) {
    this.levels = levels;
    this.zeroValue = zeroValue;
    this.leaves = new Map();
  }

  insert(index: number, leaf: bigint): void {
    if (index >= 2 ** this.levels) {
      throw new Error(`Index ${index} out of bounds for tree with ${this.levels} levels`);
    }
    this.leaves.set(index, leaf);
  }

  getLeaf(index: number): bigint {
    return this.leaves.get(index) || this.zeroValue;
  }

  getRoot(): bigint {
    if (this.leaves.size === 0) {
      return this.zeroValue;
    }

    const maxIndex = Math.max(...Array.from(this.leaves.keys()));
    
    let currentLevel: Map<number, bigint> = new Map(this.leaves);

    for (let level = 0; level < this.levels; level++) {
      const nextLevel: Map<number, bigint> = new Map();

      const processedIndices = new Set<number>();
      
      for (const index of currentLevel.keys()) {
        const parentIndex = Math.floor(index / 2);
        if (processedIndices.has(parentIndex)) continue;
        processedIndices.add(parentIndex);

        const leftIndex = parentIndex * 2;
        const rightIndex = parentIndex * 2 + 1;

        const left = currentLevel.get(leftIndex) || this.zeroValue;
        const right = currentLevel.get(rightIndex) || this.zeroValue;

        const hash = poseidonHashPair(left, right);
        nextLevel.set(parentIndex, hash);
      }

      currentLevel = nextLevel;
      if (currentLevel.size === 0) break;
    }

    return currentLevel.get(0) || this.zeroValue;
  }

  getProof(leafIndex: number): { siblings: bigint[]; pathIndices: number[] } {
    const siblings: bigint[] = [];
    const pathIndices: number[] = [];

    let currentIndex = leafIndex;

    for (let level = 0; level < this.levels; level++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      const sibling = this.getNodeAtLevel(level, siblingIndex);
      siblings.push(sibling);
      pathIndices.push(isLeft ? 0 : 1);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return { siblings, pathIndices };
  }

  private getNodeAtLevel(level: number, index: number): bigint {
    if (level === 0) {
      return this.getLeaf(index);
    }

    const leftIndex = index * 2;
    const rightIndex = index * 2 + 1;

    const left = this.getNodeAtLevel(level - 1, leftIndex);
    const right = this.getNodeAtLevel(level - 1, rightIndex);

    if (left === this.zeroValue && right === this.zeroValue) {
      return this.zeroValue;
    }

    return poseidonHashPair(left, right);
  }
}

