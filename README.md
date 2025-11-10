# VYRA - Privacy Protocol on Sui

A production-ready privacy protocol leveraging zero-knowledge proofs for confidential transactions on the Sui blockchain.

## Features

- **Zero-Knowledge Proofs**: Groth16 zk-SNARKs for complete transaction privacy
- **Private Deposits**: Shield your assets with cryptographic commitments
- **Private Claims**: Claim funds without revealing transaction history
- **Decentralized Storage**: Integration with Walrus for encrypted off-chain data
- **Native Sui Integration**: Utilizes Sui's native Groth16 and Poseidon modules

## Architecture

### Smart Contracts
- Move-based privacy protocol on Sui
- Native ZK verification using `sui::groth16`
- Poseidon-based Merkle tree for commitment tracking
- Nullifier system to prevent double-spending

### Zero-Knowledge Circuits
- Deposit circuit: Proves knowledge of commitment secrets
- Claim circuit: Proves ownership and validates Merkle proofs
- Built with Circom, compiled to WASM for browser execution

### Frontend
- React + TypeScript + Vite
- Browser-based ZK proof generation using snarkjs
- Sui wallet integration via @mysten/dapp-kit
- Real-time transaction monitoring

## Technology Stack

- **Blockchain**: Sui (Testnet)
- **Smart Contracts**: Move
- **ZK Circuits**: Circom
- **ZK Proof System**: Groth16 (BN254 curve)
- **Hash Function**: Poseidon
- **Storage**: Walrus Protocol
- **Frontend**: React, TypeScript, Vite, Tailwind CSS

## Getting Started

### Prerequisites
- Node.js 18+
- Sui wallet
- Test SUI tokens

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Smart Contract

Deployed on Sui Testnet:
- Package ID: `0xb089f5fc18f62e055ef3516acb910df1031d58bb99fcb28349e7570eb589522f`
- State Object: `0xd3baf0fb4c6b872e69ff285d78e316032c4644f7ecea2a547ed14ff5db03ef88`

## Security

- Cryptographic commitments using Poseidon hash
- Nullifier-based double-spend prevention
- Merkle tree proofs for set membership
- On-chain ZK verification
- Encrypted off-chain storage

## License

MIT

