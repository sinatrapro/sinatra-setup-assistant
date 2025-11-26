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

  if (response.status === 204) return null; // No Content

  return response.json();
};

// Helper para recuperar a API Key
const getApiKey = async (sessionId, account) => {
  const apiKey = await fetchWithCookie(
    sessionId,
    `https://${account}.vtexcommercestable.com.br/api/vlm/appkeys`,
    {
      method: "GET",
    }
  );
  return apiKey.filter((key) =>
    key.label?.toLowerCase()?.includes("sinatra")
  )[0]?.id;
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
  return apiKey.id;
};

// Helper para importar API Key
const importApiKey = async (sessionId, account, apiKeyId, roleId) => {
  const apiKey = await fetchWithCookie(
    sessionId,
    `https://${account}.vtexcommercestable.com.br/api/license-manager/site/pvt/logins`,
    {
      method: "POST",
      body: JSON.stringify({
        name: apiKeyId,
        email: apiKeyId,
        roles: [
          {
            id: roleId,
          },
        ],
      }),
    }
  );
  return apiKey.id;
};

// Helper para criar Role
const createSinatraRole = async (sessionId, account, roles) => {
  const role = await fetchWithCookie(
    sessionId,
    `https://${account}.vtexcommercestable.com.br/api/license-manager/site/pvt/roles`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roles),
    }
  );
  return role.id;
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
        lastFocusedWindow: true,
      });

      if (!tab?.url?.includes(".myvtex.com")) {
        sendResponse({ success: false, errorKey: "notVTEXTab" });
        return;
      }

      // 1. Pega o cookie de autenticação
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

      // 2. Cria a API Key para a conta principal caso não exista
      let apiKeyId;
      apiKeyId = await getApiKey(sessionId, account);
      if (!apiKeyId) {
        apiKeyId = await createApiKey(sessionId, account);
      }

      // 3. Cria a Role Sinatra
      const rolesData = await fetch(
        chrome.runtime.getURL("vtex-roles.json")
      ).then((res) => res.json());
      const sinatraRoleId = await createSinatraRole(
        sessionId,
        account,
        rolesData
      );

      // 4. Adiciona a Role Sinatra na API Key
      await addRoleToApiKey(sessionId, account, apiKeyId, [sinatraRoleId]);

      // 5. Pega a lista de sellers
      const sellers = await fetchWithCookie(
        sessionId,
        `https://${account}.vtexcommercestable.com.br/api/catalog_system/pvt/seller/list?sellerType=2`,
        { method: "GET" }
      );

      const sellerResults = await Promise.allSettled(
        sellers.map(async (seller) => {
          try {
            // 6. Cria a role para o seller
            const roleId = await createSinatraRole(
              sessionId,
              seller.SellerId,
              rolesData
            );

            // 7. Importa a API Key para o seller
            await importApiKey(sessionId, seller.SellerId, apiKeyId, roleId);
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
