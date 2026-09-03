"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
import { loadHydratedCart, readHydratedCartCache } from "@/lib/cart-hydrate-cache";
import {
  cartLinesSignature,
  mergeCartNotices,
  noticesFromHydratedCart,
  sameCartLines,
} from "@/lib/cart-sync";
import type { CartNotice, HydratedCart } from "@/lib/checkout-types";

const CART_SELECTED_KEY = "eticaret.cart.selected.v1";

type CartContextValue = {
  ready: boolean;
  lines: CartLine[];
  hydrated: HydratedCart | null;
  notices: CartNotice[];
  selectedIds: string[];
  count: number;
  addItem: (variantId: string, quantity: number, unitPriceMinor?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  toggleSelected: (variantId: string) => void;
  setAllSelected: (selected: boolean) => void;
  clearSelected: () => void;
  clear: () => void;
  dismissNotice: (id: string) => void;
  dismissNotices: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const emptyHydrated: HydratedCart = {
  lines: [],
  productsMinor: 0,
  taxMinor: 0,
  extraShippingMinor: 0,
};

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
  const [hydrated, setHydrated] = useState<HydratedCart | null>(null);
  const [notices, setNotices] = useState<CartNotice[]>([]);
  const [ready, setReady] = useState(false);
  const skipHydrateRef = useRef(false);
  const linesRef = useRef(lines);
  const selectedIdsRef = useRef(selectedIds);
  linesRef.current = lines;
  selectedIdsRef.current = selectedIds;
  const identityKey = cartLinesSignature(lines);

  useBrowserLayoutEffect(() => {
    const storedLines = readStoredCart();
    const storedSelected = readSelectedIds().filter((id) =>
      storedLines.some((line) => line.variantId === id),
    );
    setLines(storedLines);
    setSelectedIds(storedSelected.length > 0 ? storedSelected : storedLines.map((line) => line.variantId));
    setHydrated(storedLines.length === 0 ? emptyHydrated : readHydratedCartCache(storedLines));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (lines.length === 0) {
      skipHydrateRef.current = false;
      setHydrated(emptyHydrated);
      return;
    }
    if (skipHydrateRef.current) {
      skipHydrateRef.current = false;
      return;
    }

    let cancelled = false;
    void loadHydratedCart(lines, resolveCartAction).then((cart) => {
      if (cancelled) return;

      const incoming = noticesFromHydratedCart(cart);
      if (incoming.length > 0) {
        setNotices((current) => mergeCartNotices(current, incoming));
      }

      const visible = cart.lines.filter((line) => line.issue !== "MISSING");
      const nextStored: CartLine[] = visible.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor > 0 ? line.unitPriceMinor : undefined,
      }));

      setHydrated({
        ...cart,
        lines: visible,
      });

      const availableIds = new Set(visible.filter((line) => line.available).map((line) => line.variantId));
      setSelectedIds((current) => current.filter((id) => availableIds.has(id)));

      if (!sameCartLines(linesRef.current, nextStored)) {
        if (cartLinesSignature(linesRef.current) !== cartLinesSignature(nextStored)) {
          skipHydrateRef.current = true;
        }
        setLines(nextStored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [identityKey, lines.length, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    window.sessionStorage.setItem(CART_SELECTED_KEY, JSON.stringify(selectedIds));
  }, [ready, selectedIds]);

  const addItem = useCallback((variantId: string, quantity: number, unitPriceMinor?: number) => {
    setLines((current) => addCartLine(current, variantId, quantity, unitPriceMinor));
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

  const setAllSelected = useCallback(
    (selected: boolean) => {
      const available = (hydrated?.lines ?? []).filter((line) => line.available);
      setSelectedIds(selected ? available.map((line) => line.variantId) : []);
    },
    [hydrated],
  );

  const clearSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    setLines((current) => {
      if (current.length === 0) return current;
      if (ids.length === 0) return [];
      const next = current.filter((line) => !ids.includes(line.variantId));
      return next.length === current.length ? current : next;
    });
    setSelectedIds((current) => (current.length === 0 ? current : []));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setSelectedIds([]);
    setHydrated(emptyHydrated);
  }, []);

  const dismissNotice = useCallback((id: string) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const dismissNotices = useCallback(() => {
    setNotices([]);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      lines,
      hydrated,
      notices,
      selectedIds,
      count: cartItemCount(lines),
      addItem,
      setQuantity,
      removeItem,
      toggleSelected,
      setAllSelected,
      clearSelected,
      clear,
      dismissNotice,
      dismissNotices,
    }),
    [
      addItem,
      clear,
      clearSelected,
      dismissNotice,
      dismissNotices,
      hydrated,
      lines,
      notices,
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
