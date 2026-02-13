/**
 * Shopify API Integration
 * Handles order history fetching and draft order creation
 */

// Helper function to get Shopify configuration (loads env vars lazily)
function getShopifyConfig() {
  // Support multiple environment variable naming conventions
  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE || "";
  // Extract store name from domain if full domain is provided (e.g., "nepalirudrakshalive.myshopify.com" -> "nepalirudrakshalive")
  const SHOPIFY_STORE = SHOPIFY_STORE_DOMAIN.includes(".")
    ? SHOPIFY_STORE_DOMAIN.split(".")[0]
    : SHOPIFY_STORE_DOMAIN;

  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";
  const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-01";

  // Use custom GraphQL endpoint if provided, otherwise construct from store name
  let SHOPIFY_GRAPHQL_ENDPOINT_FINAL = process.env.SHOPIFY_GRAPHQL_ENDPOINT;
  // Fix endpoint URL if it's missing /admin/ path
  if (SHOPIFY_GRAPHQL_ENDPOINT_FINAL && !SHOPIFY_GRAPHQL_ENDPOINT_FINAL.includes("/admin/")) {
    SHOPIFY_GRAPHQL_ENDPOINT_FINAL = SHOPIFY_GRAPHQL_ENDPOINT_FINAL.replace("/api/", "/admin/api/");
    console.log("Fixed Shopify GraphQL endpoint URL:", SHOPIFY_GRAPHQL_ENDPOINT_FINAL);
  }
  const SHOPIFY_GRAPHQL_ENDPOINT = SHOPIFY_GRAPHQL_ENDPOINT_FINAL;
  const SHOPIFY_API_URL = SHOPIFY_GRAPHQL_ENDPOINT
    ? SHOPIFY_GRAPHQL_ENDPOINT.replace("/graphql.json", "")
    : `https://${SHOPIFY_STORE}.myshopify.com/admin/api/${SHOPIFY_API_VERSION}`;

  return {
    SHOPIFY_STORE,
    SHOPIFY_ACCESS_TOKEN,
    SHOPIFY_API_VERSION,
    SHOPIFY_GRAPHQL_ENDPOINT,
    SHOPIFY_API_URL,
  };
}

// Helper function to get Shopify Storefront API configuration
function getShopifyStorefrontConfig() {
  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE || "";
  const SHOPIFY_STORE = SHOPIFY_STORE_DOMAIN.includes(".")
    ? SHOPIFY_STORE_DOMAIN.split(".")[0]
    : SHOPIFY_STORE_DOMAIN;

  const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || "";
  const SHOPIFY_STOREFRONT_API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2024-01";
  
  // Storefront API endpoint (no /admin/ in the path)
  const SHOPIFY_STOREFRONT_ENDPOINT = `https://${SHOPIFY_STORE}.myshopify.com/api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`;

  return {
    SHOPIFY_STORE,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    SHOPIFY_STOREFRONT_API_VERSION,
    SHOPIFY_STOREFRONT_ENDPOINT,
  };
}

interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: string;
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        variant: {
          id: string;
          title: string;
          price: string;
        };
      };
    }>;
  };
}

interface ShopifyDraftOrder {
  id: string;
  name: string;
  invoiceUrl: string;
  lineItems: {
    edges: Array<{
      node: {
        variantId: string;
        quantity: number;
        customAttributes?: Array<{ key: string; value: string }>;
      };
    }>;
  };
}

/**
 * Fetch orders from Shopify by customer email
 */
