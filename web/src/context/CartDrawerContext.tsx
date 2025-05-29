"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface DrawerContextProps {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextProps | undefined>(undefined);

export const useCartDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) throw new Error("useCartDrawer must be used within DrawerProvider");
  return context;
};

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openDrawer = () => setOpen(true);
  const closeDrawer = () => setOpen(false);

  return (
    <DrawerContext.Provider value={{ open, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}
