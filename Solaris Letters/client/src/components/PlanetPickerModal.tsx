export function PlanetIcon({ name, className = "w-14 h-14" }: { name: string; className?: string }) {
  switch (name) {
    case 'Mercury':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="mercury-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ECEBEB" />
              <stop offset="45%" stopColor="#A6A4A4" />
              <stop offset="85%" stopColor="#4A4949" />
              <stop offset="100%" stopColor="#1C1B1B" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#mercury-grad)" />
          <circle cx="35" cy="32" r="6" fill="#6E6D6D" opacity="0.3" />
          <circle cx="35" cy="32" r="6" stroke="#ECEBEB" strokeWidth="0.5" opacity="0.4" />
          <circle cx="65" cy="45" r="4" fill="#6E6D6D" opacity="0.3" />
          <circle cx="65" cy="45" r="4" stroke="#ECEBEB" strokeWidth="0.5" opacity="0.4" />
          <circle cx="48" cy="68" r="8" fill="#6E6D6D" opacity="0.25" />
          <circle cx="48" cy="68" r="8" stroke="#ECEBEB" strokeWidth="0.5" opacity="0.4" />
          <circle cx="25" cy="55" r="3" fill="#6E6D6D" opacity="0.3" />
          <circle cx="72" cy="28" r="5" fill="#5A5959" opacity="0.3" />
          <circle cx="55" cy="22" r="3.5" fill="#5A5959" opacity="0.3" />
          <circle cx="50" cy="50" r="45" fill="black" opacity="0.15" style={{ mixBlendMode: 'multiply' }} />
        </svg>
      );

    case 'Venus':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="venus-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFE0B2" />
              <stop offset="35%" stopColor="#FFB74D" />
              <stop offset="70%" stopColor="#F57C00" />
              <stop offset="95%" stopColor="#BF360C" />
              <stop offset="100%" stopColor="#3E1103" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#venus-grad)" />
          <path d="M12 40 C 25 32, 75 32, 88 40 C 75 48, 25 48, 12 40 Z" fill="#FFE0B2" opacity="0.15" />
          <path d="M8 52 C 22 45, 78 45, 92 52 C 78 59, 22 59, 8 52 Z" fill="#FFE0B2" opacity="0.1" />
          <path d="M18 28 C 30 22, 70 22, 82 28 C 70 34, 30 34, 18 28 Z" fill="#E65100" opacity="0.25" />
          <path d="M15 65 C 28 58, 72 58, 85 65 C 72 72, 28 72, 15 65 Z" fill="#BF360C" opacity="0.3" />
          <circle cx="50" cy="50" r="45" stroke="#FFE0B2" strokeWidth="1" opacity="0.3" />
        </svg>
      );

    case 'Earth':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="earth-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#64B5F6" />
              <stop offset="40%" stopColor="#1E88E5" />
              <stop offset="75%" stopColor="#1565C0" />
              <stop offset="95%" stopColor="#0D47A1" />
              <stop offset="100%" stopColor="#051B3D" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#earth-grad)" />
          <path d="M 25 35 Q 35 25 45 35 T 55 45 T 45 65 T 30 55 Z" fill="#81C784" opacity="0.75" />
          <path d="M 60 30 Q 75 25 80 40 T 70 60 T 55 50 Z" fill="#66BB6A" opacity="0.75" />
          <path d="M 38 68 Q 45 75 52 82 T 48 88 T 35 80 Z" fill="#A5D6A7" opacity="0.6" />
          <path d="M 25 65 C 45 55, 60 75, 80 60 C 65 78, 35 78, 25 65 Z" fill="#FFFFFF" opacity="0.4" />
          <path d="M 18 32 C 30 20, 65 50, 82 35 C 70 25, 30 15, 18 32 Z" fill="#FFFFFF" opacity="0.45" />
          <circle cx="50" cy="50" r="45" stroke="#90CAF9" strokeWidth="1.5" opacity="0.5" />
        </svg>
      );

    case 'Mars':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="mars-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FF8A65" />
              <stop offset="35%" stopColor="#FF5722" />
              <stop offset="75%" stopColor="#D84315" />
              <stop offset="95%" stopColor="#BF360C" />
              <stop offset="100%" stopColor="#3E1103" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#mars-grad)" />
          <ellipse cx="50" cy="8" rx="8" ry="3" fill="#E0F7FA" opacity="0.9" />
          <ellipse cx="50" cy="8" rx="10" ry="4" stroke="#80DEEA" strokeWidth="0.5" opacity="0.5" />
          <path d="M 20 45 Q 35 55 50 42 T 80 48" stroke="#4E1504" strokeWidth="5" fill="none" opacity="0.25" strokeLinecap="round" />
          <path d="M 15 30 Q 30 25 45 35 T 75 28" stroke="#4E1504" strokeWidth="4" fill="none" opacity="0.2" strokeLinecap="round" />
          <path d="M 30 65 Q 50 60 70 70" stroke="#3E1103" strokeWidth="6" fill="none" opacity="0.3" strokeLinecap="round" />
          <circle cx="50" cy="50" r="45" stroke="#FFAB91" strokeWidth="1" opacity="0.3" />
        </svg>
      );

    case 'Jupiter':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="jupiter-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFE0B2" />
              <stop offset="30%" stopColor="#D7CCC8" />
              <stop offset="55%" stopColor="#BCAAA4" />
              <stop offset="75%" stopColor="#8D6E63" />
              <stop offset="95%" stopColor="#4E342E" />
              <stop offset="100%" stopColor="#2D1510" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#jupiter-grad)" />
          <path d="M6 35 H94" stroke="#8D6E63" strokeWidth="4" opacity="0.4" />
          <path d="M10 25 H90" stroke="#FFE0B2" strokeWidth="3" opacity="0.25" strokeDasharray="5 2 8 3" />
          <path d="M6 45 H94" stroke="#BCAAA4" strokeWidth="3" opacity="0.3" strokeDasharray="10 5" />
          <path d="M5 52 H95" stroke="#A1887F" strokeWidth="5" opacity="0.5" />
          <path d="M5 60 H95" stroke="#FFB74D" strokeWidth="3" opacity="0.35" strokeDasharray="12 4 6 2" />
          <path d="M8 70 H92" stroke="#5D4037" strokeWidth="4" opacity="0.4" />
          <ellipse cx="68" cy="62" rx="7" ry="4" fill="#D84315" />
          <ellipse cx="68" cy="62" rx="9" ry="5" stroke="#FF8A65" strokeWidth="0.75" fill="none" />
          <circle cx="50" cy="50" r="45" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );

    case 'Saturn':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="saturn-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFF9C4" />
              <stop offset="35%" stopColor="#F0E68C" />
              <stop offset="65%" stopColor="#D2B48C" />
              <stop offset="90%" stopColor="#8B7355" />
              <stop offset="100%" stopColor="#3E3023" />
            </radialGradient>
          </defs>
          <g opacity="0.85">
            <ellipse cx="50" cy="50" rx="42" ry="12" fill="none" stroke="#8B7355" strokeWidth="2.5" transform="rotate(-15 50 50)" />
            <ellipse cx="50" cy="50" rx="38" ry="10" fill="none" stroke="#D2B48C" strokeWidth="1" transform="rotate(-15 50 50)" />
            <ellipse cx="50" cy="50" rx="35" ry="9" fill="none" stroke="#FFE082" strokeWidth="2" transform="rotate(-15 50 50)" />
          </g>
          <circle cx="50" cy="50" r="28" fill="url(#saturn-grad)" />
          <path d="M23 45 H77" stroke="#8B7355" strokeWidth="2" opacity="0.3" />
          <path d="M22 52 H78" stroke="#FFF9C4" strokeWidth="1.5" opacity="0.2" />
          <g opacity="0.85">
            <path d="M 12 60 A 42 12 0 0 0 88 40" fill="none" stroke="#8B7355" strokeWidth="2.5" transform="rotate(-15 50 50)" />
            <path d="M 16 58 A 38 10 0 0 0 84 42" fill="none" stroke="#D2B48C" strokeWidth="1.0" transform="rotate(-15 50 50)" />
            <path d="M 19 56 A 35 9 0 0 0 81 44" fill="none" stroke="#FFE082" strokeWidth="2.0" transform="rotate(-15 50 50)" />
          </g>
        </svg>
      );

    case 'Uranus':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="uranus-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#E0F7FA" />
              <stop offset="45%" stopColor="#B2EBF2" />
              <stop offset="80%" stopColor="#4DD0E1" />
              <stop offset="98%" stopColor="#006064" />
              <stop offset="100%" stopColor="#002d30" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="50" rx="8" ry="46" fill="none" stroke="rgba(224, 247, 250, 0.25)" strokeWidth="0.5" transform="rotate(20 50 50)" />
          <circle cx="50" cy="50" r="38" fill="url(#uranus-grad)" />
          <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <path d="M15 42 Q 35 38 85 42" stroke="#E0F7FA" strokeWidth="1" opacity="0.15" />
          <path d="M18 55 Q 50 52 82 55" stroke="#00838F" strokeWidth="1.5" opacity="0.2" />
          <path d="M 45 6 A 8 46 0 0 0 55 94" fill="none" stroke="rgba(224, 247, 250, 0.4)" strokeWidth="0.5" transform="rotate(20 50 50)" />
          <circle cx="50" cy="50" r="38" stroke="#80DEEA" strokeWidth="1" opacity="0.4" />
        </svg>
      );

    case 'Neptune':
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="neptune-grad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#90CAF9" />
              <stop offset="35%" stopColor="#42A5F5" />
              <stop offset="65%" stopColor="#1E88E5" />
              <stop offset="90%" stopColor="#0D47A1" />
              <stop offset="100%" stopColor="#051D4D" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="url(#neptune-grad)" />
          <ellipse cx="62" cy="48" rx="6" ry="4" fill="#0D47A1" opacity="0.6" />
          <path d="M10 40 Q 30 35 90 40" stroke="#BBDEFB" strokeWidth="1" opacity="0.25" />
          <path d="M8 52 Q 50 48 92 52" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.3" strokeDasharray="6 3 2 1" />
          <path d="M12 62 Q 40 58 88 62" stroke="#1565C0" strokeWidth="2" opacity="0.4" />
          <circle cx="50" cy="50" r="42" stroke="#64B5F6" strokeWidth="1.5" opacity="0.45" />
        </svg>
      );

    default:
      return (
        <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="gray" />
        </svg>
      );
  }
}

