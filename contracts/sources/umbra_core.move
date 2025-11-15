#[allow(duplicate_alias, unused_use)]
module umbra::umbra_core {
    use sui::object;
    use sui::tx_context;
    use sui::table;
    use sui::event;
    use sui::coin;
    use sui::sui::SUI;
    use sui::balance;
    use sui::transfer;
    use sui::groth16;
    use sui::poseidon;  

    const E_NULLIFIER_ALREADY_SPENT: u64 = 1;
    const E_INVALID_MERKLE_ROOT: u64 = 2;
    const E_INSUFFICIENT_AMOUNT: u64 = 3;
    const E_INVALID_PROOF: u64 = 4;
    const E_INVALID_PROOF_FORMAT: u64 = 5;

    public struct UmbraState has key {
        id: object::UID,
        current_merkle_root: u256,
        commitments: table::Table<u64, u256>,  
        nullifiers: table::Table<u256, bool>,  
        commitment_count: u64,
        total_deposited: u64,
        pool_balance: balance::Balance<SUI>,  
        
        deposit_pvk: vector<u8>,  
        claim_pvk: vector<u8>,     
        zk_verification_enabled: bool,  
        
        admin: address,  
        
        root_buffer: table::Table<u256, bool>,  
        buffer_size: u64,  
    }

    public struct DepositEvent has copy, drop {
        commitment: u256,
        linker_hash: u256,
        mvk_commitment: u256,
        depositor: address,
        amount: u64,
        index: u64,
        timestamp: u64,
    }

    public struct ClaimEvent has copy, drop {
        nullifier_hash: u256,
        claim_linker_hash: u256,
        recipient: address,
        amount: u64,
        merkle_root: u256,
    }

    public struct MerkleRootUpdateEvent has copy, drop {
        old_root: u256,
        new_root: u256,
        commitment_count: u64,
    }

    fun init(ctx: &mut tx_context::TxContext) {
        let state = UmbraState {
            id: object::new(ctx),
            current_merkle_root: 0, 
            commitments: table::new(ctx),
            nullifiers: table::new(ctx),
            commitment_count: 0,
            total_deposited: 0,
            pool_balance: balance::zero(),

            deposit_pvk: std::vector::empty(),
            claim_pvk: std::vector::empty(),
            
            zk_verification_enabled: false,
            
            admin: tx_context::sender(ctx),
            
            root_buffer: table::new(ctx),
            buffer_size: 10,
        };

        transfer::share_object(state);
    }

    public fun deposit(
        state: &mut UmbraState,
        commitment: u256,
        linker_hash: u256,
        mvk_commitment: u256,
        payment: coin::Coin<SUI>,
        
        proof_a: vector<u256>,  
        proof_b: vector<u256>,  
        proof_c: vector<u256>,  
        public_inputs: vector<u256>,  
        ctx: &mut tx_context::TxContext
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, E_INSUFFICIENT_AMOUNT);

        let index = state.commitment_count;

        if (state.zk_verification_enabled) {
            verify_deposit_proof(
                state,
                &proof_a,
                &proof_b,
                &proof_c,
                &public_inputs,
                commitment,
                linker_hash,
                mvk_commitment
            );
        };

