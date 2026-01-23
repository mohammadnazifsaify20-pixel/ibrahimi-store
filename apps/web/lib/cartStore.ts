import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
    id: number;
    name: string;
    salePrice: number;
    salePriceAFN?: number | null;
    sku: string;
}

interface CartItem extends Product {
    quantity: number;
}

interface CartState {
    items: CartItem[];
    addItem: (product: Product) => void;
    removeItem: (productId: number) => void;
    updateQuantity: (productId: number, quantity: number) => void;
    clearCart: () => void;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (product) => {
                const items = get().items;
                const existing = items.find(i => i.id === product.id);
                if (existing) {
                    set({
                        items: items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
                    });
                } else {
                    set({ items: [...items, { ...product, quantity: 1 }] });
                }
            },
            removeItem: (productId) => {
                set({ items: get().items.filter(i => i.id !== productId) });
            },
            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }
                set({
                    items: get().items.map(i => i.id === productId ? { ...i, quantity } : i)
                });
            },
            clearCart: () => set({ items: [] }),
        }),
        {
            name: 'pos-cart-storage',
        }
    )
);
