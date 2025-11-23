/**
 * Example: How to use the Umbra Client SDK
 * 
 * This demonstrates the full flow:
 * 1. Generate deposit data
 * 2. Submit deposit transaction
 * 3. Update Merkle root
 * 4. Generate claim data
 * 5. Submit claim transaction
 */

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { UmbraClient, suiToMist } from "../sui/umbra_client";
import { generateMasterSeed } from "../crypto/seed";
import { generateUmbraAddress } from "../keys/address";
import { generateSuiMVK, generateUmbraMVK } from "../keys/mvk";
import { generateDepositITK, generateClaimITK } from "../keys/itk";
import { createCommitment } from "../core/commitment";
import { deriveLinkerKey } from "../keys/linker";
import { createNullifierHash } from "../core/nullifier";
import { createDepositLinkerHash, createClaimLinkerHash } from "../core/linkerHash";
import { poseidonHash } from "../crypto/poseidon";
import { MerkleTree } from "../core/merkleTree";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { generateDepositProof, generateClaimProof, verifyDepositProof, verifyClaimProof } from "../zkp";

async function testFullFlow() {
    console.log("🧪 Testing Umbra Protocol Full Flow\n");

    // ============ SETUP ============
    
    // Create Umbra client
    const client = new UmbraClient();
    
    // Load your Sui keypair (depositor)
    // Replace with your actual private key or use fromSecretKey()
    const {secretKey} = decodeSuiPrivateKey(process.env.PRIVATE_KEY!)
    const depositorKeypair = Ed25519Keypair.fromSecretKey(secretKey);
    console.log("✅ Depositor Address:", depositorKeypair.getPublicKey().toSuiAddress());
    
    // Generate master seed
    const masterSeed = await generateMasterSeed(depositorKeypair);
    const suiMVK = generateSuiMVK(masterSeed);
    
    // Generate recipient Umbra address
    const recipientKeypair = generateUmbraAddress(masterSeed, 0);
    const recipientPubKey = recipientKeypair.getPublicKey().toRawBytes();
    const umbraMVK = generateUmbraMVK(masterSeed, 0);
    
    console.log("✅ Recipient Umbra Address:", recipientKeypair.getPublicKey().toSuiAddress());
    console.log();

    // ============ STEP 1: CREATE DEPOSIT ============
    
    console.log("📥 STEP 1: Creating Deposit...");
    
    const depositTimestamp = new Date();
    const depositAmount = suiToMist(0.1); // 0.1 SUI
    const depositITK = generateDepositITK(suiMVK, depositTimestamp);
    const depositLinkerKey = deriveLinkerKey(depositITK);
    const depositLinkerHash = createDepositLinkerHash(depositLinkerKey, recipientPubKey);
    const mvkCommitment = poseidonHash([suiMVK]);
    
    // Create commitment
    const depositorPubKey = depositorKeypair.getPublicKey().toRawBytes();
    const tokenMint = new Uint8Array(32).fill(0); // SUI (placeholder)
    
    const { commitment, secret, nullifier } = createCommitment({
        secret: BigInt(Math.floor(Math.random() * 1e15)), // Random for real use
        nullifier: BigInt(Math.floor(Math.random() * 1e15)),
        recipientAddress: recipientPubKey,
        version: 1n,
        index: 0n, // Will be updated by contract
        depositorAddress: depositorPubKey,
        amount: BigInt(depositAmount),
        tokenMint,
        timestamp: depositTimestamp,
    });
    
    console.log("  Commitment:", commitment.toString().slice(0, 30) + "...");
    console.log("  Linker Hash:", depositLinkerHash.toString().slice(0, 30) + "...");
    console.log();

    // ============ STEP 2: GENERATE DEPOSIT PROOF ============
    
    console.log("📤 STEP 2: Generating Deposit ZK Proof...");
    
    let depositProof;
    try {
        depositProof = await generateDepositProof({
            suiMVK,
            recipientPubKey,
            secret,
            nullifier,
            commitment,
            linkerHash: depositLinkerHash,
            mvkCommitment,
            timestamp: depositTimestamp,
            depositorPubKey,
            amount: BigInt(depositAmount),
            tokenMint,
        });
        
        // Verify proof locally
        const isValidDeposit = await verifyDepositProof(
            depositProof.proofA,
            depositProof.proofB,
            depositProof.proofC,
            depositProof.publicInputs
        );
        
        console.log("  ✅ Deposit proof valid:", isValidDeposit);
    } catch (error) {
        console.error("❌ Deposit proof generation failed:", error);
        depositProof = { proofA: [], proofB: [], proofC: [], publicInputs: [] };
    }
    
    console.log();

    // ============ STEP 3: SUBMIT DEPOSIT ============
    
    console.log("📥 STEP 3: Submitting Deposit to Blockchain...");

    try {
        const depositTxDigest = await client.deposit(depositorKeypair, {
            commitment,
            linkerHash: depositLinkerHash,
            mvkCommitment,
            amount: depositAmount,
            ...depositProof
        });
        
        console.log("✅ Deposit TX:", depositTxDigest);
        
        // Wait for transaction to settle
        console.log("  ⏳ Waiting for transaction to settle...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error("❌ Deposit failed:", error);
    }
    
    console.log();

    // ============ STEP 4: BUILD MERKLE TREE ============
    
    console.log("🌲 STEP 4: Building Local Merkle Tree...");
    
    const tree = new MerkleTree(20);
    const commitmentIndex = tree.insert(commitment);
    const localMerkleRoot = tree.getRoot();
    const { siblings: merklePathSiblings, indices: merklePathIndices } = tree.getProofWithIndices(commitmentIndex);
    
    console.log("  Commitment Index:", commitmentIndex);
    console.log("  Local Merkle Root:", localMerkleRoot.toString().slice(0, 30) + "...");
    console.log("  Merkle Proof Length:", merklePathSiblings.length);
    
    // Query on-chain merkle root (deposit already updated it)
    const onChainState = await client.getState();
    const merkleRoot = onChainState.merkleRoot;
    console.log("  On-chain Merkle Root:", merkleRoot.toString().slice(0, 30) + "...");
    console.log("  ℹ️  Note: Deposit transaction automatically updated the on-chain root");

    console.log();

    // ============ STEP 5: CREATE CLAIM DATA ============
    
    console.log("📤 STEP 5: Creating Claim Data...");
    
    const claimTimestamp = new Date();
    const claimITK = generateClaimITK(umbraMVK, claimTimestamp);
    const claimLinkerKey = deriveLinkerKey(claimITK);
    const claimLinkerHash = createClaimLinkerHash(claimLinkerKey, BigInt(commitmentIndex));
    const nullifierHash = createNullifierHash(nullifier);
    const umbraMvkCommitment = poseidonHash([umbraMVK]);
    
    console.log("  Nullifier Hash:", nullifierHash.toString().slice(0, 30) + "...");
    console.log("  Claim Linker Hash:", claimLinkerHash.toString().slice(0, 30) + "...");
    console.log();

    // ============ STEP 6: GENERATE CLAIM PROOF ============
    
    console.log("🔐 STEP 6: Generating Claim ZK Proof...");
    
    let claimProof;
    try {
        claimProof = await generateClaimProof({
            // Private inputs
            umbraMVK,
            recipientPubKey,
            secret,
            nullifier,
            commitmentIndex: BigInt(commitmentIndex),
            
            // Deposit data (from original deposit)
            depositorPubKey,
            amount: BigInt(depositAmount),
            tokenMint,
            depositTimestamp,
            
            // Merkle proof
            merklePathIndices,
            merklePathSiblings,
            
            // Public inputs
            merkleRoot: localMerkleRoot,
            nullifierHash,
            claimLinkerHash,
            mvkCommitment: umbraMvkCommitment,
            claimTimestamp,
        });
        
        // Verify proof locally
        const isValidClaim = await verifyClaimProof(
            claimProof.proofA,
            claimProof.proofB,
            claimProof.proofC,
            claimProof.publicInputs
        );
        
        console.log("  ✅ Claim proof valid:", isValidClaim);
    } catch (error) {
        console.error("❌ Claim proof generation failed:", error);
        claimProof = { proofA: [], proofB: [], proofC: [], publicInputs: [] };
    }
    
    console.log();

    // ============ STEP 7: SUBMIT CLAIM ============
    
    console.log("💰 STEP 7: Submitting Claim to Blockchain...");
    console.log("  ℹ️  Using depositor to pay gas (in production, a relayer would handle this)");
    
    
    try {
        // Use depositor keypair to pay gas (recipient has no SUI yet)
        // In production, a relayer network would handle this for true "gasless" claims
        const claimTxDigest = await client.claim(depositorKeypair, {
            nullifierHash,
            claimLinkerHash,
            recipient: recipientKeypair.getPublicKey().toSuiAddress(),
            amount: depositAmount,
            merkleRoot: localMerkleRoot, // Use local root (or fetch from chain)
            ...claimProof
        });
        
        console.log("✅ Claim TX:", claimTxDigest);
        
        // Wait for transaction to settle
        console.log("  ⏳ Waiting for transaction to settle...");
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
        console.error("❌ Claim failed:", error);
    }
    
    console.log();

    // ============ STEP 8: QUERY STATE ============
    
    console.log("📊 STEP 8: Querying Final Protocol State...");
    
    try {
        const state = await client.getState();
        console.log("  Commitment Count:", state.commitmentCount);
        console.log("  Merkle Root:", state.merkleRoot.toString());
        console.log("  Total Deposited:", state.totalDeposited, "MIST");
        console.log("  Pool Balance:", state.poolBalance, "MIST");
    } catch (error) {
        console.error("❌ Query failed:", error);
    }
    
    console.log("\n✅ Test Complete!");
}

// Run the test
testFullFlow().catch(console.error);

