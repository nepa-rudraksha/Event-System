import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Field,
  Input,
  PrimaryButton,
  SectionCard,
  GhostButton,
  Chip,
} from "../components/ui";
import { ExpertNav } from "../components/ExpertNav";
import VariantSelector from "../components/VariantSelector";
import { MessageIcon } from "../components/Icons";
import { KundaliChart } from "../components/KundaliChart";
import { NavamsaChart } from "../components/NavamsaChart";
import { fetchConsultation, lockRecommendations, updateConsultationNotes, generateAstrologyReport, fetchOrderHistory, createDraftOrder, sendWhatsAppNotification, searchShopifyProducts, api } from "../lib/api";
import { getAdminEventId } from "../lib/adminSession";

type RecommendationDraft = {
  productDetails?: any;
  selectedVariantId?: string;
  checkoutLink?: string;
  quantity: number;
  priority: number;
  reason: string;
  notes?: string;
  mappedShopifyVariantId?: string;
  planet?: string;
  mukhi?: number;
  mala?: string;
  afflictionScore?: number;
  topReasons?: string[];
  category?: string;
  fieldType?: string;
  isAccessory?: boolean;
  isPooja?: boolean;
};

type CategorizedProduct = {
  product: any;
  category: string;
  fieldType?: string;
  planet?: string;
  mukhi?: number;
  bead?: string;
  mala?: string;
  why?: string;
  benefits?: string | string[];
  score?: number;
  reasons?: string[];
  afflictionScore?: number;
};

// Accessories with their variant IDs and costs
const ACCESSORIES = [
  { name: "Silver Capping", variantId: "47409161699570", cost: 5 },
  { name: "Rudraksha Chain", variantId: "47409161666802", cost: 150 },
  { name: "Silver Chain in Mala", variantId: "47409161404658", cost: 90 },
  { name: "Silver Chain in Rudraksha", variantId: "47409161371890", cost: 60 },
];

// Pooja (Energization) options with their variant IDs and costs
const POOJAS = [
  { name: "Rudraksha Prana Pratishtha Pooja", variantId: "42114197815538", cost: 299 },
  { name: "Trividha Prana Pratishtha Pooja (3 Brahmans)", variantId: "48656302047474", cost: 599 },
  { name: "Dwadasha Maha Prana Pratishtha Pooja (13 Brahmans)", variantId: "48656302801138", cost: 1200 },
];