export async function fetchShopifyOrdersByEmail(email: string): Promise<ShopifyOrder[]> {
  const config = getShopifyConfig();
  const { SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_GRAPHQL_ENDPOINT, SHOPIFY_API_URL } = config;
  
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    console.warn("Shopify credentials not configured", {
      hasStore: !!SHOPIFY_STORE,
      hasToken: !!SHOPIFY_ACCESS_TOKEN,
      store: SHOPIFY_STORE,
      envVars: {
        SHOPIFY_STORE: !!process.env.SHOPIFY_STORE,
        SHOPIFY_STORE_DOMAIN: !!process.env.SHOPIFY_STORE_DOMAIN,
        SHOPIFY_ACCESS_TOKEN: !!process.env.SHOPIFY_ACCESS_TOKEN,
        SHOPIFY_ADMIN_ACCESS_TOKEN: !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        SHOPIFY_GRAPHQL_ENDPOINT: !!process.env.SHOPIFY_GRAPHQL_ENDPOINT,
      },
    });
    return [];
  }

  try {
    const query = `
      query GetOrdersByEmail($email: String!) {
        orders(first: 50, query: $email, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              email
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      id
                      title
                      price
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      email: `email:${email}`,
    };

    const graphqlUrl = SHOPIFY_GRAPHQL_ENDPOINT || `${SHOPIFY_API_URL}/graphql.json`;
    
    console.log("Shopify API Request:", {
      url: graphqlUrl,
      hasToken: !!SHOPIFY_ACCESS_TOKEN,
      tokenLength: SHOPIFY_ACCESS_TOKEN?.length || 0,
      tokenPreview: SHOPIFY_ACCESS_TOKEN ? `${SHOPIFY_ACCESS_TOKEN.substring(0, 10)}...` : "none",
      email: email,
      usingGraphQLEndpoint: !!SHOPIFY_GRAPHQL_ENDPOINT,
    });
    
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: graphqlUrl,
      });
      throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors:", JSON.stringify(data.errors, null, 2));
      return [];
    }

    return data.data?.orders?.edges?.map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name,
      email: edge.node.email,
      createdAt: edge.node.createdAt,
      financialStatus: edge.node.displayFinancialStatus || "UNKNOWN",
      fulfillmentStatus: edge.node.displayFulfillmentStatus || "UNFULFILLED",
      totalPrice: edge.node.totalPriceSet?.shopMoney?.amount || "0",
      lineItems: edge.node.lineItems,
    })) || [];
  } catch (error) {
    console.error("Error fetching Shopify orders:", error);
    return [];
  }
}

/**
 * Create a draft order in Shopify
 */
export async function createShopifyDraftOrder(
  email: string,
  lineItems: Array<{
    variantId: string;
    quantity: number;
    customAttributes?: Array<{ key: string; value: string }>;
  }>,
  note?: string,
  discount?: {
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    title?: string;
  }
): Promise<{ draftOrderId: string; checkoutUrl: string } | null> {
  const config = getShopifyConfig();
  const { SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_GRAPHQL_ENDPOINT, SHOPIFY_API_URL } = config;
  
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  try {
    const mutation = `
      mutation DraftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            invoiceUrl
            presentmentCurrencyCode
            subtotalPrice
            totalPrice
            totalTax
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
              presentmentMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
              presentmentMoney {
                amount
                currencyCode
              }
            }
            totalTaxSet {
              shopMoney {
                amount
                currencyCode
              }
              presentmentMoney {
                amount
                currencyCode
              }
            }
            appliedDiscount {
              description
              value
              valueType
              amount
              amountSet {
                shopMoney {
                  amount
                  currencyCode
                }
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  variant {
                    id
                    title
                    price
                  }
                  quantity
                  originalUnitPrice
                  discountedUnitPrice
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                    presentmentMoney {
                      amount
                      currencyCode
                    }
                  }
                  discountedUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                    presentmentMoney {
                      amount
                      currencyCode
                    }
                  }
                  customAttributes {
                    key
                    value
                  }
                }
              }
            }
            customer {
              id
              email
              firstName
              lastName
            }
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input: any = {
      email,
      lineItems: lineItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        customAttributes: item.customAttributes || [],
      })),
      note: note || "Created from Expert Consultation",
      // Set presentment currency to INR
      presentmentCurrencyCode: "INR",
      // Set shipping address with India to ensure INR currency
      shippingAddress: {
        country: "India",
        countryCode: "IN",
        province: "",
        city: "",
        address1: "",
        zip: "",
      },
    };

    // Add discount if provided
    if (discount) {
      if (discount.type === "PERCENTAGE") {
        input.appliedDiscount = {
          description: discount.title || "Discount",
          value: discount.value,
          valueType: "PERCENTAGE",
        };
      } else if (discount.type === "FIXED_AMOUNT") {
        input.appliedDiscount = {
          description: discount.title || "Discount",
          value: discount.value,
          valueType: "FIXED_AMOUNT",
        };
      }
    }

    const variables = { input };

    const graphqlUrl = SHOPIFY_GRAPHQL_ENDPOINT || `${SHOPIFY_API_URL}/graphql.json`;
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors:", data.errors);
      throw new Error(data.errors[0]?.message || "Failed to create draft order");
    }

    if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      const errors = data.data.draftOrderCreate.userErrors;
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    const draftOrder = data.data?.draftOrderCreate?.draftOrder;
    if (!draftOrder) {
      throw new Error("No draft order returned from Shopify");
    }

    // Use presentment money (INR) if available, otherwise fall back to shop money
    const getPresentmentAmount = (priceSet: any) => {
      if (priceSet?.presentmentMoney?.amount) {
        return priceSet.presentmentMoney.amount;
      }
      return priceSet?.shopMoney?.amount || "0";
    };

    return {
      draftOrderId: draftOrder.id,
      checkoutUrl: draftOrder.invoiceUrl,
      name: draftOrder.name,
      presentmentCurrencyCode: draftOrder.presentmentCurrencyCode || "INR",
      subtotalPrice: getPresentmentAmount(draftOrder.subtotalPriceSet),
      totalPrice: getPresentmentAmount(draftOrder.totalPriceSet),
      totalTax: getPresentmentAmount(draftOrder.totalTaxSet),
      appliedDiscount: draftOrder.appliedDiscount ? {
        description: draftOrder.appliedDiscount.description,
        value: draftOrder.appliedDiscount.value,
        valueType: draftOrder.appliedDiscount.valueType,
        amount: getPresentmentAmount(draftOrder.appliedDiscount.amountSet),
      } : null,
      lineItems: draftOrder.lineItems.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        variant: edge.node.variant,
        quantity: edge.node.quantity,
        originalUnitPrice: getPresentmentAmount(edge.node.originalUnitPriceSet),
        discountedUnitPrice: getPresentmentAmount(edge.node.discountedUnitPriceSet),
        customAttributes: edge.node.customAttributes,
      })),
      customer: draftOrder.customer,
      createdAt: draftOrder.createdAt,
      updatedAt: draftOrder.updatedAt,
    };
  } catch (error) {
    console.error("Error creating Shopify draft order:", error);
    throw error;
  }
}

