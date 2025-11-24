

import { poseidonHashPair } from './crypto/poseidon';

export class ContractMerkleTree {
  private leaves: bigint[] = [];

  constructor(commitments: bigint[]) {
    this.leaves = [...commitments];
  }

  getRoot(): bigint {
    if (this.leaves.length === 0) {
      return 0n;
    }

    let currentLevel = [...this.leaves];

    if (currentLevel.length % 2 === 1) {
      currentLevel.push(0n);
    }

    while (currentLevel.length > 1) {
      const nextLevel: bigint[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : 0n;
        const hash = poseidonHashPair(left, right);
        nextLevel.push(hash);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0]!;
  }

  getProof(leafIndex: number): { siblings: bigint[]; pathIndices: number[] } {
    if (leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds`);
    }

    const siblings: bigint[] = [];
    const pathIndices: number[] = [];

    let currentLevel = [...this.leaves];
    if (currentLevel.length % 2 === 1) {
      currentLevel.push(0n);
    }

    let currentIndex = leafIndex;

    while (currentLevel.length > 1) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      const sibling =
        siblingIndex < currentLevel.length ? currentLevel[siblingIndex]! : 0n;
      siblings.push(sibling);
      pathIndices.push(isLeft ? 0 : 1);

      const nextLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : 0n;
        const hash = poseidonHashPair(left, right);
        nextLevel.push(hash);
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    while (siblings.length < 20) {
      siblings.push(0n);
      pathIndices.push(0);
    }

    return { siblings, pathIndices };
  }
}

