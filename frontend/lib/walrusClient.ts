

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { WalrusFile } from '@mysten/walrus';
import type { Signer } from '@mysten/sui/cryptography';

import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  version: number;
}

export interface StoredCommitment {
  commitment: string;
  secret: string;
  nullifier: string;
  recipientPubKey: number[];
  depositorPubKey: number[];
  amount: string;
  tokenMint: number[];
  timestamp: string;
  depositLinkerHash: string;
  mvkCommitment: string;
}

export class WalrusStorageClient {
  private client: ReturnType<typeof SuiJsonRpcClient.prototype.$extend<ReturnType<typeof walrus>>>;

  constructor(network: 'mainnet' | 'testnet' | 'devnet' = 'testnet') {
    this.client = new SuiJsonRpcClient({
      url: getFullnodeUrl(network),
      network: network,
    }).$extend(
      walrus({
        wasmUrl: walrusWasmUrl,
        storageNodeClientOptions: {
          timeout: 60_000,
        },
      })
    );
  }

  private encrypt(data: string, viewingKey: bigint): EncryptedData {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);

    const keyBytes = this.bigintToBytes(viewingKey);
    const ciphertext = new Uint8Array(dataBytes.length);

    for (let i = 0; i < dataBytes.length; i++) {
      const keyByte = keyBytes[i % keyBytes.length]!;
      const nonceByte = nonce[i % nonce.length]!;
      ciphertext[i] = dataBytes[i]! ^ keyByte ^ nonceByte;
    }

    return {
      ciphertext: this.bytesToHex(ciphertext),
      nonce: this.bytesToHex(nonce),
      version: 1,
    };
  }

  private decrypt(encrypted: EncryptedData, viewingKey: bigint): string {
    const ciphertext = this.hexToBytes(encrypted.ciphertext);
    const nonce = this.hexToBytes(encrypted.nonce);
    const keyBytes = this.bigintToBytes(viewingKey);

    const plaintext = new Uint8Array(ciphertext.length);

    for (let i = 0; i < ciphertext.length; i++) {
      const keyByte = keyBytes[i % keyBytes.length]!;
      const nonceByte = nonce[i % nonce.length]!;
      plaintext[i] = ciphertext[i]! ^ keyByte ^ nonceByte;
    }

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  }

  async storeCommitment(
    commitment: StoredCommitment,
    viewingKey: bigint,
    signer: Signer,
    epochs: number = 5
  ): Promise<string> {
    console.log('🌊 Storing commitment on Walrus...');

    const jsonData = JSON.stringify(commitment);
    const encrypted = this.encrypt(jsonData, viewingKey);

    const file = WalrusFile.from({
      contents: new TextEncoder().encode(JSON.stringify(encrypted)),
      identifier: `commitment_${commitment.commitment}.json`,
      tags: {
        'content-type': 'application/json',
        'umbra-version': '1.0',
      },
    });

    try {
      
      const results = await this.client.walrus.writeFiles({
        files: [file],
        epochs,
        deletable: true,
        signer,
      });

      const blobId = results[0]!.blobId;
      console.log('✅ Stored on Walrus with blob ID:', blobId);

      return blobId;
    } catch (error) {
      console.error('❌ Failed to store on Walrus:', error);
      throw error;
    }
  }

  async retrieveCommitment(blobId: string, viewingKey: bigint): Promise<StoredCommitment> {
    console.log('🌊 Retrieving commitment from Walrus...');

    try {
      
      const [file] = await this.client.walrus.getFiles({ ids: [blobId] });

      if (!file) {
        throw new Error('File not found on Walrus');
      }

      const encryptedJson = await file.text();
      const encrypted: EncryptedData = JSON.parse(encryptedJson);

      const decrypted = this.decrypt(encrypted, viewingKey);
      const commitment: StoredCommitment = JSON.parse(decrypted);

      console.log('✅ Retrieved commitment from Walrus');
      return commitment;
    } catch (error) {
      console.error('❌ Failed to retrieve from Walrus:', error);
      throw error;
    }
  }

  async storeCommitments(
    commitments: StoredCommitment[],
    viewingKey: bigint,
    signer: Signer,
    epochs: number = 5
  ): Promise<string> {
    console.log(`🌊 Storing ${commitments.length} commitments on Walrus...`);

    const jsonData = JSON.stringify(commitments);
    const encrypted = this.encrypt(jsonData, viewingKey);

    const file = WalrusFile.from({
      contents: new TextEncoder().encode(JSON.stringify(encrypted)),
      identifier: 'commitments.json',
      tags: {
        'content-type': 'application/json',
        'umbra-version': '1.0',
        'count': commitments.length.toString(),
      },
    });

    try {
      
      const results = await this.client.walrus.writeFiles({
        files: [file],
        epochs,
        deletable: true,
        signer,
      });

      const blobId = results[0]!.blobId;
      console.log('✅ Stored on Walrus with blob ID:', blobId);

      return blobId;
    } catch (error) {
      console.error('❌ Failed to store on Walrus:', error);
      throw error;
    }
  }

  async retrieveCommitments(blobId: string, viewingKey: bigint): Promise<StoredCommitment[]> {
    console.log('🌊 Retrieving commitments from Walrus...');

    try {
      
      const [file] = await this.client.walrus.getFiles({ ids: [blobId] });

      if (!file) {
        throw new Error('File not found on Walrus');
      }

      const encryptedJson = await file.text();
      const encrypted: EncryptedData = JSON.parse(encryptedJson);

      const decrypted = this.decrypt(encrypted, viewingKey);
      const commitments: StoredCommitment[] = JSON.parse(decrypted);

      console.log(`✅ Retrieved ${commitments.length} commitments from Walrus`);
      return commitments;
    } catch (error) {
      console.error('❌ Failed to retrieve from Walrus:', error);
      throw error;
    }
  }

  private bigintToBytes(value: bigint): Uint8Array {
    const bytes = new Uint8Array(32);
    let v = value;
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(v & 0xffn);
      v = v >> 8n;
    }
    return bytes;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}

export const walrusClient = new WalrusStorageClient('testnet');