/**
 * Fetch product from Shopify by product ID
 */
export async function fetchShopifyProduct(productId: string): Promise<{ description: string; title: string; handle: string } | null> {
  const config = getShopifyConfig();
  const { SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_GRAPHQL_ENDPOINT, SHOPIFY_API_URL } = config;
  
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    console.warn("Shopify credentials not configured");
    return null;
  }

  try {
    // Normalize product ID - handle both GID format and numeric ID
    let normalizedProductId = productId.trim();
    if (!normalizedProductId.startsWith("gid://")) {
      // If it's just a number, convert to GID format
      if (/^\d+$/.test(normalizedProductId)) {
        normalizedProductId = `gid://shopify/Product/${normalizedProductId}`;
      } else {
        // Try to extract from partial GID
        const match = normalizedProductId.match(/(\d+)$/);
        if (match) {
          normalizedProductId = `gid://shopify/Product/${match[1]}`;
        }
      }
    }

    const query = `
      query GetProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          handle
        }
      }
    `;

    const variables = { id: normalizedProductId };

    const graphqlUrl = SHOPIFY_GRAPHQL_ENDPOINT || `${SHOPIFY_API_URL}/graphql.json`;
    
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error fetching product:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return null;
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors fetching product:", JSON.stringify(data.errors, null, 2));
      return null;
    }

    const product = data.data?.product;
    if (!product) {
      return null;
    }

    return {
      description: product.description || "",
      title: product.title || "",
      handle: product.handle || "",
    };
  } catch (error) {
    console.error("Error fetching Shopify product:", error);
    return null;
  }
}

/**
 * Search products in Shopify using Storefront API (for INR currency support)
 */
