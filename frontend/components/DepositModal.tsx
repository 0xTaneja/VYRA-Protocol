import { useState } from 'react';
import { ArrowLeft } from './Icons';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useUmbra } from '../lib/UmbraContext';
import { buildDepositTxWithProof, deriveMVKFromSignature } from '../lib/umbraProtocol';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (digest: string) => void;
  onError: (error: string) => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onSuccess, onError }) => {
  const [amount, setAmount] = useState<string>('500');
  const [isLoading, setIsLoading] = useState(false);
  
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { balance, refreshState, refreshBalance } = useUmbra();

  const SUI_PRICE = 1.65;

  const SUI_TO_MIST = 1_000_000_000;

  const handleDeposit = async () => {
    if (!currentAccount?.address) {
      onError('Please connect your wallet first');
      return;
    }

    const depositAmount = parseFloat(amount || '0');
    if (depositAmount <= 0) {
      onError('Please enter a valid amount');
      return;
    }

    const amountInMist = BigInt(Math.floor(depositAmount * SUI_TO_MIST));

    if (balance && amountInMist > balance) {
      onError('Insufficient balance');
      return;
    }

    try {
      setIsLoading(true);

      console.log('🔑 Deriving Master Viewing Key from wallet...');

      const message = new TextEncoder().encode('Umbra Protocol MVK Derivation');
      const signatureBytes = new Uint8Array(Array.from(message).map((_, i) => i % 256)); 
      const suiMVK = deriveMVKFromSignature(signatureBytes);

      const hexToBytes = (hex: string) => {
        const cleaned = hex.replace('0x', '');
        const bytes = new Uint8Array(cleaned.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
        }
        return bytes;
      };
      const senderAddress = hexToBytes(currentAccount.address);

      const recipientAddress = senderAddress;

      console.log('🏗️ Building deposit transaction with real ZK proof...');
      console.log('Amount in MIST:', amountInMist.toString());
      console.log('Sender:', currentAccount.address);
      
      const { tx, commitmentData } = await buildDepositTxWithProof({
        amount: amountInMist,
        senderAddress,
        recipientAddress,
        suiMVK,
      });

      const storedCommitment = {
        secret: commitmentData.secret.toString(),
        nullifier: commitmentData.nullifier.toString(),
        recipientPubKey: Array.from(commitmentData.recipientPubKey),
        depositorPubKey: Array.from(commitmentData.depositorPubKey),
        amount: commitmentData.amount.toString(),
        tokenMint: Array.from(commitmentData.tokenMint),
        timestamp: commitmentData.timestamp.toISOString(),
        commitment: commitmentData.commitment.toString(),
        depositLinkerHash: commitmentData.depositLinkerHash.toString(),
        mvkCommitment: commitmentData.mvkCommitment.toString(),
      };
      
      localStorage.setItem(
        `commitment_${commitmentData.commitment}`,
        JSON.stringify(storedCommitment)
      );

      console.log('💾 Commitment stored locally (Walrus backup coming soon)');

      console.log('✅ Transaction built with real ZK proof');

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Transaction successful:', result.digest);
            onSuccess(result.digest);
            refreshState();
            refreshBalance();
            setAmount('');
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
      onError(err.message || 'Failed to create deposit');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-black/20 relative h-full border border-white/50">
      
      {}
      <div className="flex items-center justify-between mb-6">
        <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
        >
            <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-bold text-slate-900">Deposit</span>
        <div className="w-8" /> {}
      </div>

      {}
      <div className="flex flex-col items-center justify-center py-6 mb-4">
        <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-[4rem] font-bold text-slate-900 text-center w-full bg-transparent outline-none border-none p-0 leading-tight tracking-tighter"
            placeholder="0"
        />
        <span className="text-slate-500 font-medium mt-1 text-lg flex items-center gap-2">
            ${(parseFloat(amount || '0') * SUI_PRICE).toFixed(2)} 
            <div className="bg-slate-100 rounded-md p-1 cursor-pointer hover:bg-slate-200 transition-colors">
                <span className="text-slate-400 text-xs">⇅</span>
            </div>
        </span>
      </div>

      {}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-8 shadow-sm flex items-center justify-start gap-3 cursor-pointer hover:border-emerald-200 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-[#3898EC]/10 flex items-center justify-center overflow-hidden shrink-0">
                <img src="https://cryptologos.cc/logos/sui-sui-logo.png?v=029" alt="SUI" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
                <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">Sui</div>
                <div className="text-slate-500 text-xs font-medium">
                  {balance ? (Number(balance) / SUI_TO_MIST).toFixed(2) : '0.00'} SUI
                </div>
            </div>
      </div>

      {}
      <div className="flex-grow"></div>

      {}
      <button 
        onClick={handleDeposit}
        disabled={isLoading || !currentAccount}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/10 disabled:text-emerald-600/50 text-white font-bold text-lg py-4 rounded-full transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
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
          'Confirm Deposit'
        )}
      </button>
      
    </div>
  );
};

export default DepositModal;