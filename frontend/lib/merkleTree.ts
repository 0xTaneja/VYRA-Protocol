

import { poseidonHashPair } from './crypto/poseidon';

export class MerkleTree {
  private depth: number;
  private leaves: bigint[];
  private zeroValue: bigint;

  constructor(depth: number = 20, zeroValue: bigint = 0n) {
    this.depth = depth;
    this.leaves = [];
    this.zeroValue = zeroValue;
  }

  insert(leaf: bigint): number {
    this.leaves.push(leaf);
    return this.leaves.length - 1;
  }

  getRoot(): bigint {
    if (this.leaves.length === 0) {
      return this.zeroValue;
    }

    return this.computeRoot();
  }

  getProof(index: number): { siblings: bigint[]; pathIndices: number[] } {
    if (index >= this.leaves.length) {
      throw new Error(`Leaf index ${index} out of bounds`);
    }

    const siblings: bigint[] = [];
    const pathIndices: number[] = [];

    let currentIndex = index;
    let currentLevel = this.leaves.slice(); 

    for (let level = 0; level < this.depth; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      const sibling = siblingIndex < currentLevel.length ? currentLevel[siblingIndex]! : this.zeroValue;

      siblings.push(sibling);
      pathIndices.push(isRightNode ? 1 : 0);

      const parentLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : this.zeroValue;
        parentLevel.push(poseidonHashPair(left, right));
      }

      currentLevel = parentLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { siblings, pathIndices };
  }

  verifyProof(leaf: bigint, proof: { siblings: bigint[]; pathIndices: number[] }, root: bigint): boolean {
    let currentHash = leaf;

    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i]!;
      const isRight = proof.pathIndices[i] === 1;

      currentHash = isRight
        ? poseidonHashPair(sibling, currentHash)
        : poseidonHashPair(currentHash, sibling);
    }

    return currentHash === root;
  }

  getLeaves(): bigint[] {
    return this.leaves.slice();
  }

  getLeafCount(): number {
    return this.leaves.length;
  }

  private computeRoot(): bigint {
    let currentLevel = this.leaves.slice();

    for (let level = 0; level < this.depth; level++) {
      if (currentLevel.length === 0) {
        return this.zeroValue;
      }

      if (currentLevel.length === 1) {
        
        let hash = currentLevel[0]!;
        for (let i = level; i < this.depth; i++) {
          hash = poseidonHashPair(hash, this.zeroValue);
        }
        return hash;
      }

      const nextLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1]! : this.zeroValue;
        nextLevel.push(poseidonHashPair(left, right));
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0] || this.zeroValue;
  }
}

export async function buildMerkleTreeFromEvents(commitments: bigint[]): Promise<MerkleTree> {
  const tree = new MerkleTree(20, 0n);

  for (const commitment of commitments) {
    tree.insert(commitment);
  }

  return tree;
}

