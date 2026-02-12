import { useState, useMemo } from "react";

type Variant = {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string } | string; // Can be object or string
  quantityAvailable?: number;
};

type VariantSelectorProps = {
  variants: Variant[];
  selectedVariantId?: string;
  onSelect: (variantId: string) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
};

// Parse variant title to extract size
function parseVariantTitle(title: string): { size?: string } {
  const parts = title.split(" / ");
  return {
    size: parts[0] || undefined,
  };
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
  quantity,
  onQuantityChange,
}: VariantSelectorProps) {
  // Extract unique sizes from variants
  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    variants.forEach((variant) => {
      const { size } = parseVariantTitle(variant.title);
      if (size) sizeSet.add(size);
    });
    return Array.from(sizeSet);
  }, [variants]);

  // Find base variant for selected size (get first variant with "Free Touch Energization" and "Loose Bead")
  const getBaseVariantForSize = (size: string): Variant | null => {
    return (
      variants.find((v) => {
        const { size: vSize } = parseVariantTitle(v.title);
        return vSize === size && v.title.includes("Free Touch Energization") && v.title.includes("Loose Bead");
      }) || variants.find((v) => {
        const { size: vSize } = parseVariantTitle(v.title);
        return vSize === size;
      }) || null
    );
  };

  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    if (selectedVariantId) {
      const variant = variants.find((v) => v.id === selectedVariantId);
      if (variant) {
        return parseVariantTitle(variant.title).size || null;
      }
    }
    return sizes[0] || null;
  });

  // Update selected variant when size changes
  useMemo(() => {
    if (selectedSize) {
      const baseVariant = getBaseVariantForSize(selectedSize);
      if (baseVariant && baseVariant.id !== selectedVariantId) {
        onSelect(baseVariant.id);
      }
    }
  }, [selectedSize, selectedVariantId, onSelect, variants]);

  const currentVariant = selectedSize ? getBaseVariantForSize(selectedSize) : null;
  // Handle both price formats: object with amount or string
  const getPriceAmount = (price: { amount: string; currencyCode: string } | string): number => {
    if (typeof price === "string") {
      return parseFloat(price) || 0;
    }
    return parseFloat(price?.amount || "0");
  };
  const basePrice = currentVariant ? getPriceAmount(currentVariant.price) : 0;

  if (sizes.length === 0) {
    // Fallback to simple dropdown
    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-textDark">Select Variant</label>
        <select
          value={selectedVariantId || variants[0]?.id}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full rounded-lg border-2 border-creamDark bg-white px-3 py-2 text-sm text-textDark outline-none focus:border-gold"
        >
          {variants.map((variant) => {
            const price = typeof variant.price === "string" ? parseFloat(variant.price) : parseFloat(variant.price?.amount || "0");
            return (
              <option key={variant.id} value={variant.id}>
                {variant.title} - ₹{price.toLocaleString()}
              </option>
            );
          })}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-textDark">Qty:</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 rounded-lg border-2 border-creamDark bg-white px-2 py-1 text-sm text-textDark outline-none focus:border-gold"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Size Selection */}
      <div>
        <label className="text-xs font-semibold text-textDark mb-1 block">Size</label>
        <div className="flex gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedSize === size
                  ? "bg-gold text-white"
                  : "bg-white border-2 border-creamDark text-textDark hover:border-gold"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity and Base Price */}
      {selectedSize && currentVariant && (
        <div className="pt-2 border-t border-creamDark">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-textDark">Quantity:</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-lg border-2 border-creamDark bg-white px-2 py-1 text-sm text-textDark outline-none focus:border-gold"
              />
            </div>
            <div className="text-right">
              <div className="text-xs text-textLight">Price:</div>
              <div className="text-sm font-semibold text-gold">
                ₹{basePrice.toLocaleString()} × {quantity} = ₹{(basePrice * quantity).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
