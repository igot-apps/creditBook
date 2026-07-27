import { Menu } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const HamburgerButton = () => {
  const { setIsMenuOpen } = useApp();

  return (
    <button 
      onClick={() => setIsMenuOpen(true)}
      className="p-2 bg-white/20 rounded-full hover:bg-white/30 active:scale-95 transition"
      aria-label="Open menu"
    >
      <Menu size={22} />
    </button>
  );
};