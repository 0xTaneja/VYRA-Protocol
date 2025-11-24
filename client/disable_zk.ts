import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';

dotenv.config();

const PACKAGE_ID = '0xb089f5fc18f62e055ef3516acb910df1031d58bb99fcb28349e7570eb589522f';
const UMBRA_STATE_ID = '0xd3baf0fb4c6b872e69ff285d78e316032c4644f7ecea2a547ed14ff5db03ef88';

async function main() {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in .env');
  }
  
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.toSuiAddress();
  
  console.log('Admin address:', address);
  console.log('Disabling ZK verification...');
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::umbra_core::disable_zk_verification`,
    arguments: [tx.object(UMBRA_STATE_ID)],
  });
  
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  
  console.log('✅ ZK verification disabled!');
  console.log('Transaction digest:', result.digest);
  console.log('Explorer:', `https://testnet.suivision.xyz/txblock/${result.digest}`);
}

main().catch(console.error);

