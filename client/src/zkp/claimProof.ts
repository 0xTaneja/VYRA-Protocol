/**
 * Claim ZK-SNARK Proof Generation
 * 
 * Generates Groth16 proofs for claim transactions
 */

import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";
import { extractTimestamp } from "../keys/itk";
import { splitPublicKey } from "../core/commitment";

// Paths to circuit artifacts (relative to project root)
const CIRCUITS_DIR = path.join(__dirname, "../../../circuits");
const WASM_FILE = path.join(CIRCUITS_DIR, "claim_js", "claim.wasm");
const ZKEY_FILE = path.join(CIRCUITS_DIR, "claim_0000.zkey");

export interface ClaimProofInput {
    // Private inputs (commitment data)
    umbraMVK: bigint;
    recipientPubKey: Uint8Array;
    secret: bigint;
    nullifier: bigint;
    commitmentIndex: bigint;
    
    // Deposit data (part of commitment)
    depositorPubKey: Uint8Array;
    amount: bigint;
    tokenMint: Uint8Array;
    depositTimestamp: Date;
    
    // Merkle proof
    merklePathIndices: number[]; // 0 or 1 for each level
    merklePathSiblings: bigint[]; // Sibling hashes
    
    // Public inputs
    merkleRoot: bigint;
    nullifierHash: bigint;
    claimLinkerHash: bigint;
    mvkCommitment: bigint;
    claimTimestamp: Date;
}

export interface ClaimProof {
    proofA: bigint[];
    proofB: bigint[];
    proofC: bigint[];
    publicInputs: bigint[];
}

/**
 * Generate claim ZK-SNARK proof
 */
export async function generateClaimProof(input: ClaimProofInput): Promise<ClaimProof> {
    // Prepare circuit input
    const recipientSplit = splitPublicKey(input.recipientPubKey);
    const depositorSplit = splitPublicKey(input.depositorPubKey);
    const tokenMintSplit = splitPublicKey(input.tokenMint);
    const depositTime = extractTimestamp(input.depositTimestamp);
    const claimTime = extractTimestamp(input.claimTimestamp);
    
    // Ensure merkle proof is correct length (20 levels)
    const TREE_DEPTH = 20;
    if (input.merklePathIndices.length !== TREE_DEPTH) {
        throw new Error(`Merkle path indices must have ${TREE_DEPTH} elements, got ${input.merklePathIndices.length}`);
    }
    if (input.merklePathSiblings.length !== TREE_DEPTH) {
        throw new Error(`Merkle path siblings must have ${TREE_DEPTH} elements, got ${input.merklePathSiblings.length}`);
    }
    
    const circuitInput = {
        // Private witness - commitment data
        umbraMVK: input.umbraMVK.toString(),
        secret: input.secret.toString(),
        nullifier: input.nullifier.toString(),
        recipientPubKeyLow: recipientSplit.low.toString(),
        recipientPubKeyHigh: recipientSplit.high.toString(),
        version: "1",
        commitmentIndex: input.commitmentIndex.toString(),
        
        // Deposit data (part of commitment)
        depositorKeyLow: depositorSplit.low.toString(),
        depositorKeyHigh: depositorSplit.high.toString(),
        amount: input.amount.toString(),
        tokenMintLow: tokenMintSplit.low.toString(),
        tokenMintHigh: tokenMintSplit.high.toString(),
        depositTimestampYear: depositTime[0]!.toString(),
        depositTimestampMonth: depositTime[1]!.toString(),
        depositTimestampDay: depositTime[2]!.toString(),
        depositTimestampHour: depositTime[3]!.toString(),
        depositTimestampMinute: depositTime[4]!.toString(),
        depositTimestampSecond: depositTime[5]!.toString(),
        
        // Merkle proof
        merklePathIndices: input.merklePathIndices.map(i => i.toString()),
        merklePathSiblings: input.merklePathSiblings.map(s => s.toString()),
        
        // Public inputs
        merkleRoot: input.merkleRoot.toString(),
        nullifierHash: input.nullifierHash.toString(),
        claimLinkerHash: input.claimLinkerHash.toString(),
        mvkCommitment: input.mvkCommitment.toString(),
        claimTimestampYear: claimTime[0]!.toString(),
        claimTimestampMonth: claimTime[1]!.toString(),
        claimTimestampDay: claimTime[2]!.toString(),
        claimTimestampHour: claimTime[3]!.toString(),
        claimTimestampMinute: claimTime[4]!.toString(),
        claimTimestampSecond: claimTime[5]!.toString(),
    };
    
    console.log("  🔐 Generating claim ZK proof...");
    
    // Check if files exist
    if (!fs.existsSync(WASM_FILE)) {
        throw new Error(`WASM file not found: ${WASM_FILE}`);
    }
    if (!fs.existsSync(ZKEY_FILE)) {
        throw new Error(`ZKEY file not found: ${ZKEY_FILE}`);
    }
    
    // Generate witness
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        WASM_FILE,
        ZKEY_FILE
    );
    
    console.log("  ✅ Claim proof generated");
    
    // Convert proof to format expected by Sui
    return formatProofForSui(proof, publicSignals);
}

/**
 * Format snarkjs proof for Sui Move contract
 */
function formatProofForSui(proof: any, publicSignals: string[]): ClaimProof {
    // Groth16 proof has 3 components: A, B, C
    // A and C are G1 points (2 coordinates)
    // B is a G2 point (4 coordinates)
    
    const proofA = [
        BigInt(proof.pi_a[0]),
        BigInt(proof.pi_a[1])
    ];
    
    const proofB = [
        BigInt(proof.pi_b[0][0]),
        BigInt(proof.pi_b[0][1]),
        BigInt(proof.pi_b[1][0]),
        BigInt(proof.pi_b[1][1])
    ];
    
    const proofC = [
        BigInt(proof.pi_c[0]),
        BigInt(proof.pi_c[1])
    ];
    
    const publicInputs = publicSignals.map(s => BigInt(s));
    
    return { proofA, proofB, proofC, publicInputs };
}

/**
 * Verify claim proof (for testing)
 */
export async function verifyClaimProof(
    proofA: bigint[],
    proofB: bigint[],
    proofC: bigint[],
    publicInputs: bigint[]
): Promise<boolean> {
    const VKEY_FILE = path.join(CIRCUITS_DIR, "claim_verification_key.json");
    
    if (!fs.existsSync(VKEY_FILE)) {
        throw new Error(`Verification key not found: ${VKEY_FILE}`);
    }
    
    const vKey = JSON.parse(fs.readFileSync(VKEY_FILE, "utf8"));
    
    // Convert back to snarkjs format
    const proof = {
        pi_a: [proofA[0]!.toString(), proofA[1]!.toString(), "1"],
        pi_b: [
            [proofB[0]!.toString(), proofB[1]!.toString()],
            [proofB[2]!.toString(), proofB[3]!.toString()],
            ["1", "0"]
        ],
        pi_c: [proofC[0]!.toString(), proofC[1]!.toString(), "1"],
        protocol: "groth16",
        curve: "bn128"
    };
    
    const publicSignals = publicInputs.map(p => p.toString());
    
    return await snarkjs.groth16.verify(vKey, publicSignals, proof);
}

