import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useUmbra } from '../lib/UmbraContext';
import { deriveMVKFromSignature, type CommitmentData } from '../lib/umbraProtocol';
import { SparseMerkleTree } from '../lib/sparseMerkleTree';
import { umbraClient } from '../lib/umbra';
import { poseidonHash } from '../lib/crypto/poseidon';

interface TransferCardProps {
  onSuccess: (digest: string) => void;
  onError: (error: string) => void;
}

const TransferCard: React.FC<TransferCardProps> = ({ onSuccess, onError }) => {
  const [amount, setAmount] = useState<string>('100');
  const [recipient, setRecipient] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { balance, state, refreshState, refreshBalance } = useUmbra();

  const SUI_PRICE = 1.65;
  const SUI_TO_MIST = 1_000_000_000;

  const handleClaim = async () => {
    if (!currentAccount?.address) {
      onError('Please connect your wallet first');
      return;
    }

    if (!recipient || recipient.trim() === '') {
      onError('Please enter a recipient address');
      return;
    }

    const claimAmount = parseFloat(amount || '0');
    if (claimAmount <= 0) {
      onError('Please enter a valid amount');
      return;
    }

    const amountInMist = BigInt(Math.floor(claimAmount * SUI_TO_MIST));

    try {
      setIsLoading(true);

      console.log('🔍 Loading commitment data...');

      const storedCommitments: CommitmentData[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('commitment_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key)!);
            storedCommitments.push({
              secret: BigInt(data.secret),
              nullifier: BigInt(data.nullifier),
              recipientPubKey: new Uint8Array(data.recipientPubKey),
              depositorPubKey: new Uint8Array(data.depositorPubKey),
              amount: BigInt(data.amount),
              tokenMint: new Uint8Array(data.tokenMint),
              timestamp: new Date(data.timestamp),
              commitment: BigInt(data.commitment),
              depositLinkerHash: 0n, 
              mvkCommitment: 0n, 
            });
          } catch (e) {
            console.warn(`Failed to parse commitment ${key}:`, e);
          }
        }
      }

      if (storedCommitments.length === 0) {
        onError('No commitments found. Please make a deposit first.');
        setIsLoading(false);
        return;
      }

      console.log(`Found ${storedCommitments.length} stored commitment(s)`);

      const commitment = storedCommitments.find((c) => c.amount >= amountInMist);
      if (!commitment) {
        onError(`No commitment found with enough balance (need ${amountInMist} MIST)`);
        setIsLoading(false);
        return;
      }

      console.log('Using commitment:', commitment.commitment.toString());

      console.log('🌲 Fetching all commitments from blockchain...');
      const allCommitments = await umbraClient.getAllCommitments();
      console.log('Fetched', allCommitments.length, 'commitments from chain');

      console.log('🌲 Building sparse Merkle tree (20 levels)...');
      const tree = new SparseMerkleTree(20, 0n);
      
      let leafIndex = -1;
      for (const c of allCommitments) {
        tree.insert(c.index, c.commitment);
        if (c.commitment.toString() === commitment.commitment.toString()) {
          leafIndex = c.index;
        }
      }
      
      if (leafIndex === -1) {
        throw new Error('Commitment not found on-chain! Please make a deposit first.');
      }

      const { siblings, pathIndices } = tree.getProof(leafIndex);
      const localRoot = tree.getRoot();

      console.log('Merkle tree root:', localRoot.toString());
      console.log('On-chain root:', state?.merkleRoot?.toString() || 'unknown');

      const merkleRoot = state?.merkleRoot || localRoot;

      console.log('🏗️ Building claim transaction (ZK verification disabled)...');
      console.log('Recipient:', recipient);
      console.log('Amount in MIST:', amountInMist.toString());

      const recipientAddr = recipient.startsWith('0x') ? recipient : `0x${recipient}`;

      const nullifierHash = poseidonHash([commitment.nullifier]);
      const claimLinkerHash = poseidonHash([BigInt(leafIndex)]);

      const tx = await umbraClient.buildClaimTx({
        recipient: recipientAddr,
        amount: amountInMist,
        nullifierHash,
        claimLinkerHash,
        merkleRoot,
        proof: {
          a: [0n, 0n],
          b: [0n, 0n, 0n, 0n],
          c: [0n, 0n],
          publicInputs: [merkleRoot, nullifierHash, claimLinkerHash],
        },
      }, currentAccount.address);

      console.log('✅ Transaction built (dummy proof)');

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Transaction successful:', result.digest);
            onSuccess(result.digest);
            refreshState();
            refreshBalance();
            setAmount('');
            setRecipient('');
            setIsLoading(false);
          },
          onError: (err) => {
            console.error('Transaction error:', err);
            onError(err.message || 'Transaction failed');
            setIsLoading(false);
          },
        }
      );
    } catch (err: any) {
      console.error('Build transaction error:', err);
      onError(err.message || 'Failed to create claim');
      setIsLoading(false);
    }
  }; 

  return (
    <div className="bg-white w-[400px] rounded-[2.5rem] p-6 shadow-2xl shadow-black/20 transform transition-all relative border border-white/50">
      
      {}
      <div className="relative mb-6 group">
        <div className="flex items-center bg-slate-50 rounded-2xl px-4 py-3 transition-colors focus-within:bg-slate-100 ring-1 ring-slate-100 focus-within:ring-emerald-500/20">
            <span className="text-slate-400 text-sm font-medium mr-3 shrink-0 select-none">To</span>
            <input 
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="apex.sui"
                className="bg-transparent border-none outline-none text-slate-900 font-medium w-full placeholder-slate-300"
            />
            {recipient && (
                <button onClick={() => setRecipient('')} className="text-slate-400 hover:text-slate-600">
                    <span className="text-xl">&times;</span>
                </button>
            )}
        </div>
      </div>

      {}
      <div className="flex flex-col items-center justify-center py-4 mb-4">
        <div className="relative w-full flex justify-center">
             <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-[5.5rem] font-bold text-slate-900 text-center w-full bg-transparent outline-none border-none p-0 leading-[1.1] tracking-tight"
                placeholder="0"
            />
        </div>
        <span className="text-slate-500 font-medium text-lg flex items-center gap-2">
            ${(parseFloat(amount || '0') * SUI_PRICE).toFixed(2)} 
            <div className="bg-slate-100 rounded-md p-1 cursor-pointer hover:bg-slate-200 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                    <path d="M7 10v12"></path>
                    <path d="M17 14v-12"></path>
                    <path d="M3 14l4 -4l4 4"></path>
                    <path d="M21 10l-4 4l-4 -4"></path>
                </svg>
            </div>
        </span>
      </div>

      {}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 mb-8 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors group">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#3898EC]/10 flex items-center justify-center overflow-hidden">
                <img src="https://cryptologos.cc/logos/sui-sui-logo.png?v=029" alt="SUI" className="w-6 h-6 object-contain" />
             </div>
             <div>
                 <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">Sui</div>
                 <div className="text-slate-500 text-xs font-medium">
                   {balance ? (Number(balance) / SUI_TO_MIST).toFixed(2) : '0.00'} SUI
                 </div>
             </div>
         </div>
         
         <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
             <button 
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 if (balance) {
                   const halfAmount = (Number(balance) / SUI_TO_MIST / 2).toFixed(2);
                   setAmount(halfAmount);
                 }
               }}
               disabled={!balance}
               className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 Use Half
             </button>
             <button 
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 if (balance) {
                   const maxAmount = (Number(balance) / SUI_TO_MIST).toFixed(2);
                   setAmount(maxAmount);
                 }
               }}
               disabled={!balance}
               className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 Use Max
             </button>
         </div>
      </div>

      {}
      <button 
        onClick={handleClaim}
        disabled={isLoading || !currentAccount}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/10 disabled:text-emerald-600/50 text-white font-bold text-lg py-4 rounded-full transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : !currentAccount ? (
          'Connect Wallet First'
        ) : (
          'Confirm Transfer'
        )}
      </button>

    </div>
  );
};

export default TransferCard;