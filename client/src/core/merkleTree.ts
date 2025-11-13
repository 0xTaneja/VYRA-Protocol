import { poseidonHashPair } from "../crypto/poseidon";

// Configuration
const TREE_DEPTH = 20; // 2^20 = ~1 million commitments
const ZERO_VALUE = 0n; // Value for empty leaves


function computeZeroHashes(depth: number): bigint[] {
    const zeros: bigint[] = [ZERO_VALUE];
    
    for (let i = 0; i < depth; i++) {
        zeros.push(poseidonHashPair(zeros[i]!, zeros[i]!));
    }
    
    return zeros;
}


export class MerkleTree {
    private depth: number;
    private leaves: bigint[];
    private zeros: bigint[];
    private nextIndex: number;
    
    constructor(depth: number = TREE_DEPTH) {
        this.depth = depth;
        this.leaves = [];
        this.zeros = computeZeroHashes(depth);
        this.nextIndex = 0;
    }
    
 
    insert(commitment: bigint): number {
        if (this.nextIndex >= Math.pow(2, this.depth)) {
            throw new Error("Merkle tree is full");
        }
        
        const index = this.nextIndex;
        this.leaves[index] = commitment;
        this.nextIndex++;
        
        return index;
    }
    
   
    getRoot(): bigint {
        return this.computeRoot(this.nextIndex);
    }
    
   
    private computeRoot(leafCount: number): bigint {
        if (leafCount === 0) {
            return this.zeros[this.depth]!;
        }
        
        // Efficient computation using only filled leaves and precomputed zeros
        const nodes: Map<string, bigint> = new Map();
        
        // Initialize with actual leaves
        for (let i = 0; i < leafCount; i++) {
            nodes.set(`0-${i}`, this.leaves[i]!);
        }
        
        let current = leafCount;
        
        // Compute level by level
        for (let level = 0; level < this.depth; level++) {
            const nextLevelNodes: Map<string, bigint> = new Map();
            const nodesAtLevel = Math.ceil(current / 2);
            
            for (let i = 0; i < nodesAtLevel; i++) {
                const leftKey = `${level}-${i * 2}`;
                const rightKey = `${level}-${i * 2 + 1}`;
                
                const left = nodes.get(leftKey) ?? this.zeros[level]!;
                const right = nodes.get(rightKey) ?? this.zeros[level]!;
                
                const parentHash = poseidonHashPair(left, right);
                nextLevelNodes.set(`${level + 1}-${i}`, parentHash);
            }
            
            nodes.clear();
            for (const [key, value] of nextLevelNodes) {
                nodes.set(key, value);
            }
            
            current = nodesAtLevel;
        }
        
        return nodes.get(`${this.depth}-0`) ?? this.zeros[this.depth]!;
    }
    
    
    getProof(index: number): bigint[] {
        if (index >= this.nextIndex) {
            throw new Error("Leaf index out of bounds");
        }
        
        const proof: bigint[] = [];
        
        // Build all levels efficiently (only filled nodes + their parents)
        let currentLevel = new Map<number, bigint>();
        
        // Level 0: Initialize with actual leaves
        for (let i = 0; i < this.nextIndex; i++) {
            currentLevel.set(i, this.leaves[i]!);
        }
        
        let currentIndex = index;
        
        // Build proof level by level
        for (let level = 0; level < this.depth; level++) {
            const siblingIndex = currentIndex ^ 1;
            
            // Get sibling at current level
            const sibling = currentLevel.get(siblingIndex) ?? this.zeros[level]!;
            proof.push(sibling);
            
            // Build next level (only nodes we might need)
            const nextLevel = new Map<number, bigint>();
            const nodesNeeded = Math.ceil(this.nextIndex / Math.pow(2, level + 1));
            
            for (let i = 0; i < nodesNeeded; i++) {
                const leftIdx = i * 2;
                const rightIdx = i * 2 + 1;
                
                const left = currentLevel.get(leftIdx) ?? this.zeros[level]!;
                const right = currentLevel.get(rightIdx) ?? this.zeros[level]!;
                
                nextLevel.set(i, poseidonHashPair(left, right));
            }
            
            currentLevel = nextLevel;
            currentIndex = Math.floor(currentIndex / 2);
        }
        
        return proof;
    }
    
