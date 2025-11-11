import { bytesToFieldElement, poseidonHash, stringToFieldElement } from "../crypto/poseidon"

export const generateSuiMVK = (masterSeed:Uint8Array):bigint=> {
    const masterSeedNumber = bytesToFieldElement(masterSeed);
    const stringElement = stringToFieldElement("MVK-Sui-Address");
    const inputs = [masterSeedNumber,stringElement];
    const hash = poseidonHash(inputs);
    return hash;
}

export const generateUmbraMVK = (masterSeed:Uint8Array,addressIndex:number):bigint => {
    const masterSeedNumber = bytesToFieldElement(masterSeed);
    const stringElement = stringToFieldElement("MVK-Umbra-Address");
    const addressIndexElement = BigInt(addressIndex);
    const inputs = [masterSeedNumber,stringElement,addressIndexElement]

    const hash = poseidonHash(inputs);
    return hash;
}