// Helper para fetch com cookie
const fetchWithCookie = async (sessionId, url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      VtexIdclientAutCookie: sessionId,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ${response.status} ao acessar ${url}: ${text}`);
  }
  return response.json();
};

// Helper para criar API Key
const createApiKey = async (sessionId, account) => {
  const apiKey = await fetchWithCookie(
    sessionId,
    `https://${account}.vtexcommercestable.com.br/api/vlm/appkeys`,
    {
      method: "POST",
      body: JSON.stringify({ label: "Sinatra Access" }),
    }
  );
  return apiKey;
};

// Helper para adicionar Role
const addRoleToApiKey = async (sessionId, account, apiKeyId, roles) => {
  const role = await fetchWithCookie(
    sessionId,
    `https://${account}.vtexcommercestable.com.br/api/license-manager/users/${apiKeyId}/roles`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roles),
    }
  );
  return role;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "runSetup") return;

  (async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (
        !tab?.url?.includes("vtexcommercestable.com.br") &&
        !tab?.url?.includes("myvtex.com")
      ) {
        sendResponse({ success: false, errorKey: "notVTEXTab" });
        return;
      }

      const account = new URL(tab.url).hostname.split(".")[0];

      const cookie = await chrome.cookies.get({
        url: `https://${account}.myvtex.com`,
        name: "VtexIdclientAutCookie",
      });
      if (!cookie) {
        sendResponse({ success: false, errorKey: "cookieNotFound" });
        return;
      }

      const sessionId = cookie.value;

      const apiKey = await createApiKey(sessionId, account);

      const rolesData = await fetch(
        chrome.runtime.getURL("vtex-roles.json")
      ).then((res) => res.json());
      const productIds = Array.from(
        new Set(rolesData.map((item) => item.productId))
      );

      await addRoleToApiKey(sessionId, account, apiKey.id, productIds);

      const sellers = await fetchWithCookie(
        sessionId,
        `https://${account}.vtexcommercestable.com.br/api/catalog_system/pvt/seller/list?sellerType=2`,
        { method: "GET" }
      );

      const sellerResults = await Promise.allSettled(
        sellers.map(async (seller) => {
          try {
            const sellerApiKey = await createApiKey(sessionId, seller.SellerId);
            await addRoleToApiKey(
              sessionId,
              seller.SellerId,
              sellerApiKey.id,
              productIds
            );
            return { sellerId: seller.SellerId, success: true };
          } catch (err) {
            return {
              sellerId: seller.SellerId,
              success: false,
              error: String(err),
            };
          }
        })
      );

      const totalSellers = sellers.length;
      const successCount = sellerResults.filter((r) => r.value?.success).length;

      sendResponse({
        success: true,
        messageKey: "setupCompleted",
        data: { totalSellers, successCount, sellerResults },
      });
    } catch (err) {
      sendResponse({
        success: false,
        errorKey: "setupFailed",
        error: err?.message,
      });
    }
  })();

  return true;
});
