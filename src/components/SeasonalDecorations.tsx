import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  opacity: number;
  size: number;
}

export function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const flakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 5 + Math.random() * 10,
      animationDelay: Math.random() * 5,
      opacity: 0.3 + Math.random() * 0.7,
      size: 4 + Math.random() * 8,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute text-white animate-snowfall"
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.animationDelay}s`,
            opacity: flake.opacity,
            fontSize: `${flake.size}px`,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
}

export function ChristmasLights() {
  return (
    <div className="absolute top-0 left-0 right-0 h-8 flex justify-around items-center pointer-events-none z-40">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full animate-twinkle"
          style={{
            backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff'][i % 5],
            animationDelay: `${i * 0.2}s`,
            boxShadow: `0 0 10px ${['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff'][i % 5]}`,
          }}
        />
      ))}
    </div>
  );
}

export function SantaHat({ className = "" }: { className?: string }) {
  return (
    <img 
      src="/images/santa-hat.png" 
      alt="Santa hat"
      className={`absolute -top-6 -right-2 w-12 h-12 transform rotate-12 drop-shadow-lg ${className}`}
    />
  );
}

export function WinterBanner() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-gradient-to-r from-red-600 via-green-600 to-red-600 rounded-full shadow-2xl animate-pulse">
      <p className="text-white font-bold text-sm flex items-center gap-2">
        🎄 Joyeuses Fêtes ! 🎅 Happy Holidays! ❄️
      </p>
    </div>
  );
}
