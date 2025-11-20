

import * as snarkjs from 'snarkjs';
import { extractTimestamp, splitPublicKey } from '../crypto/utils';

const WASM_PATH = '/zkp/deposit_js/deposit.wasm';
const ZKEY_PATH = '/zkp/deposit_0000.zkey';

export interface DepositProofInput {
  
  suiMVK: bigint;
  recipientPubKey: Uint8Array;
  secret: bigint;
  nullifier: bigint;

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

export async function generateDepositProof(input: DepositProofInput): Promise<DepositProof> {
  console.log('🔐 Generating deposit ZK proof...');

  const recipientSplit = splitPublicKey(input.recipientPubKey);
  const depositorSplit = splitPublicKey(input.depositorPubKey);
  const tokenMintSplit = splitPublicKey(input.tokenMint);
  const time = extractTimestamp(input.timestamp);

  const circuitInput = {
    
    suiMVK: input.suiMVK.toString(),
    recipientPubKeyLow: recipientSplit.low.toString(),
    recipientPubKeyHigh: recipientSplit.high.toString(),
    secret: input.secret.toString(),
    nullifier: input.nullifier.toString(),

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
    version: '1',
    index: '0',
  };

  try {
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      WASM_PATH,
      ZKEY_PATH
    );

    console.log('✅ Deposit proof generated successfully');

    return formatProofForSui(proof, publicSignals);
  } catch (error) {
    console.error('❌ Error generating deposit proof:', error);
    throw error;
  }
}

function formatProofForSui(proof: any, publicSignals: string[]): DepositProof {

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

