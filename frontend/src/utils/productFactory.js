export function createEmptyProduct() {
  const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    name: "",
    sku: "",
    shortDescription: "",
    price: "",
    quantity: 1,
    ivaRate: 0,
    totalPrice: "",
    image: "",
    productUrl: "",
    selected: true,
    sourceType: "manual",
  };
}