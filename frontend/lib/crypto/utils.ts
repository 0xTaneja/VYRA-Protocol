

import { bytesToFieldElement, poseidonHash } from './poseidon';

export function splitPublicKey(publicKey: Uint8Array): { low: bigint; high: bigint } {
  if (publicKey.length !== 32) {
    throw new Error(`Public key must be 32 bytes, got ${publicKey.length}`);
  }
  
  const low = bytesToFieldElement(publicKey.slice(0, 16));
  const high = bytesToFieldElement(publicKey.slice(16, 32));
  
  return { low, high };
}

export function extractTimestamp(timestamp: Date): bigint[] {
  const year = BigInt(timestamp.getUTCFullYear());
  const month = BigInt(timestamp.getUTCMonth() + 1); 
  const day = BigInt(timestamp.getUTCDate());
  const hour = BigInt(timestamp.getUTCHours());
  const minute = BigInt(timestamp.getUTCMinutes());
  const second = BigInt(timestamp.getUTCSeconds());

  return [year, month, day, hour, minute, second];
}

export function generateRandomBytes32(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateRandomSecret(): bigint {
  const randomBytes = generateRandomBytes32();
  return bytesToFieldElement(randomBytes);
}

export function generateRandomNullifier(): bigint {
  const randomBytes = generateRandomBytes32();
  return bytesToFieldElement(randomBytes);
}

export function generateDepositITK(suiMVK: bigint, timestamp: Date): bigint {
  const timestampComponents = extractTimestamp(timestamp);
  
  return poseidonHash([suiMVK, ...timestampComponents]);
}

export function generateClaimITK(umbraMVK: bigint, timestamp: Date): bigint {
  const timestampComponents = extractTimestamp(timestamp);
  
  return poseidonHash([umbraMVK, ...timestampComponents]);
}

