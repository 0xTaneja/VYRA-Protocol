import { useState, useRef, useEffect } from 'react';
import { LogoIcon, FlowerIcon, ChevronDown } from './Icons';
import { useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets } from '@mysten/dapp-kit';

interface NavbarProps {
  onDepositClick: () => void;
  walletAddress: string;
  isConnected: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onDepositClick, walletAddress, isConnected }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const walletModalRef = useRef<HTMLDivElement>(null);
  
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (walletModalRef.current && !walletModalRef.current.contains(event.target as Node)) {
        setIsWalletModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDepositSelect = () => {
    setIsDropdownOpen(false);
    onDepositClick();
  };

  const handleCopyAddress = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      setIsDropdownOpen(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between font-sans">
      {}
      <div className="flex items-center gap-3 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
           <img src="/vyra-logo.png" alt="VYRA" className="w-full h-full object-cover" />
        </div>
        <span className="text-white text-xl font-bold tracking-tight">VYRA</span>
      </div>

      {}
      <div className="flex items-center gap-4">
        <button className="hidden md:block px-6 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 text-emerald-50 rounded-full text-sm font-semibold hover:bg-white/10 transition-all shadow-sm">
          Get the app
        </button>
        
        {!isConnected ? (
          <div className="relative">
            <button
              onClick={() => setIsWalletModalOpen(!isWalletModalOpen)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white font-bold text-sm transition-all shadow-lg shadow-emerald-500/30"
            >
              Connect Wallet
            </button>
            
            {}
            <div
              ref={walletModalRef}
              className={`absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl shadow-black/50 border border-white/10 overflow-hidden transition-all duration-200 origin-top-right z-50 ${
                isWalletModalOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Connect Wallet</h3>
                <div className="space-y-2">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => {
                        connect(
                          { wallet },
                          {
                            onSuccess: () => {
                              console.log('Wallet connected successfully!');
                              setIsWalletModalOpen(false);
                            },
                            onError: (error) => {
                              console.error('Failed to connect wallet:', error);
                            },
                          }
                        );
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                    >
                      {wallet.icon && (
                        <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-lg" />
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{wallet.name}</div>
                        <div className="text-xs text-slate-500">Click to connect</div>
                      </div>
                    </button>
                  ))}
                  {wallets.length === 0 && (
                    <div className="text-center py-4 text-slate-500">
                      <p className="text-sm mb-2">No wallets detected</p>
                      <a
                        href="https://chrome.google.com/webstore/detail/sui-wallet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold underline"
                      >
                        Install Sui Wallet →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-3 px-2 py-2 pr-4 bg-slate-900/80 backdrop-blur-md rounded-full hover:bg-slate-800 transition-all cursor-pointer shadow-lg shadow-black/20 border border-white/10 ${isDropdownOpen ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-900 to-slate-800 flex items-center justify-center border border-white/10 shadow-inner">
                 <FlowerIcon className="w-8 h-8" />
              </div>
              <span className="text-emerald-50 font-semibold text-sm tracking-tight">{walletAddress}</span>
              <ChevronDown className={`w-4 h-4 text-emerald-200/50 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {}
            <div 
                className={`absolute right-0 mt-3 w-60 bg-slate-900 rounded-2xl shadow-xl shadow-black/50 border border-white/10 overflow-hidden transition-all duration-200 origin-top-right z-50 ${
                    isDropdownOpen 
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
            >
                <div className="p-2 flex flex-col gap-1">
                    <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Wallet Actions</div>
                    
                    <button 
                        onClick={handleDepositSelect}
                        className="w-full text-left px-3 py-3 rounded-xl hover:bg-emerald-500/10 flex items-center gap-3 group transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm">Deposit</div>
                            <div className="text-slate-400 text-xs">Add funds to Apex</div>
                        </div>
                    </button>

                    <button 
                        onClick={handleCopyAddress}
                        className="w-full text-left px-3 py-3 rounded-xl hover:bg-slate-800 flex items-center gap-3 group transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </div>
                        <div className="text-slate-300 font-semibold text-sm">Copy Address</div>
                    </button>
                    
                    <div className="h-px bg-white/5 my-1 mx-2"></div>
                    
                    <button 
                        onClick={handleDisconnect}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 text-sm font-semibold flex items-center gap-3 transition-colors"
                    >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Disconnect
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;