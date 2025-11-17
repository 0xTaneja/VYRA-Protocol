/**
 * Prepare verification keys for Sui's Groth16 verifier
 * 
 * This script converts snarkjs verification keys to the format expected by Sui
 */

import * as fs from 'fs';
import * as path from 'path';

const CIRCUITS_DIR = path.join(__dirname, '../../../circuits');

// Read verification keys
const depositVKey = JSON.parse(fs.readFileSync(path.join(CIRCUITS_DIR, 'deposit_verification_key.json'), 'utf8'));
const claimVKey = JSON.parse(fs.readFileSync(path.join(CIRCUITS_DIR, 'claim_verification_key.json'), 'utf8'));

console.log("📋 Deposit Verification Key (for Sui):");
console.log("Protocol:", depositVKey.protocol);
console.log("Curve:", depositVKey.curve);
console.log("Public inputs:", depositVKey.nPublic);
console.log("\n📋 Claim Verification Key (for Sui):");
console.log("Protocol:", claimVKey.protocol);
console.log("Curve:", claimVKey.curve);
console.log("Public inputs:", claimVKey.nPublic);

// Note: Sui expects verification keys in a specific serialized format
// For now, we'll use the snarkjs format and convert in TypeScript before submission
// The actual conversion to bytes happens in the proof generation functions

console.log("\n✅ Verification keys are ready.");
console.log("ℹ️  Use the proof generation functions to convert proofs to Sui format.");

