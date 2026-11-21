import React from 'react';
import logoImg from '../../assets/celerity-logo.png';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-10 h-10',
  imgClassName = 'w-full h-full object-contain',
  alt = 'Celerity Commerce Logo',
}) => {
  return (
    <div className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <img src={logoImg} alt={alt} className={imgClassName} />
    </div>
  );
};
