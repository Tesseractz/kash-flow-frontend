/**
 * Kash-Flow Logo Component
 * A modern logo featuring a stylized "K" with flowing cash/currency wave
 */

export function Logo({ size = 40, showText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        
        {/* Main circle background */}
        <circle cx="32" cy="32" r="30" fill="url(#logoGradient)" />
        
        {/* Stylized K */}
        <path
          d="M22 16V48M22 32L38 16M22 32L38 48"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Flowing coins/currency wave */}
        <g>
          {/* Coin 1 */}
          <circle cx="44" cy="20" r="6" fill="url(#coinGradient)" />
          <text x="44" y="23" textAnchor="middle" fill="#92400e" fontSize="8" fontWeight="bold">$</text>
          
          {/* Coin 2 */}
          <circle cx="50" cy="32" r="5" fill="url(#coinGradient)" opacity="0.9" />
          <text x="50" y="35" textAnchor="middle" fill="#92400e" fontSize="7" fontWeight="bold">$</text>
          
          {/* Coin 3 */}
          <circle cx="46" cy="44" r="4" fill="url(#coinGradient)" opacity="0.8" />
          <text x="46" y="46.5" textAnchor="middle" fill="#92400e" fontSize="6" fontWeight="bold">$</text>
        </g>
        
        {/* Flow lines */}
        <path
          d="M40 18 Q48 24 46 32 Q44 40 42 46"
          stroke="url(#flowGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
      </svg>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-emerald-600 dark:text-emerald-400">Kash</span>
            <span className="text-amber-500 dark:text-amber-400">-Flow</span>
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 tracking-widest uppercase">
            Point of Sale
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="coinGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      
      <circle cx="32" cy="32" r="30" fill="url(#logoGradientIcon)" />
      
      <path
        d="M22 16V48M22 32L38 16M22 32L38 48"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      <circle cx="44" cy="20" r="6" fill="url(#coinGradientIcon)" />
      <text x="44" y="23" textAnchor="middle" fill="#92400e" fontSize="8" fontWeight="bold">$</text>
      
      <circle cx="50" cy="32" r="5" fill="url(#coinGradientIcon)" opacity="0.9" />
      <circle cx="46" cy="44" r="4" fill="url(#coinGradientIcon)" opacity="0.8" />
    </svg>
  );
}

export function LogoMinimal({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradientMin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      
      <circle cx="32" cy="32" r="30" fill="url(#logoGradientMin)" />
      
      <path
        d="M24 18V46M24 32L40 18M24 32L40 46"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Logo;

