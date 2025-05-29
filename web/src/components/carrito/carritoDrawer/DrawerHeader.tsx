import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  handleClose: () => void;
}

const DrawerHeader: React.FC<Props> = ({ handleClose }) => (
  <div className="flex items-center justify-between px-4 py-4 sm:px-7 sm:py-5 border-b border-[#ECD8AB] bg-white/85 rounded-t-none sm:rounded-tl-[2rem]">
    <span className="font-black text-xl sm:text-2xl text-[#CC9F53] tracking-tight">Tu carrito</span>
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClose}
      className="text-[#CC9F53] hover:bg-[#FFF3C0]/60"
      aria-label="Cerrar carrito"
    >
      <X className="w-7 h-7" />
    </Button>
  </div>
);

export default DrawerHeader;
