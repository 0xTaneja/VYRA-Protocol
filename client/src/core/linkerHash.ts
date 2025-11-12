import { poseidonHash } from "../crypto/poseidon";
import { splitPublicKey } from "./commitment";


export function createDepositLinkerHash(linkerkey: bigint,recipientAddress:Uint8Array): bigint{
    const recpk1= splitPublicKey(recipientAddress);
    return poseidonHash([linkerkey,recpk1.low,recpk1.high]);
}

export function createClaimLinkerHash(linkerkey: bigint,commitmentIndex: bigint): bigint{
    return poseidonHash([linkerkey,commitmentIndex]);
}

