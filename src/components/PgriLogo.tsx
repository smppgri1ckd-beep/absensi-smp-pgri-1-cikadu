import React from 'react';

interface PgriLogoProps {
  className?: string;
  customUrl?: string;
}

export const PgriLogo: React.FC<PgriLogoProps> = ({ className = 'w-10 h-10', customUrl }) => {
  const [imgError, setImgError] = React.useState(false);

  // If user provided an uploaded custom school logo and it hasn't errored
  if (customUrl && !customUrl.includes('flaticon') && !customUrl.includes('placehold') && !imgError) {
    return (
      <div className={`rounded-full bg-white p-0.5 border border-slate-300 shadow-xs flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
        <img
          src={customUrl}
          alt="Logo Sekolah"
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Crisp, authentic PGRI circular emblem vector matching the target image
  return (
    <div className={`rounded-full bg-white p-0.5 border-[1.5px] border-[#003366] shadow-xs flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circle Background */}
        <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#003366" strokeWidth="4" />
        
        {/* Inner Circle Border */}
        <circle cx="100" cy="100" r="88" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />

        {/* Rice / Paddy & Cotton Wreath (Green/Gold leaves) */}
        {/* Left Laurel / Rice */}
        <path
          d="M48,135 C38,100 48,65 75,45 C70,60 68,85 78,110 C82,120 75,130 65,135 Z"
          fill="#15803d"
          opacity="0.85"
        />
        {/* Right Laurel / Rice */}
        <path
          d="M152,135 C162,100 152,65 125,45 C130,60 132,85 122,110 C118,120 125,130 135,135 Z"
          fill="#15803d"
          opacity="0.85"
        />

        {/* Golden Torch Handle */}
        <path
          d="M93,80 L107,80 L104,135 L96,135 Z"
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="2"
        />
        <rect x="90" y="75" width="20" height="7" rx="2" fill="#d97706" />

        {/* Torch Flame (Red & Gold) */}
        <path
          d="M100,22 C112,42 122,55 110,75 C100,75 92,68 90,62 C88,72 82,75 78,75 C70,62 82,45 100,22 Z"
          fill="#dc2626"
        />
        <path
          d="M100,32 C106,46 112,56 105,68 C98,68 94,62 93,58 C91,65 87,68 85,68 C80,58 88,46 100,32 Z"
          fill="#fbbf24"
        />

        {/* Open Book (White Pages, Green/Blue Cover) */}
        {/* Left Page */}
        <path
          d="M100,120 C82,110 65,112 52,118 L52,142 C68,136 84,136 100,146 Z"
          fill="#ffffff"
          stroke="#1e3a8a"
          strokeWidth="2.5"
        />
        {/* Right Page */}
        <path
          d="M100,120 C118,110 135,112 148,118 L148,142 C132,136 116,136 100,146 Z"
          fill="#ffffff"
          stroke="#1e3a8a"
          strokeWidth="2.5"
        />
        {/* Book Spine Center line */}
        <line x1="100" y1="120" x2="100" y2="146" stroke="#1e3a8a" strokeWidth="3" />

        {/* Banner Box for PGRI */}
        <rect x="74" y="126" width="52" height="15" rx="3" fill="#dc2626" />
        <text
          x="100"
          y="138"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="11"
          fontWeight="900"
          fontFamily="sans-serif"
          letterSpacing="1"
        >
          PGRI
        </text>

        {/* Bottom Curved Ribbon / Text "SMP PGRI 1 CIKADU" */}
        <path
          id="textPathArc"
          d="M 38 152 A 75 75 0 0 0 162 152"
          fill="none"
          stroke="none"
        />
        <text fill="#003366" fontSize="10.5" fontWeight="900" letterSpacing="0.5">
          <textPath href="#textPathArc" startOffset="50%" textAnchor="middle">
            SMP PGRI 1 CIKADU
          </textPath>
        </text>
      </svg>
    </div>
  );
};
