import { randomBytes } from "crypto";
import { bytesToFieldElement, poseidonHash } from "../crypto/poseidon";
import { extractTimestamp } from "../keys/itk";


export function splitPublicKey(publicKey:Uint8Array): {low:bigint,high:bigint} {
    const low = bytesToFieldElement(publicKey.slice(0,16));
    const high = bytesToFieldElement(publicKey.slice(16,32));
    return {low,high};
}

function generateRandomSecret() : bigint {
    const randombytes = randomBytes(32);
    return bytesToFieldElement(randombytes);
   
}

function generateRandomNullifier() : bigint {
    const rbytes = randomBytes(32);
    return bytesToFieldElement(rbytes);

}

interface Commitment {

    secret: bigint;
    nullifier: bigint;
    recipientAddress: Uint8Array;

    version: bigint;
    index: bigint;
    depositorAddress: Uint8Array;
    amount: bigint;
    tokenMint: Uint8Array;
    timestamp: Date;

}

export function createCommitment(data:Commitment): {
    commitment: bigint;
    secret : bigint;
    nullifier : bigint;

}
{
    const recpk1 = splitPublicKey(data.recipientAddress);
   
    const depk1 = splitPublicKey(data.depositorAddress);

    const mintpk1 = splitPublicKey(data.tokenMint);
   
    const innerHash = poseidonHash([data.secret,data.nullifier,recpk1.low,recpk1.high]);

    const time = extractTimestamp(data.timestamp);
    const commitmentHash = poseidonHash([
           data.version,
           data.index,
           innerHash,
           depk1.low,
           depk1.high,
           data.amount,
           mintpk1.low,
           mintpk1.high,
           time[0]!,
           time[1]!,
           time[2]!,
           time[3]!,
           time[4]!,
           time[5]!,



    ])
    return {
        commitment:commitmentHash,
        secret:data.secret,
        nullifier:data.nullifier
    };
}
