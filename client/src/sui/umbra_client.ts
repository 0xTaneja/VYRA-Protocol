import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { bcs } from "@mysten/sui/bcs";
import { SUI_CONFIG, MODULE_NAME } from "./config";

// ============ TYPES ============

export interface DepositParams {
    commitment: bigint;
    linkerHash: bigint;
    mvkCommitment: bigint;
    amount: number; // in MIST (1 SUI = 1_000_000_000 MIST)
    proofA: bigint[];
    proofB: bigint[];
    proofC: bigint[];
    publicInputs: bigint[];
}

export interface ClaimParams {
    nullifierHash: bigint;
    claimLinkerHash: bigint;
    recipient: string;
    amount: number;
    merkleRoot: bigint;
    proofA: bigint[];
    proofB: bigint[];
    proofC: bigint[];
    publicInputs: bigint[];
}

export interface UmbraState {
    commitmentCount: number;
    merkleRoot: bigint;
    totalDeposited: number;
    poolBalance: number;
}

// ============ CLIENT CLASS ============

export class UmbraClient {
    private client: SuiClient;
    
    constructor(rpcUrl?: string) {
        this.client = new SuiClient({ 
            url: rpcUrl || SUI_CONFIG.RPC_URL 
        });
    }

    // ============ DEPOSIT ============
    
