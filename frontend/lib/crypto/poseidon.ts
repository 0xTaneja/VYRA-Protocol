

import { 
  poseidon1, poseidon2, poseidon3, poseidon4, 
  poseidon5, poseidon6, poseidon7, poseidon8, 
  poseidon9, poseidon10, poseidon11, poseidon12, 
  poseidon13, poseidon14, poseidon15, poseidon16 
} from 'poseidon-lite';

export function poseidonHash(inputs: bigint[]): bigint {
  if (inputs.length === 0) {
    throw new Error("Cannot hash empty array");
  }

  switch (inputs.length) {
    case 1: return poseidon1(inputs);
    case 2: return poseidon2(inputs);
    case 3: return poseidon3(inputs);
    case 4: return poseidon4(inputs);
    case 5: return poseidon5(inputs);
    case 6: return poseidon6(inputs);
    case 7: return poseidon7(inputs);
    case 8: return poseidon8(inputs);
    case 9: return poseidon9(inputs);
    case 10: return poseidon10(inputs);
    case 11: return poseidon11(inputs);
    case 12: return poseidon12(inputs);
    case 13: return poseidon13(inputs);
    case 14: return poseidon14(inputs);
    case 15: return poseidon15(inputs);
    case 16: return poseidon16(inputs);
    default:
      throw new Error(`Poseidon hash supports 1-16 inputs, got ${inputs.length}`);
  }
}

export function poseidonHashPair(left: bigint, right: bigint): bigint {
  return poseidon2([left, right]);
}

export function bytesToFieldElement(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]!);
  }
  return result;
}

export function fieldElementToBytes(element: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let value = element;

  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xFFn);
    value = value >> 8n;
  }

  return bytes;
}

export function stringToFieldElement(str: string): bigint {
  const bytes = new TextEncoder().encode(str);
  return bytesToFieldElement(bytes);
}

