export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-adam-700 to-adam-500 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M12 3L4 20h3.5L12 10l4.5 10H20L12 3z"
            fill="white"
            fillOpacity="0.95"
          />
          <path
            d="M9.5 14.5L12 19l2.5-4.5"
            stroke="#e36414"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-xl font-extrabold tracking-tight text-adam-700">
        Adam<span className="text-adam-accent">Careers</span>
      </span>
    </div>
  );
}
