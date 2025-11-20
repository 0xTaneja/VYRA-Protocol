

import * as snarkjs from 'snarkjs';
import { extractTimestamp, splitPublicKey } from '../crypto/utils';

const WASM_PATH = '/zkp/claim_js/claim.wasm';
const ZKEY_PATH = '/zkp/claim_0000.zkey';

export interface ClaimProofInput {
  
  umbraMVK: bigint;
  recipientPubKey: Uint8Array;
  secret: bigint;
  nullifier: bigint;
  commitmentIndex: bigint;

  depositorPubKey: Uint8Array;
  amount: bigint;
  tokenMint: Uint8Array;
  depositTimestamp: Date;

  merklePathIndices: number[]; 
  merklePathSiblings: bigint[]; 

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

export async function generateClaimProof(input: ClaimProofInput): Promise<ClaimProof> {
  console.log('🔐 Generating claim ZK proof...');

  const recipientSplit = splitPublicKey(input.recipientPubKey);
  const depositorSplit = splitPublicKey(input.depositorPubKey);
  const tokenMintSplit = splitPublicKey(input.tokenMint);
  const depositTime = extractTimestamp(input.depositTimestamp);
  const claimTime = extractTimestamp(input.claimTimestamp);

  const TREE_DEPTH = 20;
  if (input.merklePathIndices.length !== TREE_DEPTH) {
    throw new Error(
      `Merkle path indices must have ${TREE_DEPTH} elements, got ${input.merklePathIndices.length}`
    );
  }
  if (input.merklePathSiblings.length !== TREE_DEPTH) {
    throw new Error(
      `Merkle path siblings must have ${TREE_DEPTH} elements, got ${input.merklePathSiblings.length}`
    );
  }

  const circuitInput = {
    
    umbraMVK: input.umbraMVK.toString(),
    secret: input.secret.toString(),
    nullifier: input.nullifier.toString(),
    recipientPubKeyLow: recipientSplit.low.toString(),
    recipientPubKeyHigh: recipientSplit.high.toString(),
    version: '1',
    commitmentIndex: input.commitmentIndex.toString(),

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

    merklePathIndices: input.merklePathIndices.map((i) => i.toString()),
    merklePathSiblings: input.merklePathSiblings.map((s) => s.toString()),

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

  try {
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      WASM_PATH,
      ZKEY_PATH
    );

    console.log('✅ Claim proof generated successfully');

    return formatProofForSui(proof, publicSignals);
  } catch (error) {
    console.error('❌ Error generating claim proof:', error);
    throw error;
  }
}

function formatProofForSui(proof: any, publicSignals: string[]): ClaimProof {

  const proofA = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];

  const proofB = [
    BigInt(proof.pi_b[0][0]),
    BigInt(proof.pi_b[0][1]),
    BigInt(proof.pi_b[1][0]),
    BigInt(proof.pi_b[1][1]),
  ];

  const proofC = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];

  const publicInputs = publicSignals.map((s) => BigInt(s));

  return { proofA, proofB, proofC, publicInputs };
}

