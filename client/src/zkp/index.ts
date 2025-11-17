/**
 * ZK-SNARK Proof Generation Module
 * 
 * Exports proof generation and verification functions for deposit and claim circuits
 */

export {
    generateDepositProof,
    verifyDepositProof,
    type DepositProofInput,
    type DepositProof
} from "./depositProof";

export {
    generateClaimProof,
    verifyClaimProof,
    type ClaimProofInput,
    type ClaimProof
} from "./claimProof";