    /**
     * Submit a deposit transaction to the Umbra protocol
     */
    async deposit(
        keypair: Ed25519Keypair,
        params: DepositParams
    ): Promise<string> {
        const tx = new Transaction();
        
        // Split SUI coin for deposit amount
        const [coin] = tx.splitCoins(tx.gas, [params.amount]);
        
        // Call deposit function
        tx.moveCall({
            target: `${SUI_CONFIG.PACKAGE_ID}::${MODULE_NAME}::deposit`,
            arguments: [
                tx.object(SUI_CONFIG.UMBRA_STATE_ID), // state
                tx.pure.u256(params.commitment), // commitment
                tx.pure.u256(params.linkerHash), // linker_hash
                tx.pure.u256(params.mvkCommitment), // mvk_commitment
                coin, // payment
                tx.pure(encodeVectorU256(params.proofA)), // proof_a
                tx.pure(encodeVectorU256(params.proofB)), // proof_b
                tx.pure(encodeVectorU256(params.proofC)), // proof_c
                tx.pure(encodeVectorU256(params.publicInputs)), // public_inputs
            ],
        });
        
        // Set gas budget
        tx.setGasBudget(SUI_CONFIG.GAS_BUDGET);
        
        // Sign and execute
        const result = await this.client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showEffects: true,
                showEvents: true,
            },
        });
        
        return result.digest;
    }

    // ============ CLAIM ============
    
    /**
     * Submit a claim transaction to withdraw from the Umbra protocol
     */
    async claim(
        keypair: Ed25519Keypair,
        params: ClaimParams
    ): Promise<string> {
        const tx = new Transaction();
        
        // Call claim function
        tx.moveCall({
            target: `${SUI_CONFIG.PACKAGE_ID}::${MODULE_NAME}::claim`,
            arguments: [
                tx.object(SUI_CONFIG.UMBRA_STATE_ID), // state
                tx.pure.u256(params.nullifierHash), // nullifier_hash
                tx.pure.u256(params.claimLinkerHash), // claim_linker_hash
                tx.pure.address(params.recipient), // recipient
                tx.pure.u64(params.amount), // amount
                tx.pure.u256(params.merkleRoot), // merkle_root
                tx.pure(encodeVectorU256(params.proofA)), // proof_a
                tx.pure(encodeVectorU256(params.proofB)), // proof_b
                tx.pure(encodeVectorU256(params.proofC)), // proof_c
                tx.pure(encodeVectorU256(params.publicInputs)), // public_inputs
            ],
        });
        
        // Set gas budget
        tx.setGasBudget(SUI_CONFIG.GAS_BUDGET);
        
        // Sign and execute
        const result = await this.client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showEffects: true,
                showEvents: true,
            },
        });
        
        return result.digest;
    }

    // ============ UPDATE MERKLE ROOT ============
    
    /**
     * Update the Merkle root (after deposits)
     */
    async updateMerkleRoot(
        keypair: Ed25519Keypair,
        newRoot: bigint
    ): Promise<string> {
        const tx = new Transaction();
        
        tx.moveCall({
            target: `${SUI_CONFIG.PACKAGE_ID}::${MODULE_NAME}::update_merkle_root`,
            arguments: [
                tx.object(SUI_CONFIG.UMBRA_STATE_ID),
                tx.pure.u256(newRoot),
            ],
        });
        
        tx.setGasBudget(SUI_CONFIG.GAS_BUDGET);
        
        const result = await this.client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showEffects: true,
            },
        });
        
        return result.digest;
    }

    // ============ QUERY FUNCTIONS ============
    
    /**
     * Get the current protocol state
     */
    async getState(): Promise<UmbraState> {
        const object = await this.client.getObject({
            id: SUI_CONFIG.UMBRA_STATE_ID,
            options: {
                showContent: true,
            },
        });
        
        if (object.data?.content?.dataType !== "moveObject") {
            throw new Error("Invalid object type");
        }
        
        const fields = object.data.content.fields as any;
        
        return {
            commitmentCount: Number(fields.commitment_count),
            merkleRoot: BigInt(fields.current_merkle_root),
            totalDeposited: Number(fields.total_deposited),
            poolBalance: Number(fields.pool_balance),
        };
    }
    
    /**
     * Get commitment count
     */
    async getCommitmentCount(): Promise<number> {
        const state = await this.getState();
        return state.commitmentCount;
    }
    
    /**
     * Get current Merkle root
     */
    async getMerkleRoot(): Promise<bigint> {
        const state = await this.getState();
        return state.merkleRoot;
    }
    
    /**
     * Check if a nullifier has been spent
     */
    async isNullifierSpent(nullifierHash: bigint): Promise<boolean> {
        // Note: This requires reading from the Table, which is more complex
        // For now, we'll need to query events or implement a more sophisticated approach
        // TODO: Implement proper Table reading
        throw new Error("isNullifierSpent not yet implemented - requires dynamic field reading");
    }
    
    /**
     * Get pool balance
     */
    async getPoolBalance(): Promise<number> {
        const state = await this.getState();
        return state.poolBalance;
    }

    // ============ EVENT QUERIES ============
    
    /**
     * Get all deposit events
     */
    async getDepositEvents(limit: number = 100): Promise<any[]> {
        const events = await this.client.queryEvents({
            query: {
                MoveEventType: `${SUI_CONFIG.PACKAGE_ID}::${MODULE_NAME}::DepositEvent`,
            },
            limit,
            order: "descending",
        });
        
        return events.data;
    }
    
    /**
     * Get all claim events
     */
    async getClaimEvents(limit: number = 100): Promise<any[]> {
        const events = await this.client.queryEvents({
            query: {
                MoveEventType: `${SUI_CONFIG.PACKAGE_ID}::${MODULE_NAME}::ClaimEvent`,
            },
            limit,
            order: "descending",
        });
        
        return events.data;
    }
}

// ============ HELPER FUNCTIONS ============

/**
 * Encode a vector of u256 values for Sui
 */
function encodeVectorU256(values: bigint[]): Uint8Array {
    return bcs.vector(bcs.u256()).serialize(values).toBytes();
}

/**
 * Convert bigint to u256 format for Sui
 */
export function bigintToU256(value: bigint): string {
    return value.toString();
}

/**
 * Convert SUI to MIST (1 SUI = 1_000_000_000 MIST)
 */
export function suiToMist(sui: number): number {
    return Math.floor(sui * 1_000_000_000);
}

/**
 * Convert MIST to SUI
 */
export function mistToSui(mist: number): number {
    return mist / 1_000_000_000;
}