export async function searchShopifyProducts(query: string, limit: number = 20): Promise<Array<{
  id: string;
  title: string;
  handle: string;
  description: string;
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    availableForSale: boolean;
  }>;
}>> {
  const storefrontConfig = getShopifyStorefrontConfig();
  const { SHOPIFY_STORE, SHOPIFY_STOREFRONT_ACCESS_TOKEN, SHOPIFY_STOREFRONT_ENDPOINT } = storefrontConfig;
  
  // Fallback to Admin API if Storefront token not configured
  if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    console.warn("Shopify Storefront API token not configured, falling back to Admin API");
    const adminConfig = getShopifyConfig();
    if (!adminConfig.SHOPIFY_STORE || !adminConfig.SHOPIFY_ACCESS_TOKEN) {
      console.warn("Shopify credentials not configured");
      return [];
    }
    // Use Admin API as fallback (without currency context)
    return searchShopifyProductsAdmin(query, limit);
  }

  try {
    const searchQuery = `
      query SearchProductsInINR($query: String!, $first: Int!) @inContext(country: IN) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 3) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Storefront API query syntax: supports title, vendor, product_type, tag, etc.
    const variables = {
      query: `title:*${query}* OR description:*${query}*`,
      first: limit,
    };
    
    const response = await fetch(SHOPIFY_STOREFRONT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: searchQuery, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify Storefront API error searching products:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return [];
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors searching products:", JSON.stringify(data.errors, null, 2));
      return [];
    }

    const products = data.data?.products?.edges || [];
    return products.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      description: edge.node.description || "",
      images: edge.node.images.edges.map((img: any) => ({
        url: img.node.url,
        altText: img.node.altText,
      })),
      variants: edge.node.variants.edges.map((v: any) => ({
        id: v.node.id,
        title: v.node.title,
        price: v.node.price?.amount || "0",
        availableForSale: v.node.availableForSale,
      })),
    }));
  } catch (error) {
    console.error("Error searching Shopify products:", error);
    return [];
  }
}

/**
 * Fallback: Search products using Admin API (without currency context)
 */
async function searchShopifyProductsAdmin(query: string, limit: number = 20): Promise<Array<{
  id: string;
  title: string;
  handle: string;
  description: string;
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    availableForSale: boolean;
  }>;
}>> {
  const config = getShopifyConfig();
  const { SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_GRAPHQL_ENDPOINT, SHOPIFY_API_URL } = config;

  try {
    const searchQuery = `
      query SearchProducts($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 3) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      query: `title:*${query}* OR description:*${query}*`,
      first: limit,
    };

    const graphqlUrl = SHOPIFY_GRAPHQL_ENDPOINT || `${SHOPIFY_API_URL}/graphql.json`;
    
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: searchQuery, variables }),
    });

    if (!response.ok) {
      console.error("Shopify API error searching products:", response.statusText);
      return [];
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors searching products:", JSON.stringify(data.errors, null, 2));
      return [];
    }

    const products = data.data?.products?.edges || [];
    return products.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      description: edge.node.description || "",
      images: edge.node.images.edges.map((img: any) => ({
        url: img.node.url,
        altText: img.node.altText,
      })),
      variants: edge.node.variants.edges.map((v: any) => ({
        id: v.node.id,
        title: v.node.title,
        price: v.node.price,
        availableForSale: v.node.availableForSale,
      })),
    }));
  } catch (error) {
    console.error("Error searching Shopify products (Admin API fallback):", error);
    return [];
  }
}

/**
 * Fetch variant prices in INR from Shopify Storefront API
 */