const PLANETS = [
  'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'
];

interface PlanetPickerModalProps {
  onClose: () => void;
  onSelect: (planetName: string) => void;
  title?: string;
  assignedPlanets?: Record<string, string>; // planetName -> friend name
}

export function PlanetPickerModal({ onClose, onSelect, title = "Select a Planet", assignedPlanets = {} }: PlanetPickerModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="cosmic-card p-6 w-full max-w-2xl backdrop-blur-2xl shadow-2xl relative">
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,160,80,0.5), transparent)', position: 'absolute', top: 0, left: 0, right: 0 }} />

        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold font-orbitron text-[var(--accent-gold)] tracking-widest uppercase">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="text-[var(--text-dim)] hover:text-white transition-colors cursor-pointer border border-white/10 w-8 h-8 rounded-sm flex items-center justify-center"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PLANETS.map((planet) => {
            const occupant = assignedPlanets[planet];
            return (
              <button
                key={planet}
                onClick={() => !occupant && onSelect(planet)}
                className={`flex flex-col items-center justify-center p-4 rounded-sm border transition-all duration-300 relative overflow-hidden group
                  ${occupant 
                    ? 'bg-black/40 border-red-500/25 cursor-not-allowed opacity-50' 
                    : 'bg-[var(--input-bg)] border-[var(--input-border)] hover:bg-black/60 hover:border-[var(--accent-gold)] hover:shadow-[0_0_20px_rgba(200,160,80,0.15)] cursor-pointer'}
                `}
              >
                <div className="mb-3 group-hover:scale-105 transition-transform duration-300 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                  <PlanetIcon name={planet} className="w-14 h-14" />
                </div>
                <span className="font-semibold text-sm font-orbitron tracking-widest text-[var(--text-primary)] uppercase">{planet}</span>
                {occupant && (
                  <span className="text-[9px] font-orbitron tracking-wider text-red-400 mt-1 block truncate w-full px-1 text-center bg-red-950/20 py-0.5 rounded-sm border border-red-500/10">
                    {occupant}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
