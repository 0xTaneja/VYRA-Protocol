
import {SuiJsonRpcClient} from "@mysten/sui/jsonRpc"
import {Ed25519Keypair} from "@mysten/sui/keypairs/ed25519"
import dotenv from "dotenv"
import {blake2b} from '@noble/hashes/blake2.js'
import { keccak_256 } from "@noble/hashes/sha3.js";
import { fromB64,fromHex } from "@mysten/sui/utils";

dotenv.config();

const client = new SuiJsonRpcClient({
    url: "https://fullnode.devnet.sui.io:443"
})

const UMBRA_SIGNING_MESSAGE = "UmbraPrivacy - Do NOT sign this message unless you are using a product by the Umbra Privacy Team or an integration with Umbra Privacy"

// Optional: Load wallet key from .env if needed
// const WALLET_KEY = process.env.WALLET_KEY;
// const keypair = WALLET_KEY ? Ed25519Keypair.fromSecretKey(fromHex(WALLET_KEY)) : null;
 
function suiMessageHash(message: string): Uint8Array {
    const messageBytes = new TextEncoder().encode(message);
    const prefix = new TextEncoder().encode("Sui Signed Message:");
    const combined = new Uint8Array([...prefix, ...messageBytes]);
    return blake2b(combined, { dkLen: 32 });
}


async function signWithSui(keypair: Ed25519Keypair, message: string): Promise<Uint8Array> {
   const msgHash = suiMessageHash(message);
   const signature = await keypair.sign(msgHash);

 
   return signature.slice(1, 65);
}

export const generateMasterSeed = async (keypair: Ed25519Keypair): Promise<Uint8Array> => {
    const signature = await signWithSui(keypair, UMBRA_SIGNING_MESSAGE);

    const masterSeed = keccak_256(signature);

    return masterSeed;
}