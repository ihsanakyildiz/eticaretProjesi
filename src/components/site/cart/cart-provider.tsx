"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCartLine,
  CART_STORAGE_KEY,
  cartItemCount,
  normalizeCartLines,
  upsertCartLine,
  type CartLine,
} from "@/lib/cart";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  addItem: (variantId: string, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeCartLines(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const addItem = useCallback((variantId: string, quantity: number) => {
    setLines((current) => addCartLine(current, variantId, quantity));
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((current) => {
      if (quantity <= 0) return current.filter((line) => line.variantId !== variantId);
      return upsertCartLine(current, variantId, quantity);
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: cartItemCount(lines),
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [addItem, clear, lines, removeItem, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart CartProvider dışında kullanılamaz.");
  }
  return value;
}
