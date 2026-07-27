import { useApp } from "../contexts/AppContext";

export const Confetti = () => {
  const { showConfetti } = useApp();
  if (!showConfetti) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div key={i} className="absolute animate-bounce" style={{
          left: `${Math.random() * 100}%`, top: `-10%`,
          animation: `fall ${2 + Math.random() * 3}s linear forwards`,
          color: ["#006B3F", "#FCD116", "#CE1126"][Math.floor(Math.random() * 3)],
          fontSize: `${16 + Math.random() * 20}px`
        }}>🎉</div>
      ))}
      <style>{`@keyframes fall { 100% { transform: translateY(110vh) rotate(720deg); } }`}</style>
    </div>
  );
};