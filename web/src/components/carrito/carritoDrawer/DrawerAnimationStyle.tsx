const DrawerAnimationStyle = () => (
  <style jsx global>{`
    @keyframes slide-in-right {
      0% { transform: translateX(100%);}
      100% { transform: translateX(0);}
    }
    @keyframes slide-out-right {
      0% { transform: translateX(0);}
      100% { transform: translateX(100%);}
    }
    .animate-slide-in-right { animation: slide-in-right 0.32s cubic-bezier(.32,1.28,.52,1.06);}
    .animate-slide-out-right { animation: slide-out-right 0.14s cubic-bezier(.4,0,.2,1);}
  `}</style>
);

export default DrawerAnimationStyle;
