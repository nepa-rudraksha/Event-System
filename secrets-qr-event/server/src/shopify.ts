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
  note?: string
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
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        email,
        lineItems: lineItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          customAttributes: item.customAttributes || [],
        })),
        note: note || "Created from Expert Consultation",
      },
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

    return {
      draftOrderId: draftOrder.id,
      checkoutUrl: draftOrder.invoiceUrl,
    };
  } catch (error) {
    console.error("Error creating Shopify draft order:", error);
    throw error;
  }
}

/**
 * Fetch product from Shopify by product ID
 */
export async function fetchShopifyProduct(productId: string): Promise<{ description: string; title: string } | null> {
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
    };
  } catch (error) {
    console.error("Error fetching Shopify product:", error);
    return null;
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

    return data.data?.draftOrder || null;
  } catch (error) {
    console.error("Error fetching Shopify draft order:", error);
    return null;
  }
}
