// Sui Network Configuration
export const SUI_CONFIG = {
    // Deployed contract addresses (COMPLETE with Poseidon Merkle Tree + Groth16 ready)
    PACKAGE_ID: "0xb089f5fc18f62e055ef3516acb910df1031d58bb99fcb28349e7570eb589522f",
    UMBRA_STATE_ID: "0xd3baf0fb4c6b872e69ff285d78e316032c4644f7ecea2a547ed14ff5db03ef88",
    
    // Network
    NETWORK: "testnet" as const,
    RPC_URL: "https://fullnode.testnet.sui.io:443",
    
    // Gas budget for transactions
    GAS_BUDGET: 100_000_000, // 0.1 SUI
} as const;

// Module names
export const MODULE_NAME = "umbra_core";

