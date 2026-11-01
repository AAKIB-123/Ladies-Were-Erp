import React from 'react';

interface AppBrandProps {
  compact?: boolean;
  className?: string;
}

export const AppBrand: React.FC<AppBrandProps> = ({ compact = false, className = '' }) => (
  <div className={`flex items-center ${className}`} aria-label="Fancy Collection">
    <img
      src="/fancy-collection-logo.png"
      alt="Fancy Collection Ladies Wear"
      className={`${compact ? 'h-14 w-14' : 'h-16 w-16'} shrink-0 object-contain`}
    />
  </div>
);

export default AppBrand;
