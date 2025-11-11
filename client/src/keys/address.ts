import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { kmac256 } from "@noble/hashes/sha3-addons.js"


function indexToBytes(index:number):Uint8Array{
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0,index,false);
    return new Uint8Array(buf)
}

export const generateUmbraAddress = (masterSeed:Uint8Array,index:number):Ed25519Keypair =>{
    
    const message = "Umbra-Address-Generation"
    const messageBytes = new TextEncoder().encode(message);
    const indexBytes = indexToBytes(index);
    const combined = new Uint8Array([...messageBytes,...indexBytes]);
    const childSeed = kmac256(masterSeed,combined,{dkLen:32});
    const keypair = Ed25519Keypair.fromSecretKey(childSeed);
    return keypair;



}