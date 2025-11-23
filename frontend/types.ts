export interface IconProps {
  className?: string;
  onClick?: () => void;
}

export interface TokenData {
  symbol: string;
  balance: number;
  price: number;
  icon: string; 
}
