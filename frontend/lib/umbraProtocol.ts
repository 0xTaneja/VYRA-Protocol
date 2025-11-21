

import { Transaction } from '@mysten/sui/transactions';
import { UMBRA_CONFIG } from './umbra';
import { generateDepositProof, generateClaimProof } from './zkp';
import {
  generateRandomSecret,
  generateRandomNullifier,
  splitPublicKey,
  extractTimestamp,
  generateDepositITK,
  generateClaimITK,
} from './crypto/utils';
import { poseidonHash, poseidonHashPair, bytesToFieldElement } from './crypto/poseidon';

export interface CommitmentData {
  
  secret: bigint;
  nullifier: bigint;
  recipientPubKey: Uint8Array;
  commitment: bigint;

  depositorPubKey: Uint8Array;
  amount: bigint;
  tokenMint: Uint8Array;
  timestamp: Date;

  depositLinkerHash: bigint;
  mvkCommitment: bigint;
}

export function generateCommitment(params: {
  recipientAddress: Uint8Array; 
  depositorAddress: Uint8Array; 
  amount: bigint;
  suiMVK: bigint; 
}): CommitmentData {
  
  const secret = generateRandomSecret();
  const nullifier = generateRandomNullifier();

  const tokenMint = new Uint8Array(32).fill(0); 

  const timestamp = new Date();

  const recipientSplit = splitPublicKey(params.recipientAddress);
  const depositorSplit = splitPublicKey(params.depositorAddress);
  const tokenMintSplit = splitPublicKey(tokenMint);

  const innerHash = poseidonHash([secret, nullifier, recipientSplit.low, recipientSplit.high]);

  const time = extractTimestamp(timestamp);
  const commitment = poseidonHash([
    1n, 
    0n, 
    innerHash,
    depositorSplit.low,
    depositorSplit.high,
    params.amount,
    tokenMintSplit.low,
    tokenMintSplit.high,
    time[0]!, 
    time[1]!, 
    time[2]!, 
    time[3]!, 
    time[4]!, 
    time[5]!, 
  ]);

  const depositITK = generateDepositITK(params.suiMVK, timestamp);

  const linkerDomain = bytesToFieldElement(new TextEncoder().encode('LINKER'));
  const linkerKey = poseidonHash([depositITK, linkerDomain]);

  const depositLinkerHash = poseidonHash([linkerKey, commitment]);

  const mvkCommitment = poseidonHash([params.suiMVK]);

  return {
    secret,
    nullifier,
    recipientPubKey: params.recipientAddress,
    commitment,
    depositorPubKey: params.depositorAddress,
    amount: params.amount,
    tokenMint,
    timestamp,
    depositLinkerHash,
    mvkCommitment,
  };
}

export async function buildDepositTxWithProof(params: {
  amount: bigint;
  senderAddress: Uint8Array;
  recipientAddress: Uint8Array;
  suiMVK: bigint;
}): Promise<{ tx: Transaction; commitmentData: CommitmentData }> {
  console.log('🏗️ Building deposit transaction with real ZK proof...');

  const commitmentData = generateCommitment({
    recipientAddress: params.recipientAddress,
    depositorAddress: params.senderAddress,
    amount: params.amount,
    suiMVK: params.suiMVK,
  });

  const proof = await generateDepositProof({
    suiMVK: params.suiMVK,
    recipientPubKey: commitmentData.recipientPubKey,
    secret: commitmentData.secret,
    nullifier: commitmentData.nullifier,
    commitment: commitmentData.commitment,
    linkerHash: commitmentData.depositLinkerHash,
    mvkCommitment: commitmentData.mvkCommitment,
    timestamp: commitmentData.timestamp,
    depositorPubKey: commitmentData.depositorPubKey,
    amount: commitmentData.amount,
    tokenMint: commitmentData.tokenMint,
  });

  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)]);

  tx.moveCall({
    target: `${UMBRA_CONFIG.PACKAGE_ID}::umbra_core::deposit`,
    arguments: [
      tx.object(UMBRA_CONFIG.UMBRA_STATE_ID),
      tx.pure.u256(commitmentData.commitment),
      tx.pure.u256(commitmentData.depositLinkerHash),
      tx.pure.u256(commitmentData.mvkCommitment),
      coin,
      tx.pure.vector('u256', proof.proofA),
      tx.pure.vector('u256', proof.proofB),
      tx.pure.vector('u256', proof.proofC),
      tx.pure.vector('u256', proof.publicInputs),
    ],
  });

  console.log('✅ Deposit transaction built with real ZK proof');

  return { tx, commitmentData };
}

export async function buildClaimTxWithProof(params: {
  commitmentData: CommitmentData;
  recipientAddress: string; 
  merkleRoot: bigint;
  merklePathIndices: number[];
  merklePathSiblings: bigint[];
  umbraMVK: bigint;
}): Promise<Transaction> {
  console.log('🏗️ Building claim transaction with real ZK proof...');

  const claimTimestamp = new Date();

  const claimITK = generateClaimITK(params.umbraMVK, claimTimestamp);
  const linkerDomain = bytesToFieldElement(new TextEncoder().encode('LINKER'));
  const linkerKey = poseidonHash([claimITK, linkerDomain]);
  const claimLinkerHash = poseidonHash([linkerKey, params.commitmentData.commitment]);

  const nullifierHash = poseidonHash([params.commitmentData.nullifier, params.commitmentData.commitment]);

  const mvkCommitment = poseidonHash([params.umbraMVK]);

  const proof = await generateClaimProof({
    umbraMVK: params.umbraMVK,
    recipientPubKey: params.commitmentData.recipientPubKey,
    secret: params.commitmentData.secret,
    nullifier: params.commitmentData.nullifier,
    commitmentIndex: 0n, 
    depositorPubKey: params.commitmentData.depositorPubKey,
    amount: params.commitmentData.amount,
    tokenMint: params.commitmentData.tokenMint,
    depositTimestamp: params.commitmentData.timestamp,
    merklePathIndices: params.merklePathIndices,
    merklePathSiblings: params.merklePathSiblings,
    merkleRoot: params.merkleRoot,
    nullifierHash,
    claimLinkerHash,
    mvkCommitment,
    claimTimestamp,
  });

  const tx = new Transaction();

  tx.moveCall({
    target: `${UMBRA_CONFIG.PACKAGE_ID}::umbra_core::claim`,
    arguments: [
      tx.object(UMBRA_CONFIG.UMBRA_STATE_ID),
      tx.pure.u256(nullifierHash),
      tx.pure.u256(claimLinkerHash),
      tx.pure.address(params.recipientAddress),
      tx.pure.u64(params.commitmentData.amount),
      tx.pure.u256(params.merkleRoot),
      tx.pure.vector('u256', proof.proofA),
      tx.pure.vector('u256', proof.proofB),
      tx.pure.vector('u256', proof.proofC),
      tx.pure.vector('u256', proof.publicInputs),
    ],
  });

  console.log('✅ Claim transaction built with real ZK proof');

  return tx;
}

export function deriveMVKFromSignature(signature: Uint8Array): bigint {

  return bytesToFieldElement(signature.slice(0, 31));
}