export default function ExpertWorkspace() {
  const { consultationId = "", eventId: urlEventId = "" } = useParams<{ consultationId?: string; eventId?: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [orderHistory, setOrderHistory] = useState<any>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [draftOrderUrl, setDraftOrderUrl] = useState<string | null>(null);
  const [draftOrderDetails, setDraftOrderDetails] = useState<any>(null);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [items, setItems] = useState<RecommendationDraft[]>([]);
  const [categorizedProducts, setCategorizedProducts] = useState<Record<string, CategorizedProduct[]>>({});
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductJson, setNewProductJson] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Discount state
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT" | null>(null);
  const [discountValue, setDiscountValue] = useState("");
  const [discountTitle, setDiscountTitle] = useState("");
  
  // Product search state
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Accessory/Pooja prices in INR (fetched from Shopify)
  const [accessoryPoojaPrices, setAccessoryPoojaPrices] = useState<Record<string, number>>({});

  // Fetch accessory/pooja prices in INR on component mount
  useEffect(() => {
    const fetchAccessoryPoojaPrices = async () => {
      const allVariantIds = [
        ...ACCESSORIES.map(a => a.variantId),
        ...POOJAS.map(p => p.variantId),
      ];
      
      if (allVariantIds.length > 0) {
        try {
          const { fetchVariantPrices } = await import("../lib/api");
          const prices = await fetchVariantPrices(allVariantIds);
          setAccessoryPoojaPrices(prices || {});
        } catch (err) {
          console.error("Failed to fetch accessory/pooja prices:", err);
          // Set fallback prices (these should be updated to INR values)
          const fallbackPrices: Record<string, number> = {
            "47409161699570": 5, // Silver Capping
            "47409161666802": 150, // Rudraksha Chain
            "47409161404658": 90, // Silver Chain in Mala
            "47409161371890": 60, // Silver Chain in Rudraksha
            "42114197815538": 299, // Rudraksha Prana Pratishtha Pooja
            "48656302047474": 599, // Trividha Prana Pratishtha Pooja
            "48656302801138": 1200, // Dwadasha Maha Prana Pratishtha Pooja
          };
          setAccessoryPoojaPrices(fallbackPrices);
        }
      }
    };
    
    fetchAccessoryPoojaPrices();
  }, []);

  useEffect(() => {
    if (!consultationId) return;
    fetchConsultation(consultationId)
      .then((data) => {
        setConsultation(data);
        setNotes(data?.notes ?? "");
        
        // Load existing recommendations if locked
        if (data?.recommendations && data.recommendations.length > 0) {
          const existingItems: RecommendationDraft[] = data.recommendations.map((rec: any) => ({
            productDetails: rec.productDetails,
            selectedVariantId: rec.mappedShopifyVariantId,
            mappedShopifyVariantId: rec.mappedShopifyVariantId,
            checkoutLink: rec.checkoutLink,
            quantity: rec.quantity || 1,
            priority: rec.priority,
            reason: rec.reason,
            notes: rec.notes,
            planet: rec.productDetails?.planet,
            mukhi: rec.productDetails?.mukhi,
            mala: rec.productDetails?.mala,
            afflictionScore: rec.productDetails?.afflictionScore,
            topReasons: rec.productDetails?.topReasons,
            category: rec.productDetails?.category,
          }));
          setItems(existingItems);
        }
        
        // Load existing draft order details if available
        if (data?.draftOrderDetails) {
          setDraftOrderDetails(data.draftOrderDetails);
          setDraftOrderUrl(data.draftOrderDetails.checkoutUrl || data.salesAssist?.checkoutLink);
        } else if (data?.salesAssist?.shopifyDraftId) {
          // If we have a draft order ID but no details, fetch them
          // The backend should have fetched it, but if not, we can fetch here
          // For now, just set the checkout URL if available
          if (data.salesAssist.checkoutLink) {
            setDraftOrderUrl(data.salesAssist.checkoutLink);
          }
        }
        
        if (data?.astrologyReport) {
          setShowReport(true);
          extractProductsFromReport(data.astrologyReport);
        }
        if (!data?.expertId) {
          updateConsultationNotes(consultationId, data?.notes || "").catch((err) => {
            console.log("Auto-assign failed (expected if not logged in):", err);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch consultation:", err);
      });
  }, [consultationId]);

  const extractProductsFromReport = (report: any) => {
    if (!report?.shopify_enriched_rudraksha_recommendation) return;

    const categorized: Record<string, CategorizedProduct[]> = {
      "Siddha Mala": [],
      "Single Beads": [],
      "Wealth": [],
      "Relationship": [],
      "Health": [],
      "Career": [],
      "Sadhana": [],
      "Mental Stress": [],
      "Combinations": [],
    };

    const shopifyData = report.shopify_enriched_rudraksha_recommendation;

    // Siddha Mala - Recommended
    if (shopifyData.siddha_mala?.recommended?.product) {
      const rec = shopifyData.siddha_mala.recommended;
      categorized["Siddha Mala"].push({
        product: rec.product,
        category: "Siddha Mala",
        planet: rec.planet,
        mukhi: rec.mukhi,
        mala: rec.mala,
        afflictionScore: rec.affliction_score,
        reasons: rec.top_reasons || [],
      });
    }

    // Siddha Mala - Top 3
    if (shopifyData.siddha_mala?.top3) {
      shopifyData.siddha_mala.top3.forEach((rec: any) => {
        if (rec.product) {
          categorized["Siddha Mala"].push({
            product: rec.product,
            category: "Siddha Mala",
            planet: rec.planet,
            mukhi: rec.mukhi,
            mala: rec.mala,
            score: rec.score,
            reasons: rec.reasons || [],
          });
        }
      });
    }

    // Single Beads
    if (shopifyData.single_beads) {
      shopifyData.single_beads.forEach((rec: any) => {
        if (rec.product) {
          categorized["Single Beads"].push({
            product: rec.product,
            category: "Single Beads",
            planet: rec.planet,
            bead: rec.bead,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Fields - Wealth
    if (shopifyData.fields?.wealth) {
      shopifyData.fields.wealth.forEach((rec: any) => {
        if (rec.product) {
          categorized["Wealth"].push({
            product: rec.product,
            category: "Wealth",
            fieldType: "wealth",
            planet: rec.planet,
            rudraksha: rec.rudraksha,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Fields - Relationship
    if (shopifyData.fields?.relationship) {
      shopifyData.fields.relationship.forEach((rec: any) => {
        if (rec.product) {
          categorized["Relationship"].push({
            product: rec.product,
            category: "Relationship",
            fieldType: "relationship",
            planet: rec.planet,
            rudraksha: rec.rudraksha,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Fields - Health
    if (shopifyData.fields?.health) {
      shopifyData.fields.health.forEach((rec: any) => {
        if (rec.product) {
          categorized["Health"].push({
            product: rec.product,
            category: "Health",
            fieldType: "health",
            planet: rec.planet,
            rudraksha: rec.rudraksha,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Fields - Career
    if (shopifyData.fields?.career) {
      shopifyData.fields.career.forEach((rec: any) => {
        if (rec.product) {
          categorized["Career"].push({
            product: rec.product,
            category: "Career",
            fieldType: "career",
            planet: rec.planet,
            rudraksha: rec.rudraksha,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Fields - Sadhana
    if (shopifyData.fields?.sadhana) {
      shopifyData.fields.sadhana.forEach((rec: any) => {
        if (rec.product) {
          categorized["Sadhana"].push({
            product: rec.product,
            category: "Sadhana",
            fieldType: "sadhana",
            planet: rec.planet,
            rudraksha: rec.rudraksha,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Fields - Mental Stress
    if (shopifyData.fields?.mental_stress) {
      shopifyData.fields.mental_stress.forEach((rec: any) => {
        if (rec.product) {
          categorized["Mental Stress"].push({
            product: rec.product,
            category: "Mental Stress",
            fieldType: "mental_stress",
            planet: rec.planet,
            rudraksha: rec.rudraksha,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Combinations
    if (shopifyData.combinations) {
      shopifyData.combinations.forEach((rec: any) => {
        if (rec.product) {
          categorized["Combinations"].push({
            product: rec.product,
            category: "Combinations",
            planet: rec.planet,
            title: rec.title,
            why: rec.why,
            benefits: rec.benefits,
          });
        }
      });
    }

    // Remove empty categories
    Object.keys(categorized).forEach((key) => {
      if (categorized[key].length === 0) {
        delete categorized[key];
      }
    });

    setCategorizedProducts(categorized);
  };

  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const products = await searchShopifyProducts(searchQuery.trim(), 20);
      setSearchResults(products);
    } catch (err: any) {
      console.error("Error searching products:", err);
      alert(err.response?.data?.error || "Failed to search products");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addProductFromSearch = (product: any, variant: any) => {
    setItems((prev) => [
      ...prev,
      {
        productDetails: {
          ...product,
          variants: product.variants,
        },
        selectedVariantId: variant.id,
        mappedShopifyVariantId: variant.id,
        checkoutLink: `https://nepalirudraksha.com/products/${product.handle}?variant=${variant.id}`,
        quantity: 1,
        priority: 1,
        reason: product.title,
        notes: product.description || "",
      },
    ]);
    setShowProductSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const addProductToRecommendations = (catProduct: CategorizedProduct) => {
    const product = catProduct.product;
    const reason = catProduct.mala
      ? `${catProduct.mala} - ${catProduct.planet}`
      : catProduct.bead
      ? `${catProduct.bead} - ${catProduct.planet}`
      : catProduct.rudraksha
      ? `${catProduct.rudraksha} - ${catProduct.planet}`
      : catProduct.title || product.title;

    const notes = Array.isArray(catProduct.benefits)
      ? catProduct.benefits.join(", ")
      : catProduct.benefits || product.metafields?.short_description || "";

    setItems((prev) => [
      ...prev,
      {
        productDetails: product,
        selectedVariantId: product.variants?.[0]?.id,
        mappedShopifyVariantId: product.variants?.[0]?.id,
        checkoutLink: product.variants?.[0]
          ? `https://neparudraksha.com/products/${product.handle}?variant=${product.variants[0].id}`
          : undefined,
        quantity: 1,
        priority: 1,
        reason: reason,
        notes: notes,
        category: catProduct.category,
        fieldType: catProduct.fieldType,
        planet: catProduct.planet,
        mukhi: catProduct.mukhi,
        mala: catProduct.mala,
        afflictionScore: catProduct.afflictionScore,
        topReasons: catProduct.reasons,
      },
    ]);
  };

  const handleGenerateReport = async () => {
    if (!consultationId) return;
    setGeneratingReport(true);
    try {
      const result = await generateAstrologyReport(consultationId);
      setConsultation((prev: any) => ({ ...prev, astrologyReport: result.astrologyReport }));
      setShowReport(true);
      if (result.astrologyReport) {
        extractProductsFromReport(result.astrologyReport);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { quantity: 1, priority: 1, reason: "", notes: "" }]);
  };

  const addAccessory = (accessory: typeof ACCESSORIES[0]) => {
    const isAlreadyAdded = items.some(
      (item) => item.isAccessory && item.mappedShopifyVariantId === accessory.variantId
    );
    if (isAlreadyAdded) {
      // Update quantity if already added
      setItems((prev) =>
        prev.map((item) =>
          item.isAccessory && item.mappedShopifyVariantId === accessory.variantId
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          quantity: 1,
          priority: 1,
          reason: accessory.name,
          notes: `Accessory - ₹${accessory.cost}`,
          mappedShopifyVariantId: accessory.variantId,
          isAccessory: true,
        },
      ]);
    }
  };

  const addPooja = (pooja: typeof POOJAS[0]) => {
    const isAlreadyAdded = items.some(
      (item) => item.isPooja && item.mappedShopifyVariantId === pooja.variantId
    );
    if (isAlreadyAdded) {
      // Update quantity if already added
      setItems((prev) =>
        prev.map((item) =>
          item.isPooja && item.mappedShopifyVariantId === pooja.variantId
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          quantity: 1,
          priority: 1,
          reason: pooja.name,
          notes: `Pooja/Energization - ₹${accessoryPoojaPrices[pooja.variantId] || accessoryPoojaPrices[`gid://shopify/ProductVariant/${pooja.variantId}`] || 0}`,
          mappedShopifyVariantId: pooja.variantId,
          isPooja: true,
        },
      ]);
    }
  };

  const addProductFromJson = () => {
    try {
      const product = JSON.parse(newProductJson);
      setItems((prev) => [
        ...prev,
        {
          productDetails: product,
          selectedVariantId: product.variants?.[0]?.id,
          mappedShopifyVariantId: product.variants?.[0]?.id,
          checkoutLink: product.variants?.[0]
            ? `https://neparudraksha.com/products/${product.handle}?variant=${product.variants[0].id}`
            : undefined,
          quantity: 1,
          priority: 1,
          reason: product.title || "",
          notes: product.metafields?.short_description || "",
        },
      ]);
      setNewProductJson("");
      setShowAddProduct(false);
    } catch (err) {
      alert("Invalid JSON. Please paste the full Shopify product object.");
    }
  };

  const updateItem = (index: number, patch: Partial<RecommendationDraft>) => {
    setItems((prev) => {
      const updated = prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
      if (patch.selectedVariantId && updated[index].productDetails) {
        const variant = updated[index].productDetails.variants?.find(
          (v: any) => v.id === patch.selectedVariantId
        );
        if (variant) {
          updated[index].mappedShopifyVariantId = variant.id;
          updated[index].checkoutLink = `https://neparudraksha.com/products/${updated[index].productDetails.handle}?variant=${variant.id}`;
        }
      }
      return updated;
    });
  };

  // Generate combined checkout link from all items including accessories and poojas
  const generateCombinedCheckoutLink = (): string | null => {
    const cartItems: string[] = [];

    items.forEach((item) => {
      if (item.quantity > 0 && item.mappedShopifyVariantId) {
        // Extract numeric ID from GID format or use directly if it's already numeric
        const variantId = item.mappedShopifyVariantId;
        const match = variantId.match(/\/(\d+)$/);
        const numericId = match ? match[1] : variantId;
        cartItems.push(`${numericId}:${item.quantity}`);
      }
    });

    if (cartItems.length === 0) return null;
    return `https://nepalirudraksha.com/cart/${cartItems.join(",")}`;
  };

  // Calculate total amount including accessories and poojas
  const calculateTotalAmount = (): number => {
    // Use fetched prices from Shopify, fallback to stored prices
    const ACCESSORIES_COSTS: Record<string, number> = {
      "47409161699570": accessoryPoojaPrices["47409161699570"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161699570"] || 5,
      "47409161666802": accessoryPoojaPrices["47409161666802"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161666802"] || 150,
      "47409161404658": accessoryPoojaPrices["47409161404658"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161404658"] || 90,
      "47409161371890": accessoryPoojaPrices["47409161371890"] || accessoryPoojaPrices["gid://shopify/ProductVariant/47409161371890"] || 60,
    };

    const POOJAS_COSTS: Record<string, number> = {
      "42114197815538": accessoryPoojaPrices["42114197815538"] || accessoryPoojaPrices["gid://shopify/ProductVariant/42114197815538"] || 299,
      "48656302047474": accessoryPoojaPrices["48656302047474"] || accessoryPoojaPrices["gid://shopify/ProductVariant/48656302047474"] || 599,
      "48656302801138": accessoryPoojaPrices["48656302801138"] || accessoryPoojaPrices["gid://shopify/ProductVariant/48656302801138"] || 1200,
    };

    return items.reduce((total, item) => {
      let itemTotal = 0;

      // Base product price
      if (item.productDetails && item.selectedVariantId) {
        const variant = item.productDetails.variants?.find(
          (v: any) => v.id === item.selectedVariantId
        );
        if (variant) {
          // Handle both price formats: object with amount or string
          const price = typeof variant.price === "string" 
            ? parseFloat(variant.price) || 0
            : parseFloat(variant.price?.amount || "0");
          itemTotal += price * (item.quantity || 1);
        }
      }

      // Accessories cost
      if (item.isAccessory && item.mappedShopifyVariantId) {
        const cost = ACCESSORIES_COSTS[item.mappedShopifyVariantId] || 0;
        itemTotal += cost * (item.quantity || 1);
      }

      // Poojas cost
      if (item.isPooja && item.mappedShopifyVariantId) {
        const cost = POOJAS_COSTS[item.mappedShopifyVariantId] || 0;
        itemTotal += cost * (item.quantity || 1);
      }

      return total + itemTotal;
    }, 0);
  };

  const loadOrderHistory = async () => {
    if (!consultationId) return;
    try {
      const history = await fetchOrderHistory(consultationId);
      setOrderHistory(history);
      setShowOrderHistory(true);
    } catch (err: any) {
      console.error("Failed to load order history:", err);
    }
  };

  const handleCreateDraftOrder = async () => {
    if (!consultationId) return;
    if (items.length === 0) {
      alert("Please add items to create a draft order");
      return;
    }

    setLoading(true);
    try {
      // Prepare line items for draft order
      const lineItems = items
        .filter((item) => item.mappedShopifyVariantId && item.quantity > 0)
        .map((item) => {
          // Extract numeric ID from GID format if needed
          let variantId = item.mappedShopifyVariantId;
          if (!variantId) return null; // Skip if no variant ID
          
          if (variantId.startsWith("gid://")) {
            // Extract numeric ID from GID format
            const match = variantId.match(/\/(\d+)$/);
            variantId = match ? `gid://shopify/ProductVariant/${match[1]}` : variantId;
          } else if (!variantId.startsWith("gid://")) {
            // If it's just a number, convert to GID format
            variantId = `gid://shopify/ProductVariant/${variantId}`;
          }

          return {
            variantId,
            quantity: item.quantity || 1,
            customAttributes: item.reason
              ? [{ key: "Reason", value: item.reason }]
              : undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (lineItems.length === 0) {
        alert("No valid items with variant IDs found");
        setLoading(false);
        return;
      }

      // Prepare discount if provided
      const discount = discountType && discountValue
        ? {
            type: discountType,
            value: parseFloat(discountValue),
            title: discountTitle || undefined,
          }
        : undefined;

      // Create draft order in Shopify
      const draftOrder = await createDraftOrder(consultationId, {
        lineItems,
        note: `Draft order for consultation - ${consultation?.visitor?.name || "Customer"}`,
        discount,
      });

      setDraftOrderUrl(draftOrder.checkoutUrl);
      setDraftOrderDetails(draftOrder);

      // Reload consultation to get updated data
      const updated = await fetchConsultation(consultationId);
      setConsultation(updated);
      
      // If consultation has draft order details, set them
      if (updated.draftOrderDetails) {
        setDraftOrderDetails(updated.draftOrderDetails);
      }

      // Also save recommendations
      await updateConsultationNotes(consultationId, notes);
      await lockRecommendations(consultationId, {
        items: items.map((item) => ({
          productDetails: item.productDetails,
          checkoutLink: draftOrder.checkoutUrl, // Use draft order URL
          mappedShopifyVariantId: item.mappedShopifyVariantId || item.selectedVariantId,
          quantity: item.quantity || 1,
          priority: item.priority,
          reason: item.reason,
          notes: item.notes || undefined,
        })),
      });

      // Reload consultation again to get updated recommendations
      const updatedConsultation = await fetchConsultation(consultationId);
      setConsultation(updatedConsultation);
      
      // If consultation has draft order details, set them
      if (updatedConsultation.draftOrderDetails) {
        setDraftOrderDetails(updatedConsultation.draftOrderDetails);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create draft order");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!consultationId) return;
    setLoading(true);
    try {
      await updateConsultationNotes(consultationId, notes);
      // Save recommendations without creating draft order (expert can create draft order separately)
      const result = await lockRecommendations(consultationId, {
        items: items.map((item) => ({
          productDetails: item.productDetails,
          checkoutLink: draftOrderUrl || item.checkoutLink || undefined,
          mappedShopifyVariantId: item.mappedShopifyVariantId || item.selectedVariantId,
          quantity: item.quantity || 1,
          priority: item.priority,
          reason: item.reason,
          notes: item.notes || undefined,
        })),
      });
      alert(result?.updated ? "Recommendations updated successfully!" : "Recommendations locked successfully!");
      // Reload consultation to get updated data
      const updated = await fetchConsultation(consultationId);
      setConsultation(updated);
      if (updated?.recommendations) {
        const existingItems: RecommendationDraft[] = updated.recommendations.map((rec: any) => ({
          productDetails: rec.productDetails,
          selectedVariantId: rec.mappedShopifyVariantId,
          mappedShopifyVariantId: rec.mappedShopifyVariantId,
          checkoutLink: rec.checkoutLink,
          quantity: rec.quantity || 1,
          priority: rec.priority,
          reason: rec.reason,
          notes: rec.notes,
        }));
        setItems(existingItems);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save recommendations");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const report = consultation?.astrologyReport;
  const birthDetails = consultation?.visitor?.birthDetails;

  const handleSendWhatsApp = async (templateKey: string, customParams?: Array<{ type: "text"; text: string }>) => {
    if (!consultationId) return;
    try {
      const params = customParams || [
        { type: "text" as const, text: consultation?.visitor?.name || "Customer" },
      ];
      
      if (templateKey === "token_booked" && consultation?.token) {
        // Token number should be just the number, not with "#" prefix
        params.push({ type: "text" as const, text: String(consultation.token.tokenNo) });
      }
      
      const result = await sendWhatsAppNotification(consultationId, {
        templateKey,
        parameters: params,
      });
      
      if (result.success) {
        alert(`✅ WhatsApp message sent successfully!`);
      } else {
        alert(`❌ Failed to send: ${result.reason || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.response?.data?.error || err.message || "Failed to send WhatsApp message"}`);
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <ExpertNav title="Expert Consultation Workspace" />
        
        {/* Compact Customer Info, Birth Details & WhatsApp Actions */}
        <SectionCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-semibold text-textDark mb-2">Customer Info</h3>
              <div className="space-y-1 text-xs">
                <p className="text-textDark"><strong>Name:</strong> {consultation?.visitor?.name ?? "N/A"}</p>
                <p className="text-textMedium"><strong>Phone:</strong> {consultation?.visitor?.phone ?? "N/A"}</p>
                <p className="text-textMedium"><strong>Email:</strong> {consultation?.visitor?.email ?? "N/A"}</p>
                {consultation?.token && (
                  <p className="text-textMedium"><strong>Token #:</strong> {consultation.token.tokenNo}</p>
                )}
              </div>
              {consultation?.recommendationLock && (
                <Chip className="bg-gold/20 text-gold border border-gold text-xs mt-2">Locked - Editing Enabled</Chip>
              )}
            </div>

            {/* Birth Details */}
            <div>
              <h3 className="text-sm font-semibold text-textDark mb-2">Birth Details</h3>
              {birthDetails ? (
                <div className="space-y-1 text-xs">
                  <p className="text-textDark"><strong>DOB:</strong> {birthDetails.dob ? new Date(birthDetails.dob).toLocaleDateString() : "N/A"}</p>
                  <p className="text-textMedium"><strong>TOB:</strong> {birthDetails.tob || "N/A"}</p>
                  <p className="text-textMedium"><strong>POB:</strong> {birthDetails.pob ? (birthDetails.pob.length > 30 ? birthDetails.pob.substring(0, 30) + "..." : birthDetails.pob) : "N/A"}</p>
                </div>
              ) : (
                <p className="text-xs text-textLight">No birth details</p>
              )}
              {!report && birthDetails && (
                <PrimaryButton
                  onClick={async () => {
                    if (!consultationId) return;
                    setGeneratingReport(true);
                    try {
                      const result = await generateAstrologyReport(consultationId);
                      if (result) {
                        const updated = await fetchConsultation(consultationId);
                        setConsultation(updated);
                        if (updated?.astrologyReport) {
                          setShowReport(true);
                          extractProductsFromReport(updated.astrologyReport);
                        }
                        alert("Astrology report generated successfully!");
                      }
                    } catch (err: any) {
                      alert(err.response?.data?.error || "Failed to generate report");
                    } finally {
                      setGeneratingReport(false);
                    }
                  }}
                  disabled={generatingReport}
                  className="mt-2 text-xs px-3 py-1"
                >
                  {generatingReport ? "Generating..." : "Generate Report"}
                </PrimaryButton>
              )}
              {report && (
                <PrimaryButton
                  onClick={() => setShowReport(!showReport)}
                  className="mt-2 text-xs px-3 py-1"
                >
                  {showReport ? "Hide Report" : "View Report"}
                </PrimaryButton>
              )}
            </div>

            {/* WhatsApp Messages as Tags */}
            <div>
              <h3 className="text-sm font-semibold text-textDark mb-2">WhatsApp Messages</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSendWhatsApp("consultation_ready")}
                  disabled={!consultationId}
                  className="px-3 py-1.5 rounded-full bg-gold text-white text-xs font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send 'Consultation Ready' message - Notifies customer that their consultation is now ready and they should proceed to the consultation area"
                >
                  <MessageIcon size={12} />
                  Consultation Ready
                </button>
                <button
                  onClick={() => handleSendWhatsApp("token_near")}
                  disabled={!consultationId}
                  className="px-3 py-1.5 rounded-full bg-gold text-white text-xs font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send 'Token Near' message - Notifies customer that their token is about to be called soon"
                >
                  <MessageIcon size={12} />
                  Token Near
                </button>
                <button
                  onClick={() => handleSendWhatsApp("consultation_reminder")}
                  disabled={!consultationId}
                  className="px-3 py-1.5 rounded-full bg-gold text-white text-xs font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Send 'Consultation Reminder' message - Reminds customer about their upcoming consultation"
                >
                  <MessageIcon size={12} />
                  Consultation Reminder
                </button>
                {consultation?.token && (
                  <button
                    onClick={() => handleSendWhatsApp("token_booked")}
                    disabled={!consultationId}
                    className="px-3 py-1.5 rounded-full bg-gold text-white text-xs font-semibold hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Send 'Token Booked' message - Notifies customer that their consultation token has been booked successfully"
                  >
                    <MessageIcon size={12} />
                    Token Booked
                  </button>
                )}
                <button
                  onClick={loadOrderHistory}
                  className="px-3 py-1.5 rounded-full border-2 border-creamDark text-textDark text-xs font-semibold hover:bg-creamDark transition-colors"
                >
                  Order History
                </button>
                <button
                  onClick={() => {
                    const eventId = consultation?.eventId || urlEventId || getAdminEventId() || "";
                    if (eventId) {
                      navigate(`/ops/expert/${eventId}/customers`);
                    } else {
                      navigate(-1);
                    }
                  }}
                  className="px-3 py-1.5 rounded-full border-2 border-creamDark text-textDark text-xs font-semibold hover:bg-creamDark transition-colors"
                >
                  All Customers
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Consultation Notes - Single Section */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading text-textDark">Consultation Notes</h2>
            <PrimaryButton
              onClick={async () => {
                if (!consultationId) return;
                setLoading(true);
                try {
                  await updateConsultationNotes(consultationId, notes);
                  alert("Notes saved successfully!");
                } catch (err: any) {
                  alert(err.response?.data?.error || "Failed to save notes");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="text-sm px-4 py-2"
            >
              {loading ? "Saving..." : "Save Notes"}
            </PrimaryButton>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[120px] rounded-xl border-2 border-creamDark bg-white px-4 py-3 text-base text-textDark placeholder:text-textLight outline-none focus:border-gold focus:shadow-soft"
            placeholder="Add consultation notes here..."
          />
        </SectionCard>

        {/* Astrology Report Display */}
        {showReport && report && (
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading text-textDark">Full Astrology Report</h2>
              <GhostButton onClick={() => setShowReport(false)}>Hide Report</GhostButton>
            </div>

            {showReport && report && (
              <div className="mt-4 space-y-4 max-h-[600px] overflow-y-auto">
                {/* Basic Details */}
                {report.result && (report.result.lagna || report.result.rashi || report.result.nakshatra) && (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <h3 className="text-heading text-textDark mb-3">Basic Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {report.result.lagna && (
                        <div>
                          <p className="text-sm font-semibold text-textDark mb-1">Lagna</p>
                          <p className="text-body text-textMedium">{report.result.lagna}</p>
                          {report.result.lagna_ruling_planet && (
                            <p className="text-xs text-textLight">Ruling Planet: {report.result.lagna_ruling_planet}</p>
                          )}
                        </div>
                      )}
                      {report.result.rashi && (
                        <div>
                          <p className="text-sm font-semibold text-textDark mb-1">Rashi</p>
                          <p className="text-body text-textMedium">{report.result.rashi}</p>
                          {report.result.rashi_ruling_planet && (
                            <p className="text-xs text-textLight">Ruling Planet: {report.result.rashi_ruling_planet}</p>
                          )}
                        </div>
                      )}
                      {report.result.nakshatra && (
                        <div>
                          <p className="text-sm font-semibold text-textDark mb-1">Nakshatra</p>
                          <p className="text-body text-textMedium">{report.result.nakshatra}</p>
                          {report.result.nakshatra_ruling_planet && (
                            <p className="text-xs text-textLight">Ruling Planet: {report.result.nakshatra_ruling_planet}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kundali and Navamsa Charts */}
                {((report.houses_array_serialized && report.planets_in_houses_serialized) || report.result?.navamsa_houses_array || report.navamsa_houses_array) ? (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {report.houses_array_serialized && report.planets_in_houses_serialized && (
                        <div>
                          <KundaliChart
                            housesArray={report.houses_array_serialized}
                            planetsInHouses={report.planets_in_houses_serialized}
                            name={consultation?.visitor?.name || "Customer"}
                          />
                        </div>
                      )}
                      {(report.result?.navamsa_houses_array || report.navamsa_houses_array) && (
                        <div>
                          <NavamsaChart
                            navamsaHouses={report.result?.navamsa_houses_array || report.navamsa_houses_array}
                            name={consultation?.visitor?.name || "Customer"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Event Report */}
                {report.event_report && (() => {
                  const lines = report.event_report.split('\n');
                  const elements: React.ReactNode[] = [];
                  let currentTableRows: React.ReactNode[] = [];
                  let inTable = false;
                  
                  lines.forEach((line: string, idx: number) => {
                    const trimmed = line.trim();
                    
                    // Handle main headers (# Header)
                    if (trimmed.startsWith('# ') && !trimmed.startsWith('##')) {
                      if (inTable) {
                        // Close table
                        elements.push(
                          <table key={`table-${idx}`} className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                            <thead>{currentTableRows[0]}</thead>
                            <tbody>{currentTableRows.slice(1)}</tbody>
                          </table>
                        );
                        currentTableRows = [];
                        inTable = false;
                      }
                      elements.push(
                        <h2 key={idx} className="text-xl font-bold text-textDark mt-4 mb-2 first:mt-0">
                          {trimmed.substring(2).trim()}
                        </h2>
                      );
                      return;
                    }
                    
                    // Handle subheaders (## Subheader)
                    if (trimmed.startsWith('## ')) {
                      if (inTable) {
                        elements.push(
                          <table key={`table-${idx}`} className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                            <thead>{currentTableRows[0]}</thead>
                            <tbody>{currentTableRows.slice(1)}</tbody>
                          </table>
                        );
                        currentTableRows = [];
                        inTable = false;
                      }
                      elements.push(
                        <h3 key={idx} className="text-lg font-semibold text-textDark mt-3 mb-1">
                          {trimmed.substring(3).trim()}
                        </h3>
                      );
                      return;
                    }
                    
                    // Handle markdown tables
                    if (trimmed.startsWith('|') && trimmed.includes('|')) {
                      // Check if it's a separator row
                      if (trimmed.includes('---') || trimmed.includes('----')) {
                        return; // Skip separator rows
                      }
                      
                      const cells = trimmed.split('|').filter(cell => cell.trim() !== '');
                      const isFirstRow = !inTable;
                      
                      if (isFirstRow) {
                        inTable = true;
                        currentTableRows = [];
                      }
                      
                      const row = (
                        <tr key={`row-${idx}`} className={isFirstRow ? "border-b-2 border-creamDark" : "border-b border-creamDark/50"}>
                          {cells.map((cell, cellIdx) => {
                            const cellContent = cell.trim();
                            if (isFirstRow) {
                              return (
                                <th key={cellIdx} className="px-4 py-2 text-left text-sm font-semibold text-textDark bg-creamDark/50">
                                  {cellContent}
                                </th>
                              );
                            }
                            return (
                              <td key={cellIdx} className="px-4 py-2 text-sm text-textMedium">
                                {cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                      
                      currentTableRows.push(row);
                      return;
                    }
                    
                    // If we were in a table and now we're not, close it
                    if (inTable && trimmed) {
                      elements.push(
                        <table key={`table-${idx}`} className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                          <thead>{currentTableRows[0]}</thead>
                          <tbody>{currentTableRows.slice(1)}</tbody>
                        </table>
                      );
                      currentTableRows = [];
                      inTable = false;
                    }
                    
                    // Handle bold text (**text**)
                    if (trimmed && trimmed.includes('**')) {
                      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
                      elements.push(
                        <p key={idx} className="my-1">
                          {parts.map((part, pIdx) => 
                            part.startsWith('**') && part.endsWith('**') ? (
                              <strong key={pIdx} className="font-semibold text-textDark">
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              <span key={pIdx}>{part}</span>
                            )
                          )}
                        </p>
                      );
                      return;
                    }
                    
                    // Regular lines
                    if (trimmed) {
                      elements.push(
                        <p key={idx} className="my-1 text-textMedium">
                          {trimmed}
                        </p>
                      );
                      return;
                    }
                    
                    // Empty lines - add minimal spacing
                    if (!trimmed && elements.length > 0) {
                      elements.push(<div key={`spacer-${idx}`} className="h-1" />);
                    }
                  });
                  
                  // Close any remaining table
                  if (inTable && currentTableRows.length > 0) {
                    elements.push(
                      <table key="table-final" className="min-w-full my-2 border border-creamDark rounded-lg overflow-hidden">
                        <thead>{currentTableRows[0]}</thead>
                        <tbody>{currentTableRows.slice(1)}</tbody>
                      </table>
                    );
                  }
                  
                  return (
                    <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                      <h3 className="text-heading text-textDark mb-3">Astrology Report</h3>
                      <div className="text-body text-textMedium leading-relaxed">
                        {elements}
                      </div>
                    </div>
                  );
                })()}

                {/* Mahadasha and Antardasha */}
                {report.result?.current_mahadasha && (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <h3 className="text-heading text-textDark mb-3">Mahadasha & Antardasha</h3>
                    
                    {report.result.current_mahadasha && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-textDark">Current Mahadasha:</p>
                          <span className="px-3 py-1 rounded-lg bg-gold/20 text-gold font-semibold text-sm">
                            {report.result.current_mahadasha.name}
                          </span>
                        </div>
                        <p className="text-xs text-textMedium mb-2">
                          {new Date(report.result.current_mahadasha.start_date).toLocaleDateString()} - {new Date(report.result.current_mahadasha.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {report.result.current_antardasha && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-textDark">Current Antardasha:</p>
                          <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 font-semibold text-sm">
                            {report.result.current_antardasha.name}
                          </span>
                        </div>
                        <p className="text-xs text-textMedium mb-2">
                          {new Date(report.result.current_antardasha.start_date).toLocaleDateString()} - {new Date(report.result.current_antardasha.end_date).toLocaleDateString()}
                        </p>
                        {report.result.current_antardasha_significance && (
                          <p className="text-sm text-textMedium italic mt-2">
                            {report.result.current_antardasha_significance}
                          </p>
                        )}
                      </div>
                    )}

                    {report.result.current_mahadasha?.antardasha_sequence && report.result.current_mahadasha.antardasha_sequence.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-textDark mb-2">Antardasha Sequence:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {report.result.current_mahadasha.antardasha_sequence.map((antardasha: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-lg bg-white border border-creamDark">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-textDark">{antardasha.name}</span>
                                <span className="text-xs text-textMedium">
                                  {new Date(antardasha.start_date).toLocaleDateString()} - {new Date(antardasha.end_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Friendship Matrix */}
                {report.result?.friendship_matrix && report.result.friendship_matrix.length > 0 && (
                  <div className="p-4 rounded-xl bg-cream border-2 border-creamDark">
                    <h3 className="text-heading text-textDark mb-3">Planet Friendship Matrix</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg border border-creamDark">
                        <thead>
                          <tr className="bg-creamDark">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-textDark">Planet</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Sun</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Moon</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Mars</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Mercury</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Jupiter</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Venus</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-textDark">Saturn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.result.friendship_matrix.map((row: any, idx: number) => (
                            <tr key={idx} className="border-t border-creamDark">
                              <td className="px-3 py-2 text-sm font-medium text-textDark">{row.planet}</td>
                              {row.relations.map((relation: string, relIdx: number) => (
                                <td key={relIdx} className="px-3 py-2 text-center text-xs">
                                  {relation === "---" ? (
                                    <span className="text-textLight">-</span>
                                  ) : relation === "Friend" ? (
                                    <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">{relation}</span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">{relation}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {report.shopify_enriched_rudraksha_recommendation && (
                  <div className="p-4 rounded-xl bg-gold/5 border-2 border-gold">
                    <h3 className="text-heading text-textDark mb-3">Rudraksha Recommendations Available</h3>
                    <p className="text-sm text-textMedium mb-2">
                      Browse products by category below and add them to recommendations.
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        )}


        {/* Categorized Products */}
        {Object.keys(categorizedProducts).length > 0 && (
          <SectionCard>
            <h2 className="text-heading text-textDark mb-4">Available Products by Category</h2>
            <div className="space-y-4">
              {Object.entries(categorizedProducts).map(([category, products]) => (
                <div key={category} className="border-2 border-creamDark rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 bg-cream hover:bg-creamDark flex items-center justify-between text-left"
                  >
                    <div className="font-semibold text-textDark">
                      {category} ({products.length} {products.length === 1 ? "product" : "products"})
                    </div>
                    <div className="text-textMedium">
                      {expandedCategories[category] ? "▼" : "▶"}
                    </div>
                  </button>
                  {expandedCategories[category] && (
                    <div className="p-4 bg-white space-y-3">
                      {products.map((catProduct, idx) => {
                        const product = catProduct.product;
                        const isAlreadyAdded = items.some(
                          (item) => item.productDetails?.id === product.id
                        );
                        return (
                          <div
                            key={`${category}-${idx}`}
                            className="p-3 rounded-lg bg-cream border border-creamDark"
                          >
                            <div className="flex items-start gap-3">
                              {product.images?.[0] && (
                                <img
                                  src={product.images[0].url}
                                  alt=""
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              <div className="flex-1">
                                <div className="font-semibold text-textDark mb-1">{product.title}</div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {catProduct.planet && <Chip>{catProduct.planet}</Chip>}
                                  {catProduct.mukhi && <Chip>{catProduct.mukhi} Mukhi</Chip>}
                                  {catProduct.bead && <Chip>{catProduct.bead}</Chip>}
                                  {catProduct.rudraksha && <Chip>{catProduct.rudraksha}</Chip>}
                                  {catProduct.afflictionScore && (
                                    <Chip>Score: {catProduct.afflictionScore.toFixed(2)}</Chip>
                                  )}
                                </div>
                                <div className="text-sm text-textMedium mb-2">
                                  {product.metafields?.short_description || ""}
                                </div>
                                {catProduct.why && (
                                  <div className="text-xs text-textLight mb-2 line-clamp-2">
                                    {catProduct.why.replace(/\*\*/g, "").substring(0, 150)}...
                                  </div>
                                )}
                                <PrimaryButton
                                  onClick={() => addProductToRecommendations(catProduct)}
                                  disabled={isAlreadyAdded}
                                  className="mt-2"
                                >
                                  {isAlreadyAdded ? "Already Added" : "Add to Recommendations"}
                                </PrimaryButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Recommendations */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading text-textDark">Selected Recommendations ({items.length})</h2>
            <div className="flex gap-2">
              <GhostButton onClick={() => setShowAddProduct(!showAddProduct)}>
                {showAddProduct ? "Cancel" : "+ Add Product (JSON)"}
              </GhostButton>
              <PrimaryButton onClick={addItem}>+ Add Manual</PrimaryButton>
            </div>
          </div>

          {showAddProduct && (
            <div className="mb-4 p-4 rounded-xl bg-cream border-2 border-creamDark">
              <Field label="Paste Full Shopify Product JSON">
                <textarea
                  value={newProductJson}
                  onChange={(e) => setNewProductJson(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl border-2 border-creamDark bg-white px-4 py-3 text-sm font-mono text-textDark outline-none focus:border-gold"
                  placeholder='{"id": "...", "title": "...", "variants": [...], ...}'
                />
              </Field>
              <PrimaryButton onClick={addProductFromJson} className="mt-2">
                Add Product
              </PrimaryButton>
            </div>
          )}

          <div className="space-y-3">
            {/* Regular Products */}
            {items
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => !item.isAccessory && !item.isPooja)
              .map(({ item, index }) => (
              <div key={index} className="rounded-lg border-2 border-creamDark bg-white p-3">
                <div className="flex items-start gap-3 mb-3">
                  {item.productDetails?.images?.[0] && (
                    <img
                      src={item.productDetails.images[0].url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-sm text-textDark line-clamp-2">
                        {item.productDetails?.title || item.reason}
                      </div>
                      <select
                        value={item.priority}
                        onChange={(e) => updateItem(index, { priority: Number(e.target.value) })}
                        className="text-xs rounded-lg border border-creamDark bg-white px-2 py-1 text-textDark outline-none focus:border-gold flex-shrink-0"
                      >
                        <option value={1}>P1</option>
                        <option value={2}>P2</option>
                        <option value={3}>P3</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      {item.category && <Chip className="text-xs">{item.category}</Chip>}
                      {item.planet && <Chip className="text-xs">{item.planet}</Chip>}
                      {item.mukhi && <Chip className="text-xs">{item.mukhi}M</Chip>}
                    </div>
                  </div>
                </div>

                {item.productDetails?.variants && item.productDetails.variants.length > 0 && !item.isAccessory && !item.isPooja && (
                  <div className="mb-3">
                    <VariantSelector
                      variants={item.productDetails.variants}
                      selectedVariantId={item.selectedVariantId || item.productDetails.variants[0].id}
                      onSelect={(variantId) => updateItem(index, { selectedVariantId: variantId })}
                      quantity={item.quantity || 1}
                      onQuantityChange={(qty) => updateItem(index, { quantity: qty })}
                    />
                  </div>
                )}

                {/* Quantity for accessories and poojas */}
                {(item.isAccessory || item.isPooja) && (
                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-xs font-semibold text-textDark">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-16 rounded-lg border-2 border-creamDark bg-white px-2 py-1 text-sm text-textDark outline-none focus:border-gold"
                    />
                    <span className="text-xs text-textMedium">
                      ₹{(() => {
                        const variantId = item.mappedShopifyVariantId || "";
                        const numericId = /^\d+$/.test(variantId) ? variantId : variantId.match(/(\d+)$/)?.[1] || variantId;
                        const price = accessoryPoojaPrices[numericId] || accessoryPoojaPrices[variantId] || 0;
                        return price;
                      })()} each
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={item.reason}
                    onChange={(e) => updateItem(index, { reason: e.target.value })}
                    placeholder="Reason/Product Name"
                    className="flex-1 text-xs rounded-lg border-2 border-creamDark bg-white px-2 py-1.5 text-textDark outline-none focus:border-gold"
                  />
                  <GhostButton
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== index))}
                    className="text-xs px-2 py-1"
                  >
                    Remove
                  </GhostButton>
                </div>
              </div>
            ))}

            {/* Accessories and Poojas in the list */}
            {items
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item.isAccessory || item.isPooja)
              .map(({ item, index }) => (
                <div key={index} className="rounded-lg border-2 border-creamDark bg-white p-3">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold text-sm text-textDark line-clamp-2">
                          {item.reason}
                        </div>
                        <select
                          value={item.priority}
                          onChange={(e) => updateItem(index, { priority: Number(e.target.value) })}
                          className="text-xs rounded-lg border border-creamDark bg-white px-2 py-1 text-textDark outline-none focus:border-gold flex-shrink-0"
                        >
                          <option value={1}>P1</option>
                          <option value={2}>P2</option>
                          <option value={3}>P3</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap mb-1">
                        {item.isAccessory && <Chip className="text-xs">Accessory</Chip>}
                        {item.isPooja && <Chip className="text-xs">Pooja</Chip>}
                      </div>
                    </div>
                  </div>

                  {/* Quantity for accessories and poojas */}
                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-xs font-semibold text-textDark">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-16 rounded-lg border-2 border-creamDark bg-white px-2 py-1 text-sm text-textDark outline-none focus:border-gold"
                    />
                    <span className="text-xs text-textMedium">
                      ₹{(() => {
                        const variantId = item.mappedShopifyVariantId || "";
                        const numericId = /^\d+$/.test(variantId) ? variantId : variantId.match(/(\d+)$/)?.[1] || variantId;
                        const price = accessoryPoojaPrices[numericId] || accessoryPoojaPrices[variantId] || 0;
                        return price;
                      })()} each
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={item.reason}
                      onChange={(e) => updateItem(index, { reason: e.target.value })}
                      placeholder="Reason/Product Name"
                      className="flex-1 text-xs rounded-lg border-2 border-creamDark bg-white px-2 py-1.5 text-textDark outline-none focus:border-gold"
                    />
                    <GhostButton
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== index))}
                      className="text-xs px-2 py-1"
                    >
                      Remove
                    </GhostButton>
                  </div>
                </div>
              ))}

            {items.length === 0 && (
              <p className="text-body text-textLight text-center py-8">
                {Object.keys(categorizedProducts).length > 0
                  ? "Select products from categories above to add them to recommendations."
                  : "Generate the astrology report to see available products, or add manually."}
              </p>
            )}
          </div>

          {/* Search Products from Shopify */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-heading text-textDark">Search Products from Shopify</h3>
              <GhostButton onClick={() => setShowProductSearch(!showProductSearch)}>
                {showProductSearch ? "Hide Search" : "Search Products"}
              </GhostButton>
            </div>
            
            {showProductSearch && (
              <div className="rounded-lg border-2 border-creamDark bg-white p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    value={searchQuery}
                    onChange={(v) => setSearchQuery(v)}
                    placeholder="Search products by name or description..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        handleSearchProducts();
                      }
                    }}
                  />
                  <PrimaryButton onClick={handleSearchProducts} disabled={searching || !searchQuery.trim()}>
                    {searching ? "Searching..." : "Search"}
                  </PrimaryButton>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((product) => (
                      <div
                        key={product.id}
                        className="p-3 rounded-lg border border-creamDark bg-cream hover:bg-creamDark transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {product.images && product.images.length > 0 && (
                            <img
                              src={product.images[0].url}
                              alt={product.images[0].altText || product.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-textDark mb-1">{product.title}</div>
                            {product.description && (
                              <div className="text-xs text-textMedium mb-2 line-clamp-2">
                                {product.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {product.variants.map((variant: any) => (
                                <PrimaryButton
                                  key={variant.id}
                                  onClick={() => addProductFromSearch(product, variant)}
                                  className="text-xs px-2 py-1"
                                  disabled={!variant.availableForSale}
                                >
                                  {variant.title} - ₹{variant.price}
                                  {!variant.availableForSale && " (Out of Stock)"}
                                </PrimaryButton>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-body text-textLight text-center py-4">No products found</p>
                )}
              </div>
            )}
          </div>

          {/* Add Accessories and Pooja Section */}
          <div className="mt-6 space-y-4">
            {/* Accessories */}
            <div className="rounded-lg border-2 border-creamDark bg-white p-4">
              <h3 className="text-heading text-textDark mb-3">Accessories (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACCESSORIES.map((accessory) => {
                  const existingItem = items.find(
                    (item) => item.isAccessory && item.mappedShopifyVariantId === accessory.variantId
                  );
                  return (
                    <div
                      key={accessory.variantId}
                      className="flex items-center justify-between p-2 rounded-lg border border-creamDark bg-cream"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-textDark">{accessory.name}</div>
                        <div className="text-xs text-textMedium">₹{accessory.cost} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {existingItem && (
                          <span className="text-xs text-textMedium">Qty: {existingItem.quantity || 1}</span>
                        )}
                        <PrimaryButton
                          onClick={() => addAccessory(accessory)}
                          className="text-xs px-3 py-1"
                        >
                          {existingItem ? "Add More" : "Add"}
                        </PrimaryButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pooja/Energization */}
            <div className="rounded-lg border-2 border-creamDark bg-white p-4">
              <h3 className="text-heading text-textDark mb-3">Pooja / Energization (Optional)</h3>
              <div className="grid grid-cols-1 gap-2">
                {POOJAS.map((pooja) => {
                  const existingItem = items.find(
                    (item) => item.isPooja && item.mappedShopifyVariantId === pooja.variantId
                  );
                  return (
                    <div
                      key={pooja.variantId}
                      className="flex items-center justify-between p-2 rounded-lg border border-creamDark bg-cream"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-textDark">{pooja.name}</div>
                        <div className="text-xs text-textMedium">₹{pooja.cost} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {existingItem && (
                          <span className="text-xs text-textMedium">Qty: {existingItem.quantity || 1}</span>
                        )}
                        <PrimaryButton
                          onClick={() => addPooja(pooja)}
                          className="text-xs px-3 py-1"
                        >
                          {existingItem ? "Add More" : "Add"}
                        </PrimaryButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Total Amount and Checkout Link Summary */}
          {items.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-gold/5 border-2 border-gold">
              <h3 className="text-heading text-textDark mb-3">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-body text-textMedium">Total Items:</span>
                  <span className="text-body font-semibold text-textDark">
                    {items.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body text-textMedium">Total Amount:</span>
                  <span className="text-heading font-bold text-gold">
                    ₹{calculateTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {generateCombinedCheckoutLink() && (
                  <div className="pt-3 border-t border-gold/20">
                    <div className="text-sm text-textMedium mb-2">Combined Checkout Link:</div>
                    <div className="p-2 rounded-lg bg-white border border-gold/30">
                      <a
                        href={generateCombinedCheckoutLink() || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gold hover:underline break-all"
                      >
                        {generateCombinedCheckoutLink()}
                      </a>
                    </div>
                    <p className="text-xs text-textLight mt-2">
                      This link will add all selected products to cart with their quantities.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Discount Section */}
        <SectionCard>
          <h3 className="text-heading text-textDark mb-3">Discount (Optional)</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={discountType === "PERCENTAGE"}
                  onChange={() => setDiscountType("PERCENTAGE")}
                  className="text-gold"
                />
                <span className="text-sm text-textDark">Percentage</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={discountType === "FIXED_AMOUNT"}
                  onChange={() => setDiscountType("FIXED_AMOUNT")}
                  className="text-gold"
                />
                <span className="text-sm text-textDark">Fixed Amount (INR)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={discountType === null}
                  onChange={() => {
                    setDiscountType(null);
                    setDiscountValue("");
                    setDiscountTitle("");
                  }}
                  className="text-gold"
                />
                <span className="text-sm text-textDark">No Discount</span>
              </label>
            </div>
            {discountType && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(v) => setDiscountValue(v)}
                    placeholder={discountType === "PERCENTAGE" ? "10" : "100"}
                    className="w-32"
                  />
                  <span className="text-sm text-textMedium">
                    {discountType === "PERCENTAGE" ? "%" : "INR"}
                  </span>
                </div>
                <Input
                  value={discountTitle}
                  onChange={(v) => setDiscountTitle(v)}
                  placeholder="Discount title (optional)"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </SectionCard>

        <div className="flex gap-3">
          <PrimaryButton onClick={handleSave} disabled={loading || items.length === 0}>
            {loading ? "Saving..." : "💾 Lock Recommendations"}
          </PrimaryButton>
          <PrimaryButton onClick={handleCreateDraftOrder} disabled={loading || items.length === 0}>
            {loading ? "Creating..." : "🛒 Create Draft Order & Checkout Link"}
          </PrimaryButton>
          <GhostButton onClick={() => navigate(-1)}>Cancel</GhostButton>
        </div>

        {draftOrderDetails && (
          <SectionCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-heading text-textDark">Draft Order Details</h3>
                <Chip className="bg-green-100 text-green-700">Created</Chip>
              </div>
              
              <div className="p-4 rounded-lg bg-cream border border-creamDark">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-textMedium">Order Name:</span>
                    <span className="text-sm font-semibold text-textDark">{draftOrderDetails.name || "N/A"}</span>
                  </div>
                  
                  {draftOrderDetails.lineItems && draftOrderDetails.lineItems.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-textDark mb-2">Line Items:</p>
                      <div className="space-y-2">
                        {draftOrderDetails.lineItems.map((item: any, idx: number) => (
                          <div key={idx} className="p-2 bg-white rounded border border-creamDark">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-textDark">{item.title}</p>
                                {item.variant?.title && (
                                  <p className="text-xs text-textMedium">{item.variant.title}</p>
                                )}
                                <p className="text-xs text-textLight">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                {item.discountedUnitPrice ? (
                                  <div>
                                    <p className="text-sm font-semibold text-textDark">₹{parseFloat(item.discountedUnitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    {item.originalUnitPrice && parseFloat(item.originalUnitPrice) !== parseFloat(item.discountedUnitPrice) && (
                                      <p className="text-xs text-textLight line-through">₹{parseFloat(item.originalUnitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm font-semibold text-textDark">₹{parseFloat(item.variant?.price || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {draftOrderDetails.appliedDiscount && (
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-green-700">
                          Discount: {draftOrderDetails.appliedDiscount.description || "Discount"}
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          {draftOrderDetails.appliedDiscount.valueType === "PERCENTAGE" 
                            ? `${draftOrderDetails.appliedDiscount.value}%`
                            : `₹${(typeof draftOrderDetails.appliedDiscount.value === 'number' ? draftOrderDetails.appliedDiscount.value : parseFloat(draftOrderDetails.appliedDiscount.value || "0")).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>
                      {draftOrderDetails.appliedDiscount.amount && (
                        <p className="text-xs text-green-600 mt-1">
                          Amount: ₹{parseFloat(draftOrderDetails.appliedDiscount.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-creamDark space-y-2">
                    {draftOrderDetails.subtotalPrice && (
                      <div className="flex justify-between text-sm">
                        <span className="text-textMedium">Subtotal:</span>
                        <span className="text-textDark">₹{parseFloat(draftOrderDetails.subtotalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {draftOrderDetails.totalTax && parseFloat(draftOrderDetails.totalTax) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-textMedium">Tax:</span>
                        <span className="text-textDark">₹{parseFloat(draftOrderDetails.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {draftOrderDetails.totalPrice && (
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-creamDark">
                        <span className="text-textDark">Total:</span>
                        <span className="text-gold">₹{parseFloat(draftOrderDetails.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <PrimaryButton
                  onClick={async () => {
                    if (!draftOrderDetails.draftOrderId) return;
                    setSendingInvoice(true);
                    try {
                      // Send draft order ID in request body to avoid URL encoding issues
                      await api.post(`/draft-orders/send-invoice`, {
                        draftOrderId: draftOrderDetails.draftOrderId,
                      });
                      alert("Invoice email sent successfully to customer!");
                    } catch (err: any) {
                      alert(err.response?.data?.error || "Failed to send invoice email");
                    } finally {
                      setSendingInvoice(false);
                    }
                  }}
                  disabled={sendingInvoice}
                  className="flex-1"
                >
                  {sendingInvoice ? "Sending..." : "📧 Send Invoice Email"}
                </PrimaryButton>
                <GhostButton
                  onClick={() => {
                    if (draftOrderUrl) {
                      window.open(draftOrderUrl, '_blank');
                    }
                  }}
                >
                  Open Checkout Link
                </GhostButton>
              </div>

              {draftOrderUrl && (
                <div className="p-3 rounded-lg bg-gold/5 border border-gold/30">
                  <p className="text-xs text-textMedium mb-1">Checkout Link:</p>
                  <a
                    href={draftOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gold hover:underline break-all block"
                  >
                    {draftOrderUrl}
                  </a>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Order History Slide-in Panel */}
        {showOrderHistory && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/30 z-40 transition-opacity"
              onClick={() => setShowOrderHistory(false)}
            />
            {/* Slide-in Panel */}
            <div
              className={`fixed top-0 right-0 h-full w-full md:w-1/2 lg:w-2/5 bg-cream z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
                showOrderHistory ? "translate-x-0" : "translate-x-full"
              } overflow-y-auto`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-creamDark">
                  <h2 className="text-heading text-textDark">Order History</h2>
                  <button
                    onClick={() => setShowOrderHistory(false)}
                    className="p-2 rounded-lg hover:bg-creamDark transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6 text-textDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {orderHistory ? (
                  <>
                    <div className="mb-4 pb-4 border-b border-creamDark">
                      <p className="text-sm font-semibold text-textDark mb-1">{orderHistory.visitor?.name}</p>
                      <p className="text-xs text-textMedium">{orderHistory.visitor?.email}</p>
                    </div>

                    {/* Shopify Orders */}
                    {orderHistory.shopifyOrders && orderHistory.shopifyOrders.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-heading text-textDark mb-3">Shopify Orders</h3>
                        <div className="space-y-3">
                          {orderHistory.shopifyOrders.map((order: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-lg border border-creamDark bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-textDark">{order.name}</p>
                                  <p className="text-xs text-textMedium">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-textDark">${order.totalPrice}</p>
                                  <Chip className="text-xs mt-1">
                                    {order.financialStatus} / {order.fulfillmentStatus}
                                  </Chip>
                                </div>
                              </div>
                              {order.lineItems?.edges && (
                                <div className="mt-2 space-y-1">
                                  {order.lineItems.edges.map((edge: any, itemIdx: number) => (
                                    <div key={itemIdx} className="text-sm text-textMedium">
                                      • {edge.node.title} (Qty: {edge.node.quantity})
                                      {edge.node.variant?.price && ` - ₹${edge.node.variant.price}`}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Local Orders */}
                    {orderHistory.localOrders && orderHistory.localOrders.length > 0 && (
                      <div>
                        <h3 className="text-heading text-textDark mb-3">Event Orders</h3>
                        <div className="space-y-3">
                          {orderHistory.localOrders.map((order: any) => (
                            <div key={order.id} className="p-4 rounded-lg border border-creamDark bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-semibold text-textDark">{order.orderNumber || order.id}</p>
                                  <p className="text-xs text-textMedium">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-textDark">
                                    {order.totalAmount ? `$${order.totalAmount}` : "N/A"}
                                  </p>
                                  <Chip className="text-xs mt-1">
                                    {order.paymentStatus} / {order.orderStatus}
                                  </Chip>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!orderHistory.shopifyOrders || orderHistory.shopifyOrders.length === 0) &&
                      (!orderHistory.localOrders || orderHistory.localOrders.length === 0) && (
                        <div className="text-center py-12">
                          <p className="text-body text-textLight">No order history found.</p>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-body text-textLight">Loading order history...</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
