import { poseidonHash } from "../crypto/poseidon";


export function extractTimestamp(timestamp: Date): bigint[] {
    const year = BigInt(timestamp.getUTCFullYear());
    const month = BigInt(timestamp.getUTCMonth() + 1); // getUTCMonth() returns 0-11
    const day = BigInt(timestamp.getUTCDate());
    const hour = BigInt(timestamp.getUTCHours());
    const minute = BigInt(timestamp.getUTCMinutes());
    const second = BigInt(timestamp.getUTCSeconds());
    
    return [year, month, day, hour, minute, second];
}


export function generateDepositITK(suiMVK: bigint, timestamp: Date): bigint {
    const timestampComponents = extractTimestamp(timestamp);
    
    return poseidonHash([
        suiMVK,
        ...timestampComponents
    ]);
}


export function generateClaimITK(umbraMVK: bigint, timestamp: Date): bigint {
    const timestampComponents = extractTimestamp(timestamp);
    
    return poseidonHash([
        umbraMVK,
        ...timestampComponents
    ]);
}

