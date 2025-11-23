import { generateMasterSeed } from "../crypto/seed";
import { generateUmbraAddress } from "../keys/address";
import { generateSuiMVK } from "../keys/mvk";
import { generateDepositITK } from "../keys/itk";
import { createCommitment } from "../core/commitment";
import { deriveLinkerKey } from "../keys/linker";
import { poseidonHash } from "../crypto/poseidon";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as fs from "fs";

async function generateDepositCircuitInput() {
    
    const depositorKeypair = new Ed25519Keypair();
    const depositorPubKey = depositorKeypair.getPublicKey().toRawBytes();
    
    
    const masterSeed = await generateMasterSeed(depositorKeypair);
    
    
    const suiMVK = generateSuiMVK(masterSeed);
    
   
    const recipientKeypair = generateUmbraAddress(masterSeed, 0);
    const recipientPubKey = recipientKeypair.getPublicKey().toRawBytes();
    
   
    const recipientPubKeyLow = bytesToFieldElement(recipientPubKey.slice(0, 16));
    const recipientPubKeyHigh = bytesToFieldElement(recipientPubKey.slice(16, 32));
    const depositorPubKeyLow = bytesToFieldElement(depositorPubKey.slice(0, 16));
    const depositorPubKeyHigh = bytesToFieldElement(depositorPubKey.slice(16, 32));
    
    
    const timestamp = new Date();
    const amount = 1000n;
    const version = 1n;
    const index = 0n;
    
    
    const tokenMint = new Uint8Array(32).fill(1);
    const tokenMintLow = bytesToFieldElement(tokenMint.slice(0, 16));
    const tokenMintHigh = bytesToFieldElement(tokenMint.slice(16, 32));
    
    
    const { commitment, secret, nullifier } = createCommitment({
        secret: generateRandomSecret(),
        nullifier: generateRandomNullifier(),
        recipientAddress: recipientPubKey,
        version,
        index,
        depositorAddress: depositorPubKey,
        amount,
        tokenMint,
        timestamp
    });
    
    
    const depositITK = generateDepositITK(suiMVK, timestamp);
    
    
    const linkerKey = deriveLinkerKey(depositITK);
    const linkerHash = poseidonHash([linkerKey, recipientPubKeyLow, recipientPubKeyHigh]);
    
    
    const mvkCommitment = poseidonHash([suiMVK]);
    
    
    const timestampYear = BigInt(timestamp.getUTCFullYear());
    const timestampMonth = BigInt(timestamp.getUTCMonth() + 1);
    const timestampDay = BigInt(timestamp.getUTCDate());
    const timestampHour = BigInt(timestamp.getUTCHours());
    const timestampMinute = BigInt(timestamp.getUTCMinutes());
    const timestampSecond = BigInt(timestamp.getUTCSeconds());
    
    
    const circuitInput = {
        
        suiMVK: suiMVK.toString(),
        recipientPubKeyLow: recipientPubKeyLow.toString(),
        recipientPubKeyHigh: recipientPubKeyHigh.toString(),
        secret: secret.toString(),
        nullifier: nullifier.toString(),
        
        
        commitment: commitment.toString(),
        linkerHash: linkerHash.toString(),
        mvkCommitment: mvkCommitment.toString(),
        timestampYear: timestampYear.toString(),
        timestampMonth: timestampMonth.toString(),
        timestampDay: timestampDay.toString(),
        timestampHour: timestampHour.toString(),
        timestampMinute: timestampMinute.toString(),
        timestampSecond: timestampSecond.toString(),
        depositorKeyLow: depositorPubKeyLow.toString(),
        depositorKeyHigh: depositorPubKeyHigh.toString(),
        amount: amount.toString(),
        tokenMintLow: tokenMintLow.toString(),
        tokenMintHigh: tokenMintHigh.toString(),
        version: version.toString(),
        index: index.toString()
    };
    
    
    fs.writeFileSync(
        "../circuits/deposit_input.json",
        JSON.stringify(circuitInput, null, 2)
    );
    
    console.log("✅ Deposit circuit input generated!");
    console.log("📄 File: circuits/deposit_input.json");
}

function bytesToFieldElement(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
        result = (result << 8n) | BigInt(bytes[i]!);
    }
    return result;
}

function generateRandomSecret(): bigint {
    return 12345n; // Deterministic for testing
}

function generateRandomNullifier(): bigint {
    return 67890n; // Deterministic for testing
}

generateDepositCircuitInput();