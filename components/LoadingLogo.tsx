import React from 'react';

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
        <img
          src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiCL2GuXkm4vnkAnNz1yA4Kxlg-jjKIOdohivr_s_uCRQ5z1gYjlSJX139c7I-iR-2i3sCVQK3kmP3_ZRvvBezy_m5eB-sX9N3cn42lJbi5PveE90jfqPt4Luc52J6nU1MTIWZGkdBzT76fTVru6Wk8RafSOcgNzPumjNLay5fUxQ_YIihCHQ7Us1_-wVMV/s400/Eagleye-S.png"
          alt="EagleEye Logo"
          className="w-full h-full object-contain"
          style={{ mixBlendMode: 'screen' }}
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