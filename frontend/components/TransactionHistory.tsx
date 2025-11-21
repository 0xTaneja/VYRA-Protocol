

import { useState, useEffect } from 'react';
import { umbraClient } from '../lib/umbra';

interface Transaction {
  type: 'deposit' | 'claim';
  digest: string;
  timestamp: number;
  amount?: string;
  commitment?: string;
  nullifierHash?: string;
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);

      const [deposits, claims] = await Promise.all([
        umbraClient.getUmbraEvents('DepositEvent', 10),
        umbraClient.getUmbraEvents('ClaimEvent', 10),
      ]);

      const txs: Transaction[] = [
        ...deposits.map((event: any) => ({
          type: 'deposit' as const,
          digest: event.id.txDigest,
          timestamp: Number(event.timestampMs),
          commitment: event.parsedJson?.commitment || 'N/A',
        })),
        ...claims.map((event: any) => ({
          type: 'claim' as const,
          digest: event.id.txDigest,
          timestamp: Number(event.timestampMs),
          nullifierHash: event.parsedJson?.nullifier_hash || 'N/A',
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setTransactions(txs);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center gap-2"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        {!isOpen && <span className="text-sm font-bold">History</span>}
      </button>

      <div
        className={`fixed bottom-24 right-6 z-40 w-[400px] max-h-[500px] bg-white rounded-3xl shadow-2xl shadow-black/20 border border-white/50 transition-all duration-300 ${
          isOpen
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-10 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
            <button
              onClick={loadTransactions}
              disabled={isLoading}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {}
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <div
                  key={i}
                  className="bg-slate-50 rounded-2xl p-4 hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {tx.type === 'deposit' ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm capitalize">{tx.type}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`https://suiscan.xyz/testnet/tx/${tx.digest}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View →
                    </a>
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {tx.digest.slice(0, 20)}...{tx.digest.slice(-20)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionHistory;

