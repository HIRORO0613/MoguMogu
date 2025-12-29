import React from 'react';

interface MascotProps {
  message?: string;
  mood?: 'happy' | 'neutral' | 'worried';
  onClick?: () => void;
  className?: string;
}

// Simple CSS Art Character "Mogu-chan" (Yellow Bear style)
export const Mascot: React.FC<MascotProps> = ({ message, mood = 'neutral', onClick, className = '' }) => {
  // Yellow base for AIRDO-like feel
  const color = mood === 'worried' ? 'bg-yellow-200' : 'bg-yellow-400';
  
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <div 
        className="relative group cursor-pointer transition-transform hover:scale-105 active:scale-95"
        onClick={onClick}
      >
        {/* Body */}
        <div className={`w-20 h-16 ${color} rounded-t-full rounded-b-3xl relative shadow-lg`}>
           {/* Eyes */}
           <div className="absolute top-6 left-5 w-2 h-2 bg-gray-800 rounded-full animate-pulse"></div>
           <div className="absolute top-6 right-5 w-2 h-2 bg-gray-800 rounded-full animate-pulse"></div>
           
           {/* Nose/Mouth Area */}
           <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-6 h-4 bg-white rounded-full opacity-80"></div>
           <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rounded-full"></div>

           {/* Cheeks */}
           <div className="absolute top-8 left-2 w-3 h-2 bg-red-300 rounded-full opacity-40"></div>
           <div className="absolute top-8 right-2 w-3 h-2 bg-red-300 rounded-full opacity-40"></div>
        </div>
        
        {/* Ears (Round bear ears) */}
        <div className={`absolute -top-2 left-1 w-6 h-6 ${color} rounded-full -z-10 border-2 border-transparent`}></div>
        <div className={`absolute -top-2 right-1 w-6 h-6 ${color} rounded-full -z-10 border-2 border-transparent`}></div>

        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800/10 w-16 h-2 rounded-[100%] blur-sm"></div>
      </div>

      {/* Speech Bubble */}
      {message && (
        <div className="relative bg-white p-3 rounded-2xl rounded-bl-none shadow-md border border-gray-100 max-w-[200px] animate-fade-in-up">
           <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
      )}
    </div>
  );
};

// SVG Icon Version for Chat Headers
export const MascotFaceIcon: React.FC<{size?: number, className?: string}> = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 80" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <circle cx="20" cy="20" r="15" className="fill-yellow-400" />
      <circle cx="80" cy="20" r="15" className="fill-yellow-400" />
      
      {/* Face */}
      <rect x="10" y="15" width="80" height="65" rx="30" className="fill-yellow-400" />
      
      {/* Snout area */}
      <ellipse cx="50" cy="50" rx="15" ry="12" fill="white" opacity="0.8" />

      {/* Eyes */}
      <circle cx="35" cy="40" r="4" fill="#1f2937" />
      <circle cx="65" cy="40" r="4" fill="#1f2937" />
      
      {/* Nose */}
      <circle cx="50" cy="48" r="4" fill="#1f2937" />
    </svg>
  );
};