/**
 * Deposit ZK-SNARK Proof Generation
 * 
 * Generates Groth16 proofs for deposit transactions
 */

import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";
import { extractTimestamp } from "../keys/itk";
import { splitPublicKey } from "../core/commitment";

// Paths to circuit artifacts (relative to project root)
const CIRCUITS_DIR = path.join(__dirname, "../../../circuits");
const WASM_FILE = path.join(CIRCUITS_DIR, "deposit_js", "deposit.wasm");
const ZKEY_FILE = path.join(CIRCUITS_DIR, "deposit_0000.zkey");

export interface DepositProofInput {
    // Private inputs
    suiMVK: bigint;
    recipientPubKey: Uint8Array;
    secret: bigint;
    nullifier: bigint;
    
    // Public inputs
    commitment: bigint;
    linkerHash: bigint;
    mvkCommitment: bigint;
    timestamp: Date;
    depositorPubKey: Uint8Array;
    amount: bigint;
    tokenMint: Uint8Array;
}

export interface DepositProof {
    proofA: bigint[];
    proofB: bigint[];
    proofC: bigint[];
    publicInputs: bigint[];
}

/**
 * Generate deposit ZK-SNARK proof
 */
export async function generateDepositProof(input: DepositProofInput): Promise<DepositProof> {
    // Prepare circuit input
    const recipientSplit = splitPublicKey(input.recipientPubKey);
    const depositorSplit = splitPublicKey(input.depositorPubKey);
    const tokenMintSplit = splitPublicKey(input.tokenMint);
    const time = extractTimestamp(input.timestamp);
    
    const circuitInput = {
        // Private witness
        suiMVK: input.suiMVK.toString(),
        recipientPubKeyLow: recipientSplit.low.toString(),
        recipientPubKeyHigh: recipientSplit.high.toString(),
        secret: input.secret.toString(),
        nullifier: input.nullifier.toString(),
        
        // Public inputs
        commitment: input.commitment.toString(),
        linkerHash: input.linkerHash.toString(),
        mvkCommitment: input.mvkCommitment.toString(),
        timestampYear: time[0]!.toString(),
        timestampMonth: time[1]!.toString(),
        timestampDay: time[2]!.toString(),
        timestampHour: time[3]!.toString(),
        timestampMinute: time[4]!.toString(),
        timestampSecond: time[5]!.toString(),
        depositorKeyLow: depositorSplit.low.toString(),
        depositorKeyHigh: depositorSplit.high.toString(),
        amount: input.amount.toString(),
        tokenMintLow: tokenMintSplit.low.toString(),
        tokenMintHigh: tokenMintSplit.high.toString(),
        version: "1",
        index: "0",
    };
    
    console.log("  🔐 Generating deposit ZK proof...");
    
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
    
    console.log("  ✅ Deposit proof generated");
    
    // Convert proof to format expected by Sui
    return formatProofForSui(proof, publicSignals);
}

/**
 * Format snarkjs proof for Sui Move contract
 */
function formatProofForSui(proof: any, publicSignals: string[]): DepositProof {
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
 * Verify deposit proof (for testing)
 */
export async function verifyDepositProof(
    proofA: bigint[],
    proofB: bigint[],
    proofC: bigint[],
    publicInputs: bigint[]
): Promise<boolean> {
    const VKEY_FILE = path.join(CIRCUITS_DIR, "deposit_verification_key.json");
    
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