export async function fetchVariantPricesInINR(variantIds: string[]): Promise<Record<string, number>> {
  const storefrontConfig = getShopifyStorefrontConfig();
  const { SHOPIFY_STOREFRONT_ACCESS_TOKEN, SHOPIFY_STOREFRONT_ENDPOINT } = storefrontConfig;
  
  if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN || variantIds.length === 0) {
    return {};
  }

  try {
    // Convert numeric IDs to GID format if needed
    const normalizedIds = variantIds.map((id) => {
      if (/^\d+$/.test(id)) {
        return `gid://shopify/ProductVariant/${id}`;
      }
      if (!id.startsWith("gid://")) {
        const match = id.match(/(\d+)$/);
        if (match) {
          return `gid://shopify/ProductVariant/${match[1]}`;
        }
      }
      return id;
    });

    // Fetch prices for all variants in one query
    const query = `
      query GetVariantPricesInINR($ids: [ID!]!) @inContext(country: IN) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const variables = { ids: normalizedIds };
    
    const response = await fetch(SHOPIFY_STOREFRONT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      console.error("Shopify Storefront API error fetching variant prices:", response.statusText);
      return {};
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors fetching variant prices:", JSON.stringify(data.errors, null, 2));
      return {};
    }

    const prices: Record<string, number> = {};
    const nodes = data.data?.nodes || [];
    
    nodes.forEach((node: any) => {
      if (node && node.price) {
        // Extract numeric ID from GID for lookup
        const match = node.id.match(/(\d+)$/);
        if (match) {
          const numericId = match[1];
          prices[numericId] = parseFloat(node.price.amount || "0");
          // Also store with GID format
          prices[node.id] = parseFloat(node.price.amount || "0");
        }
      }
    });

    return prices;
  } catch (error) {
    console.error("Error fetching variant prices:", error);
    return {};
  }
}

/**
 * Send invoice email for a draft order
 */
export async function sendDraftOrderInvoice(draftOrderId: string): Promise<boolean> {
  const config = getShopifyConfig();
  const { SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_GRAPHQL_ENDPOINT, SHOPIFY_API_URL } = config;
  
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  try {
    const mutation = `
      mutation DraftOrderInvoiceSend($id: ID!, $email: EmailInput) {
        draftOrderInvoiceSend(id: $id, email: $email) {
          draftOrder {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = { 
      id: draftOrderId,
      email: null // null means use customer email from draft order
    };

    const graphqlUrl = SHOPIFY_GRAPHQL_ENDPOINT || `${SHOPIFY_API_URL}/graphql.json`;
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors:", data.errors);
      throw new Error(data.errors[0]?.message || "Failed to send invoice");
    }

    if (data.data?.draftOrderInvoiceSend?.userErrors?.length > 0) {
      const errors = data.data.draftOrderInvoiceSend.userErrors;
      throw new Error(errors.map((e: any) => e.message).join(", "));
    }

    return true;
  } catch (error) {
    console.error("Error sending draft order invoice:", error);
    throw error;
  }
}

/**
 * Get draft order by ID
 */
export async function getShopifyDraftOrder(draftOrderId: string): Promise<ShopifyDraftOrder | null> {
  const config = getShopifyConfig();
  const { SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN, SHOPIFY_GRAPHQL_ENDPOINT, SHOPIFY_API_URL } = config;
  
  if (!SHOPIFY_STORE || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Shopify credentials not configured");
  }

  try {
    const query = `
      query GetDraftOrder($id: ID!) {
        draftOrder(id: $id) {
          id
          name
          invoiceUrl
          lineItems(first: 50) {
            edges {
              node {
                variant {
                  id
                }
                quantity
              }
            }
          }
        }
      }
    `;

    const variables = { id: draftOrderId };

    const graphqlUrl = SHOPIFY_GRAPHQL_ENDPOINT || `${SHOPIFY_API_URL}/graphql.json`;
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify GraphQL errors:", data.errors);
      return null;
    }

    const draftOrder = data.data?.draftOrder;
    if (!draftOrder) {
      return null;
    }

    // Use presentment money (INR) if available, otherwise fall back to shop money
    const getPresentmentAmount = (priceSet: any) => {
      if (priceSet?.presentmentMoney?.amount) {
        return priceSet.presentmentMoney.amount;
      }
      return priceSet?.shopMoney?.amount || "0";
    };

    return {
      id: draftOrder.id,
      name: draftOrder.name,
      invoiceUrl: draftOrder.invoiceUrl,
      presentmentCurrencyCode: draftOrder.presentmentCurrencyCode || "INR",
      subtotalPrice: getPresentmentAmount(draftOrder.subtotalPriceSet),
      totalPrice: getPresentmentAmount(draftOrder.totalPriceSet),
      totalTax: getPresentmentAmount(draftOrder.totalTaxSet),
      appliedDiscount: draftOrder.appliedDiscount ? {
        description: draftOrder.appliedDiscount.description,
        value: draftOrder.appliedDiscount.value,
        valueType: draftOrder.appliedDiscount.valueType,
        amount: getPresentmentAmount(draftOrder.appliedDiscount.amountSet),
      } : null,
      lineItems: draftOrder.lineItems.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        variant: edge.node.variant,
        quantity: edge.node.quantity,
        originalUnitPrice: getPresentmentAmount(edge.node.originalUnitPriceSet),
        discountedUnitPrice: getPresentmentAmount(edge.node.discountedUnitPriceSet),
        customAttributes: edge.node.customAttributes,
      })),
      customer: draftOrder.customer,
      createdAt: draftOrder.createdAt,
      updatedAt: draftOrder.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching Shopify draft order:", error);
    return null;
  }
}
