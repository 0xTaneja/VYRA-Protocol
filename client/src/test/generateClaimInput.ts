import { generateMasterSeed } from "../crypto/seed";
import { generateUmbraAddress } from "../keys/address";
import { generateSuiMVK, generateUmbraMVK } from "../keys/mvk";
import { generateDepositITK, generateClaimITK } from "../keys/itk";
import { createCommitment } from "../core/commitment";
import { deriveLinkerKey } from "../keys/linker";
import { createNullifierHash } from "../core/nullifier";
import { poseidonHash } from "../crypto/poseidon";
import { MerkleTree } from "../core/merkleTree";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as fs from "fs";

async function generateClaimCircuitInput() {
    console.log("🔧 Generating Claim Circuit Input...\n");
    
    // ============ STEP 1: Create a deposit ============
    console.log("Step 1: Creating deposit transaction...");
    
    const depositorKeypair = new Ed25519Keypair();
    const depositorPubKey = depositorKeypair.getPublicKey().toRawBytes();
    
    const masterSeed = await generateMasterSeed(depositorKeypair);
    const suiMVK = generateSuiMVK(masterSeed);
    
    // Generate recipient Umbra address (index 0)
    const recipientKeypair = generateUmbraAddress(masterSeed, 0);
    const recipientPubKey = recipientKeypair.getPublicKey().toRawBytes();
    const umbraMVK = generateUmbraMVK(masterSeed, 0);
    
    // Split public keys
    const recipientPubKeyLow = bytesToFieldElement(recipientPubKey.slice(0, 16));
    const recipientPubKeyHigh = bytesToFieldElement(recipientPubKey.slice(16, 32));
    const depositorPubKeyLow = bytesToFieldElement(depositorPubKey.slice(0, 16));
    const depositorPubKeyHigh = bytesToFieldElement(depositorPubKey.slice(16, 32));
    
    // Transaction details
    const depositTimestamp = new Date("2025-11-19T12:00:00Z");
    const amount = 1000n;
    const version = 1n;
    const commitmentIndex = 5n; // This will be inserted at index 5 in the tree
    
    // Token mint
    const tokenMint = new Uint8Array(32).fill(1);
    const tokenMintLow = bytesToFieldElement(tokenMint.slice(0, 16));
    const tokenMintHigh = bytesToFieldElement(tokenMint.slice(16, 32));
    
    // Create commitment (deterministic secrets for testing)
    const secret = 12345n;
    const nullifier = 67890n;
    
    const { commitment } = createCommitment({
        secret,
        nullifier,
        recipientAddress: recipientPubKey,
        version,
        index: commitmentIndex,
        depositorAddress: depositorPubKey,
        amount,
        tokenMint,
        timestamp: depositTimestamp
    });
    
    console.log("✅ Commitment created:", commitment.toString().slice(0, 20) + "...\n");
    
    // ============ STEP 2: Build Merkle Tree ============
    console.log("Step 2: Building Merkle tree...");
    
    const tree = new MerkleTree(20);
    
    // Add some dummy commitments before our real one
    for (let i = 0; i < 5; i++) {
        const dummyCommitment = poseidonHash([BigInt(i + 100)]);
        tree.insert(dummyCommitment);
    }
    
    // Insert our commitment at index 5
    const insertedIndex = tree.insert(commitment);
    console.log(`✅ Commitment inserted at index: ${insertedIndex}`);
    
    // Add more dummy commitments after
    for (let i = 0; i < 3; i++) {
        const dummyCommitment = poseidonHash([BigInt(i + 200)]);
        tree.insert(dummyCommitment);
    }
    
    const merkleRoot = tree.getRoot();
    console.log(`✅ Merkle root: ${merkleRoot.toString().slice(0, 20)}...\n`);
    
    // ============ STEP 3: Generate Merkle Proof ============
    console.log("Step 3: Generating Merkle proof...");
    
    const merkleProof = tree.getProof(insertedIndex);
    console.log(`✅ Merkle proof generated (${merkleProof.length} levels)\n`);
    
    // Compute path indices from the commitment index
    const pathIndices: number[] = [];
    let idx = Number(insertedIndex);
    for (let i = 0; i < 20; i++) {
        pathIndices.push(idx % 2);
        idx = Math.floor(idx / 2);
    }
    
    // ============ STEP 4: Verify proof works ============
    console.log("Step 4: Verifying Merkle proof...");
    
    const verified = MerkleTree.verifyProof(commitment, insertedIndex, merkleProof, merkleRoot);
    if (!verified) {
        throw new Error("❌ Merkle proof verification failed!");
    }
    console.log("✅ Merkle proof verified!\n");
    
    // ============ STEP 5: Generate claim data ============
    console.log("Step 5: Generating claim transaction data...");
    
    const claimTimestamp = new Date("2025-11-19T14:30:00Z");
    
    // Generate claim ITK
    const claimITK = generateClaimITK(umbraMVK, claimTimestamp);
    
    // Generate linker key and claim linker hash
    const linkerKey = deriveLinkerKey(claimITK);
    const claimLinkerHash = poseidonHash([linkerKey, commitmentIndex]);
    
    // Generate nullifier hash
    const nullifierHash = createNullifierHash(nullifier);
    
    // Generate MVK commitment
    const mvkCommitment = poseidonHash([umbraMVK]);
    
    console.log("✅ Claim data generated\n");
    
    // ============ STEP 6: Extract timestamp components ============
    const depositTimestampYear = BigInt(depositTimestamp.getUTCFullYear());
    const depositTimestampMonth = BigInt(depositTimestamp.getUTCMonth() + 1);
    const depositTimestampDay = BigInt(depositTimestamp.getUTCDate());
    const depositTimestampHour = BigInt(depositTimestamp.getUTCHours());
    const depositTimestampMinute = BigInt(depositTimestamp.getUTCMinutes());
    const depositTimestampSecond = BigInt(depositTimestamp.getUTCSeconds());
    
    const claimTimestampYear = BigInt(claimTimestamp.getUTCFullYear());
    const claimTimestampMonth = BigInt(claimTimestamp.getUTCMonth() + 1);
    const claimTimestampDay = BigInt(claimTimestamp.getUTCDate());
    const claimTimestampHour = BigInt(claimTimestamp.getUTCHours());
    const claimTimestampMinute = BigInt(claimTimestamp.getUTCMinutes());
    const claimTimestampSecond = BigInt(claimTimestamp.getUTCSeconds());
    
    // ============ STEP 7: Create circuit input ============
    console.log("Step 6: Creating circuit input...");
    
    const circuitInput = {
        // Private inputs
        umbraMVK: umbraMVK.toString(),
        secret: secret.toString(),
        nullifier: nullifier.toString(),
        recipientPubKeyLow: recipientPubKeyLow.toString(),
        recipientPubKeyHigh: recipientPubKeyHigh.toString(),
        
        version: version.toString(),
        commitmentIndex: commitmentIndex.toString(),
        depositorKeyLow: depositorPubKeyLow.toString(),
        depositorKeyHigh: depositorPubKeyHigh.toString(),
        amount: amount.toString(),
        tokenMintLow: tokenMintLow.toString(),
        tokenMintHigh: tokenMintHigh.toString(),
        depositTimestampYear: depositTimestampYear.toString(),
        depositTimestampMonth: depositTimestampMonth.toString(),
        depositTimestampDay: depositTimestampDay.toString(),
        depositTimestampHour: depositTimestampHour.toString(),
        depositTimestampMinute: depositTimestampMinute.toString(),
        depositTimestampSecond: depositTimestampSecond.toString(),
        
        merklePathIndices: pathIndices.map(i => i.toString()),
        merklePathSiblings: merkleProof.map(s => s.toString()),
        
        // Public inputs
        merkleRoot: merkleRoot.toString(),
        nullifierHash: nullifierHash.toString(),
        claimLinkerHash: claimLinkerHash.toString(),
        mvkCommitment: mvkCommitment.toString(),
        claimTimestampYear: claimTimestampYear.toString(),
        claimTimestampMonth: claimTimestampMonth.toString(),
        claimTimestampDay: claimTimestampDay.toString(),
        claimTimestampHour: claimTimestampHour.toString(),
        claimTimestampMinute: claimTimestampMinute.toString(),
        claimTimestampSecond: claimTimestampSecond.toString()
    };
    
    // Write to file
    fs.writeFileSync(
        "../circuits/claim_input.json",
        JSON.stringify(circuitInput, null, 2)
    );
    
    console.log("✅ Claim circuit input generated!");
    console.log("📄 File: circuits/claim_input.json\n");
    
    // Print summary
    console.log("📊 Summary:");
    console.log(`   Commitment Index: ${insertedIndex}`);
    console.log(`   Merkle Root: ${merkleRoot.toString().slice(0, 30)}...`);
    console.log(`   Nullifier Hash: ${nullifierHash.toString().slice(0, 30)}...`);
    console.log(`   Tree Size: ${tree.getLeafCount()} commitments`);
    console.log(`   Proof Levels: ${merkleProof.length}`);
}

function bytesToFieldElement(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
        result = (result << 8n) | BigInt(bytes[i]!);
    }
    return result;
}

generateClaimCircuitInput().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});