    /**
     * Get Merkle proof with path indices (for ZK circuits)
     * Returns { siblings, indices } where indices[i] = 0 if left child, 1 if right child
     */
    getProofWithIndices(index: number): { siblings: bigint[], indices: number[] } {
        if (index >= this.nextIndex) {
            throw new Error("Leaf index out of bounds");
        }
        
        const siblings: bigint[] = [];
        const indices: number[] = [];
        
        // Build all levels efficiently
        let currentLevel = new Map<number, bigint>();
        
        // Level 0: Initialize with actual leaves
        for (let i = 0; i < this.nextIndex; i++) {
            currentLevel.set(i, this.leaves[i]!);
        }
        
        let currentIndex = index;
        
        // Build proof level by level
        for (let level = 0; level < this.depth; level++) {
            const siblingIndex = currentIndex ^ 1;
            
            // Get sibling at current level
            const sibling = currentLevel.get(siblingIndex) ?? this.zeros[level]!;
            siblings.push(sibling);
            
            // Record path index: 0 = left child, 1 = right child
            indices.push(currentIndex % 2);
            
            // Build next level (only nodes we might need)
            const nextLevel = new Map<number, bigint>();
            const nodesNeeded = Math.ceil(this.nextIndex / Math.pow(2, level + 1));
            
            for (let i = 0; i < nodesNeeded; i++) {
                const leftIdx = i * 2;
                const rightIdx = i * 2 + 1;
                
                const left = currentLevel.get(leftIdx) ?? this.zeros[level]!;
                const right = currentLevel.get(rightIdx) ?? this.zeros[level]!;
                
                nextLevel.set(i, poseidonHashPair(left, right));
            }
            
            currentLevel = nextLevel;
            currentIndex = Math.floor(currentIndex / 2);
        }
        
        return { siblings, indices };
    }
    
  
    private computeNodeAtLevel(level: number, index: number, memo: Map<string, bigint> = new Map()): bigint {
        const key = `${level}-${index}`;
        if (memo.has(key)) {
            return memo.get(key)!;
        }
        
        if (level === 0) {
            // Leaf level
            const result = index < this.nextIndex ? this.leaves[index]! : this.zeros[0]!;
            memo.set(key, result);
            return result;
        }
        
        // Recursive with memoization
        const leftChild = this.computeNodeAtLevel(level - 1, index * 2, memo);
        const rightChild = this.computeNodeAtLevel(level - 1, index * 2 + 1, memo);
        
        const result = poseidonHashPair(leftChild, rightChild);
        memo.set(key, result);
        return result;
    }
    
    
    static verifyProof(
        leaf: bigint, 
        index: number, 
        proof: bigint[], 
        root: bigint
    ): boolean {
        let computedHash = leaf;
        let currentIndex = index;
        
        // Hash up the tree using the proof
        for (let i = 0; i < proof.length; i++) {
            const sibling = proof[i]!;
            
            // Determine if we're left or right child
            if (currentIndex % 2 === 0) {
                // We're left child, sibling is on right
                computedHash = poseidonHashPair(computedHash, sibling);
            } else {
                // We're right child, sibling is on left
                computedHash = poseidonHashPair(sibling, computedHash);
            }
            
            // Move to parent level
            currentIndex = Math.floor(currentIndex / 2);
        }
        
        // Check if computed root matches expected root
        return computedHash === root;
    }
    
    
    getLeafCount(): number {
        return this.nextIndex;
    }
    
    
    getCapacity(): number {
        return Math.pow(2, this.depth);
    }
    
    getLeaf(index: number): bigint {
        if (index >= this.nextIndex) {
            throw new Error("Leaf index out of bounds");
        }
        return this.leaves[index]!;
    }
}

