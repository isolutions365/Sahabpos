import React from 'react';

interface SaudiRiyalIconProps {
  className?: string;
  size?: number;
}

export const SaudiRiyalIcon: React.FC<SaudiRiyalIconProps> = ({ className = 'w-5 h-5', size }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="bold"
        fill="currentColor"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        style={{ letterSpacing: '-0.3px' }}
      >
        ر.س
      </text>
    </svg>
  );
};
