import React from 'react';
import Image from 'next/image';

interface LoadingLogoProps {
  message?: string;
  className?: string;
}

const LoadingLogo: React.FC<LoadingLogoProps> = ({ 
  message = 'Loading...', 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      {/* EagleEye Logo with blinking animation */}
      <div className="relative w-20 h-20 logo-blink">
        <Image
          src="/Eagleye-S.png"
          alt="EagleEye Logo"
          width={80}
          height={80}
          className="object-contain"
          priority
        />
      </div>
      
      {/* Loading message */}
      <div className="text-center">
        <p className="text-lg font-poppins font-medium text-slate-300 tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingLogo;