"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolveCartAction } from "@/app/(site)/sepet/actions";
import {
  addCartLine,
  CART_STORAGE_KEY,
  cartItemCount,
  normalizeCartLines,
  upsertCartLine,
  type CartLine,
} from "@/lib/cart";
import { loadHydratedCart } from "@/lib/cart-hydrate-cache";

const CART_SELECTED_KEY = "eticaret.cart.selected.v1";

type CartContextValue = {
  ready: boolean;
  lines: CartLine[];
  selectedIds: string[];
  count: number;
  addItem: (variantId: string, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  toggleSelected: (variantId: string) => void;
  setAllSelected: (selected: boolean) => void;
  clearSelected: () => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeCartLines(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readSelectedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(CART_SELECTED_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useBrowserLayoutEffect(() => {
    const storedLines = readStoredCart();
    const storedSelected = readSelectedIds().filter((id) =>
      storedLines.some((line) => line.variantId === id),
    );
    setLines(storedLines);
    setSelectedIds(storedSelected.length > 0 ? storedSelected : storedLines.map((line) => line.variantId));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || lines.length === 0) return;
    void loadHydratedCart(lines, resolveCartAction);
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    window.sessionStorage.setItem(CART_SELECTED_KEY, JSON.stringify(selectedIds));
  }, [ready, selectedIds]);

  const addItem = useCallback((variantId: string, quantity: number) => {
    setLines((current) => addCartLine(current, variantId, quantity));
    setSelectedIds((current) => (current.includes(variantId) ? current : [...current, variantId]));
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((current) => {
      if (quantity <= 0) return current.filter((line) => line.variantId !== variantId);
      return upsertCartLine(current, variantId, quantity);
    });
    if (quantity <= 0) {
      setSelectedIds((current) => current.filter((id) => id !== variantId));
    }
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
    setSelectedIds((current) => current.filter((id) => id !== variantId));
  }, []);

  const toggleSelected = useCallback((variantId: string) => {
    setSelectedIds((current) =>
      current.includes(variantId) ? current.filter((id) => id !== variantId) : [...current, variantId],
    );
  }, []);

  const setAllSelected = useCallback((selected: boolean) => {
    setSelectedIds(selected ? lines.map((line) => line.variantId) : []);
  }, [lines]);

  const clearSelected = useCallback(() => {
    setLines((current) => {
      if (selectedIds.length === 0) return [];
      return current.filter((line) => !selectedIds.includes(line.variantId));
    });
    setSelectedIds([]);
  }, [selectedIds]);

  const clear = useCallback(() => {
    setLines([]);
    setSelectedIds([]);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      lines,
      selectedIds,
      count: cartItemCount(lines),
      addItem,
      setQuantity,
      removeItem,
      toggleSelected,
      setAllSelected,
      clearSelected,
      clear,
    }),
    [
      addItem,
      clear,
      clearSelected,
      lines,
      ready,
      removeItem,
      selectedIds,
      setAllSelected,
      setQuantity,
      toggleSelected,
    ],
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
