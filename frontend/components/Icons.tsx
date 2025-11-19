import React from 'react';
import { IconProps } from '../types';

export const LogoIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L2 19H22L12 2Z" fill="currentColor" />
    <path d="M12 6L4.5 19H19.5L12 6Z" fill="white" fillOpacity="0.2" />
  </svg>
);

export const ChevronDown: React.FC<IconProps> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export const ArrowLeft: React.FC<IconProps> = ({ className, onClick }) => (
  <svg onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} cursor-pointer hover:opacity-70 transition-opacity`}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className, onClick }) => (
  <svg onClick={onClick} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} cursor-pointer text-gray-400 hover:text-gray-600`}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export const SwapIcon: React.FC<IconProps> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

export const FlowerIcon: React.FC<IconProps> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" fill="#D1FAE5" />
    <path d="M12 6L13.5 10.5H18L14.5 13.5L16 18L12 15L8 18L9.5 13.5L6 10.5H10.5L12 6Z" fill="#10B981" />
  </svg>
);