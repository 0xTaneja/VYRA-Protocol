import { poseidonHash } from "../crypto/poseidon";


export function createNullifierHash(nullifier: bigint) : bigint {
    return poseidonHash([nullifier])
}

