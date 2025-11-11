import {poseidonHash, stringToFieldElement } from "../crypto/poseidon";


const lkey = "Linker-Key";
export function deriveLinkerKey(itk: bigint): bigint {
   const domainElement = stringToFieldElement(lkey)
   return poseidonHash([itk,domainElement])
}

const mkey = "Memo-Key";
export function deriveMemoKey(itk: bigint): bigint {
   const domainElement = stringToFieldElement(mkey)
   return poseidonHash([itk,domainElement])
}
