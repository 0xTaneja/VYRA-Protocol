import { useState } from 'react';
import Navbar from './components/Navbar';
import TransferCard from './components/TransferCard';
import DepositModal from './components/DepositModal';
import TransactionHistory from './components/TransactionHistory';
import { ToastContainer, ToastProps } from './components/Toast';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useUmbra } from './lib/UmbraContext';

const App: React.FC = () => {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);
  
  const currentAccount = useCurrentAccount();
  const { balance } = useUmbra();

  const walletAddress = currentAccount?.address 
    ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}`
    : 'Not Connected';

  const addToast = (toast: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { ...toast, id, onClose: () => removeToast(id) }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans selection:bg-emerald-200 selection:text-emerald-900">
      
      {}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,_#064e3b_0%,_#022c22_40%,_#0f172a_80%)] overflow-hidden">
         {}
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-20"></div>
         
         {}
         <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none animate-pulse-glow"></div>
         
         {}
         <div className="absolute inset-0 overflow-hidden pointer-events-none">
            
            {}
            <div className="absolute top-[10%] left-[-10%] w-[600px] h-[200px] bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] blur-[40px] animate-drift-slow z-0 opacity-80"></div>
            
            {}
            <div className="absolute bottom-[20%] right-[-5%] w-[700px] h-[300px] bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.15)_0%,_transparent_70%)] blur-[50px] animate-drift-reverse-slow z-0"></div>
            
            {}
            <div className="absolute top-[30%] left-[-20%] w-[400px] h-[150px] bg-[radial-gradient(ellipse_at_center,_rgba(209,250,229,0.1)_0%,_transparent_60%)] blur-[30px] animate-drift-medium delay-20s z-0"></div>

            {}
            <div className="absolute top-[60%] right-[20%] w-[500px] h-[500px] bg-emerald-900/30 blur-[80px] rounded-full animate-pulse-glow z-0"></div>
            
         </div>
      </div>

      <Navbar 
        onDepositClick={() => setIsDepositOpen(!isDepositOpen)} 
        walletAddress={walletAddress}
        isConnected={!!currentAccount}
      />

      {}
      <ToastContainer toasts={toasts} />

      {}
      <div 
        className={`fixed top-24 right-6 z-40 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          isDepositOpen 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-20 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="w-[380px] shadow-2xl shadow-black/50 rounded-[2.5rem] backdrop-blur-xl">
           <DepositModal 
             isOpen={isDepositOpen}
             onClose={() => setIsDepositOpen(false)}
             onSuccess={(digest) => {
               addToast({
                 message: 'Deposit successful!',
                 type: 'success',
                 txDigest: digest,
               });
               setIsDepositOpen(false);
             }}
             onError={(error) => {
               addToast({
                 message: error,
                 type: 'error',
               });
             }}
           />
        </div>
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 pb-10 px-4">
        
        {}
        <div className="text-center mb-12">
           <div className="flex items-center justify-center gap-4 mb-3">
             <span className="text-white font-extrabold text-5xl md:text-7xl tracking-tight drop-shadow-2xl leading-tight">
               The stealth
             </span>
             <div className="w-14 h-14 md:w-20 md:h-20 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
               <img src="/vyra-logo.png" alt="VYRA" className="w-full h-full object-cover" />
             </div>
             <span className="text-white font-extrabold text-5xl md:text-7xl tracking-tight drop-shadow-2xl leading-tight">
               mode
             </span>
           </div>
           <h1 className="text-emerald-100/60 font-bold text-4xl md:text-6xl tracking-tight drop-shadow-lg">
             for your wealth.
           </h1>
        </div>

        {}
        <div className="relative z-20 shadow-2xl shadow-black/40 rounded-[2.5rem]">
           <TransferCard 
             onSuccess={(digest) => {
               addToast({
                 message: 'Transfer successful!',
                 type: 'success',
                 txDigest: digest,
               });
             }}
             onError={(error) => {
               addToast({
                 message: error,
                 type: 'error',
               });
             }}
           />
        </div>

      </main>

      {}
      <TransactionHistory />

    </div>
  );
};

export default App;