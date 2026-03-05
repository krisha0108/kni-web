/**
 * Server-side Marketplace Cart API Utilities
 * Replaces localStorage-based cart management
 */

interface CartResponse {
  ok: boolean;
  data?: {
    items: Array<{
      id: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        price: number;
        stockQuantity: number;
        imageUrl?: string;
        unit?: string;
        vendor: { id: string; name: string };
        category?: { id: string; name: string } | null;
      };
    }>;
  };
  error?: string;
}

/**
 * Fetch cart for a restaurant
 */
export async function fetchCart(restaurantId: string): Promise<NonNullable<CartResponse["data"]>> {
  const response = await fetch(`/api/owner/marketplace/cart?restaurantId=${restaurantId}`, {
    method: "GET",
    credentials: "include",
  });

  const result: CartResponse = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Failed to fetch cart");
  }

  return result.data || { items: [] };
}

/**
 * Add or update item in cart
 */
export async function addCartItem(
  restaurantId: string,
  vendorProductId: string,
  quantity: number
): Promise<NonNullable<CartResponse["data"]>> {
  const response = await fetch("/api/owner/marketplace/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ restaurantId, vendorProductId, quantity }),
  });

  const result: CartResponse = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Failed to add item to cart");
  }

  return result.data || { items: [] };
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
): Promise<NonNullable<CartResponse["data"]>> {
  const response = await fetch(`/api/owner/marketplace/cart/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ quantity }),
  });

  const result: CartResponse = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Failed to update cart item");
  }

  return result.data || { items: [] };
}

/**
 * Remove single item from cart
 */
export async function removeCartItem(itemId: string): Promise<void> {
  const response = await fetch(`/api/owner/marketplace/cart/items/${itemId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Failed to remove cart item");
  }
}

/**
 * Clear entire cart or vendor-specific items
 */
export async function clearCart(
  restaurantId: string,
  options?: { vendorId?: string; clearAll?: boolean }
): Promise<void> {
  const params = new URLSearchParams({ restaurantId });
  
  if (options?.vendorId) {
    params.set("vendorId", options.vendorId);
  }
  if (options?.clearAll) {
    params.set("clearAll", "true");
  }

  const response = await fetch(`/api/owner/marketplace/cart?${params}`, {
    method: "DELETE",
    credentials: "include",
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Failed to clear cart");
  }
}
