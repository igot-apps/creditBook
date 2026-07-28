import useStore from "../store/useStore";

export const Confetti = () => {
  const { showConfetti } = useStore();

  if (!showConfetti) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center overflow-hidden">
      {/* Simple CSS Confetti Effect */}
      <div className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ top: '20%', left: '20%', animationDuration: '1s' }}></div>
      <div className="absolute w-3 h-3 bg-green-500 rounded-full animate-ping" style={{ top: '30%', left: '70%', animationDuration: '1.2s', animationDelay: '0.1s' }}></div>
      <div className="absolute w-3 h-3 bg-blue-500 rounded-full animate-ping" style={{ top: '60%', left: '30%', animationDuration: '0.8s', animationDelay: '0.2s' }}></div>
      <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping" style={{ top: '70%', left: '80%', animationDuration: '1.1s', animationDelay: '0.3s' }}></div>
      <div className="absolute w-3 h-3 bg-purple-500 rounded-full animate-ping" style={{ top: '40%', left: '50%', animationDuration: '0.9s', animationDelay: '0.15s' }}></div>
    </div>
  );
};