        table::add(&mut state.commitments, index, commitment);

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut state.pool_balance, payment_balance);

        state.commitment_count = index + 1;
        state.total_deposited = state.total_deposited + amount;

        update_merkle_root_internal(state);

        let timestamp = if (std::vector::length(&public_inputs) >= 9) {
            
            let year = (*std::vector::borrow(&public_inputs, 3) as u64);
            let month = (*std::vector::borrow(&public_inputs, 4) as u64);
            let day = (*std::vector::borrow(&public_inputs, 5) as u64);
            let hour = (*std::vector::borrow(&public_inputs, 6) as u64);
            let minute = (*std::vector::borrow(&public_inputs, 7) as u64);
            let second = (*std::vector::borrow(&public_inputs, 8) as u64);
            year * 10000000000 + month * 100000000 + day * 1000000 + hour * 10000 + minute * 100 + second
        } else {
            0 
        };

        event::emit(DepositEvent {
            commitment,
            linker_hash,
            mvk_commitment,
            depositor: tx_context::sender(ctx),
            amount,
            index,
            timestamp,
        });
    }

    public fun claim(
        state: &mut UmbraState,
        nullifier_hash: u256,
        claim_linker_hash: u256,
        recipient: address,
        amount: u64,
        merkle_root: u256,
       
        proof_a: vector<u256>,
        proof_b: vector<u256>,
        proof_c: vector<u256>,
        public_inputs: vector<u256>,
        ctx: &mut tx_context::TxContext
    ) {
       
        assert!(
            !table::contains(&state.nullifiers, nullifier_hash),
            E_NULLIFIER_ALREADY_SPENT
        );

        let is_valid_root = 
            merkle_root == state.current_merkle_root || 
            merkle_root == 0 ||  
            table::contains(&state.root_buffer, merkle_root);
        assert!(is_valid_root, E_INVALID_MERKLE_ROOT);

        if (state.zk_verification_enabled) {
            verify_claim_proof(
                state,
                &proof_a,
                &proof_b,
                &proof_c,
                &public_inputs,
                merkle_root,
                nullifier_hash,
                claim_linker_hash
            );
        };

        table::add(&mut state.nullifiers, nullifier_hash, true);

        let withdrawal = coin::take(&mut state.pool_balance, amount, ctx);
        transfer::public_transfer(withdrawal, recipient);

        event::emit(ClaimEvent {
            nullifier_hash,
            claim_linker_hash,
            recipient,
            amount,
            merkle_root,
        });
    }

    fun verify_deposit_proof(
        _state: &UmbraState,  
        proof_a: &vector<u256>,
        proof_b: &vector<u256>,
        proof_c: &vector<u256>,
        public_inputs: &vector<u256>,
        commitment: u256,
        linker_hash: u256,
        mvk_commitment: u256,
    ) {
        
        assert!(std::vector::length(proof_a) == 2, E_INVALID_PROOF_FORMAT);
        assert!(std::vector::length(proof_b) == 4, E_INVALID_PROOF_FORMAT);
        assert!(std::vector::length(proof_c) == 2, E_INVALID_PROOF_FORMAT);

        assert!(std::vector::length(public_inputs) >= 3, E_INVALID_PROOF_FORMAT);
        assert!(*std::vector::borrow(public_inputs, 0) == commitment, E_INVALID_PROOF);
        assert!(*std::vector::borrow(public_inputs, 1) == linker_hash, E_INVALID_PROOF);
        assert!(*std::vector::borrow(public_inputs, 2) == mvk_commitment, E_INVALID_PROOF);

    }

    fun verify_claim_proof(
        _state: &UmbraState,
        proof_a: &vector<u256>,
        proof_b: &vector<u256>,
        proof_c: &vector<u256>,
        public_inputs: &vector<u256>,
        merkle_root: u256,
        nullifier_hash: u256,
        claim_linker_hash: u256,
    ) {
        
        assert!(std::vector::length(proof_a) == 2, E_INVALID_PROOF_FORMAT);
        assert!(std::vector::length(proof_b) == 4, E_INVALID_PROOF_FORMAT);
        assert!(std::vector::length(proof_c) == 2, E_INVALID_PROOF_FORMAT);

        assert!(std::vector::length(public_inputs) >= 3, E_INVALID_PROOF_FORMAT);
        assert!(*std::vector::borrow(public_inputs, 0) == merkle_root, E_INVALID_PROOF);
        assert!(*std::vector::borrow(public_inputs, 1) == nullifier_hash, E_INVALID_PROOF);
        assert!(*std::vector::borrow(public_inputs, 2) == claim_linker_hash, E_INVALID_PROOF);

    }

    fun update_merkle_root_internal(state: &mut UmbraState) {
        
        let root = compute_merkle_root(state);
        
        let old_root = state.current_merkle_root;

        if (old_root != 0 && !table::contains(&state.root_buffer, old_root)) {
            table::add(&mut state.root_buffer, old_root, true);
        };

        state.current_merkle_root = root;
        
        event::emit(MerkleRootUpdateEvent {
            old_root,
            new_root: root,
            commitment_count: state.commitment_count,
        });
    }

    fun compute_merkle_root(state: &UmbraState): u256 {
        if (state.commitment_count == 0) {
            return 0
        };

        let zero: u256 = 0;

        let mut current_level = std::vector::empty<u256>();
        let mut i: u64 = 0;

        while (i < state.commitment_count) {
            if (table::contains(&state.commitments, i)) {
                let commitment = *table::borrow(&state.commitments, i);
                current_level.push_back(commitment);
            } else {
                current_level.push_back(zero);
            };
            i = i + 1;
        };

        if (current_level.length() % 2 == 1) {
            current_level.push_back(zero);
        };

        while (current_level.length() > 1) {
            let mut next_level = std::vector::empty<u256>();
            let mut j: u64 = 0;

            while (j < current_level.length()) {
                let left = *std::vector::borrow(&current_level, j);
                let right = if (j + 1 < current_level.length()) {
                    *std::vector::borrow(&current_level, j + 1)
                } else {
                    zero
                };

                let mut pair = std::vector::empty<u256>();
                pair.push_back(left);
                pair.push_back(right);
                let hash = poseidon::poseidon_bn254(&pair);
                
                next_level.push_back(hash);
                j = j + 2;
            };
            
            current_level = next_level;
        };

        *std::vector::borrow(&current_level, 0)
    }

    public fun enable_zk_verification(
        state: &mut UmbraState,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == state.admin, E_INVALID_PROOF); 
        state.zk_verification_enabled = true;
    }

    public fun disable_zk_verification(
        state: &mut UmbraState,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == state.admin, E_INVALID_PROOF);
        state.zk_verification_enabled = false;
    }

    public fun update_verification_keys(
        state: &mut UmbraState,
        deposit_pvk: vector<u8>,
        claim_pvk: vector<u8>,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == state.admin, E_INVALID_PROOF);
        state.deposit_pvk = deposit_pvk;
        state.claim_pvk = claim_pvk;
    }

    public fun transfer_admin(
        state: &mut UmbraState,
        new_admin: address,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == state.admin, E_INVALID_PROOF);
        state.admin = new_admin;
    }

    public fun update_buffer_size(
        state: &mut UmbraState,
        new_size: u64,
        ctx: &mut tx_context::TxContext
    ) {
        assert!(tx_context::sender(ctx) == state.admin, E_INVALID_PROOF);
        state.buffer_size = new_size;
    }

    public fun get_commitment_count(state: &UmbraState): u64 {
        state.commitment_count
    }

    public fun get_merkle_root(state: &UmbraState): u256 {
        state.current_merkle_root
    }

    public fun is_nullifier_spent(state: &UmbraState, nullifier_hash: u256): bool {
        table::contains(&state.nullifiers, nullifier_hash)
    }

    public fun get_total_deposited(state: &UmbraState): u64 {
        state.total_deposited
    }

    public fun get_pool_balance(state: &UmbraState): u64 {
        balance::value(&state.pool_balance)
    }

    public fun get_admin(state: &UmbraState): address {
        state.admin
    }

    public fun is_zk_verification_enabled(state: &UmbraState): bool {
        state.zk_verification_enabled
    }

    public fun is_valid_merkle_root(state: &UmbraState, root: u256): bool {
        root == state.current_merkle_root || table::contains(&state.root_buffer, root)
    }

    public fun get_root_buffer_size(state: &UmbraState): u64 {
        state.buffer_size
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut tx_context::TxContext) {
        init(ctx);
    }
}