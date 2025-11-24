

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type { WalletAccount } from '@mysten/wallet-standard';

type TransactionBlock = Transaction;

export const UMBRA_CONFIG = {
  PACKAGE_ID: '0xb089f5fc18f62e055ef3516acb910df1031d58bb99fcb28349e7570eb589522f',
  UMBRA_STATE_ID: '0xd3baf0fb4c6b872e69ff285d78e316032c4644f7ecea2a547ed14ff5db03ef88',
  NETWORK: 'testnet' as const,
  RPC_URL: 'https://fullnode.testnet.sui.io:443',
};

export interface DepositParams {
  amount: bigint;
  payment: string; 
}

export interface ClaimParams {
  recipient: string; 
  amount: bigint;
  nullifierHash: bigint;
  claimLinkerHash: bigint;
  merkleRoot: bigint;
  proof: {
    a: bigint[];
    b: bigint[];
    c: bigint[];
    publicInputs: bigint[];
  };
}

export class UmbraClient {
  private suiClient: SuiClient;

  constructor() {
    this.suiClient = new SuiClient({ url: UMBRA_CONFIG.RPC_URL });
  }

  async getState() {
    const state = await this.suiClient.getObject({
      id: UMBRA_CONFIG.UMBRA_STATE_ID,
      options: { showContent: true },
    });

    if (!state.data?.content || state.data.content.dataType !== 'moveObject') {
      throw new Error('Failed to fetch Umbra state');
    }

    const fields = state.data.content.fields as any;
    return {
      commitmentCount: BigInt(fields.commitment_count),
      merkleRoot: BigInt(fields.current_merkle_root),
      poolBalance: BigInt(fields.pool_balance),
      totalDeposited: BigInt(fields.total_deposited),
    };
  }

  async getBalance(address: string): Promise<bigint> {
    const balance = await this.suiClient.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    });
    return BigInt(balance.totalBalance);
  }

  async buildDepositTx(params: DepositParams, senderAddress: string): Promise<TransactionBlock> {
    const tx = new Transaction();

    const dummyProofA = [0n, 0n];
    const dummyProofB = [0n, 0n, 0n, 0n];
    const dummyProofC = [0n, 0n];
    const dummyPublicInputs = Array(16).fill(0n);

    const commitment = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    const linkerHash = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    const mvkCommitment = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.amount)]);

    tx.moveCall({
      target: `${UMBRA_CONFIG.PACKAGE_ID}::umbra_core::deposit`,
      arguments: [
        tx.object(UMBRA_CONFIG.UMBRA_STATE_ID),
        tx.pure.u256(commitment),
        tx.pure.u256(linkerHash),
        tx.pure.u256(mvkCommitment),
        coin,
        tx.pure.vector('u256', dummyProofA),
        tx.pure.vector('u256', dummyProofB),
        tx.pure.vector('u256', dummyProofC),
        tx.pure.vector('u256', dummyPublicInputs),
      ],
    });

    return tx;
  }

  async buildClaimTx(params: ClaimParams, senderAddress: string): Promise<TransactionBlock> {
    const tx = new Transaction();

    const dummyProofA = [0n, 0n];
    const dummyProofB = [0n, 0n, 0n, 0n];
    const dummyProofC = [0n, 0n];
    const dummyPublicInputs = [
      params.merkleRoot,
      params.nullifierHash,
      params.claimLinkerHash,
    ];

    tx.moveCall({
      target: `${UMBRA_CONFIG.PACKAGE_ID}::umbra_core::claim`,
      arguments: [
        tx.object(UMBRA_CONFIG.UMBRA_STATE_ID),
        tx.pure.u256(params.nullifierHash),
        tx.pure.u256(params.claimLinkerHash),
        tx.pure.address(params.recipient),
        tx.pure.u64(params.amount),
        tx.pure.u256(params.merkleRoot),
        tx.pure.vector('u256', dummyProofA),
        tx.pure.vector('u256', dummyProofB),
        tx.pure.vector('u256', dummyProofC),
        tx.pure.vector('u256', dummyPublicInputs),
      ],
    });

    return tx;
  }

  async getTransactions(address: string, limit: number = 10) {
    const txs = await this.suiClient.queryTransactionBlocks({
      filter: { FromAddress: address },
      limit,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
    });

    return txs.data;
  }

  async getUmbraEvents(eventType: 'DepositEvent' | 'ClaimEvent', limit: number = 20) {
    const events = await this.suiClient.queryEvents({
      query: {
        MoveEventType: `${UMBRA_CONFIG.PACKAGE_ID}::umbra_core::${eventType}`,
      },
      limit,
      order: 'descending',
    });

    return events.data;
  }

  async getAllCommitments(): Promise<Array<{ commitment: bigint; index: number }>> {
    const allEvents: Array<{ commitment: bigint; index: number }> = [];
    let hasNextPage = true;
    let cursor: string | null | undefined = null;

    while (hasNextPage) {
      const events = await this.suiClient.queryEvents({
        query: {
          MoveEventType: `${UMBRA_CONFIG.PACKAGE_ID}::umbra_core::DepositEvent`,
        },
        limit: 50,
        order: 'ascending',
        cursor,
      });

      for (const event of events.data) {
        const parsedJson = event.parsedJson as any;
        allEvents.push({
          commitment: BigInt(parsedJson.commitment),
          index: Number(parsedJson.index),
        });
      }

      hasNextPage = events.hasNextPage;
      cursor = events.nextCursor;
    }

    allEvents.sort((a, b) => a.index - b.index);
    return allEvents;
  }
}

export const umbraClient = new UmbraClient();

