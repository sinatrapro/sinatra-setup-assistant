# Sinatra Setup Assistant

Extensão do Chrome que automatiza a configuração do acesso da [Sinatra](https://sinatra.pro) em contas VTEX. Com um clique, ela cria a API Key da Sinatra na conta principal, aplica uma role com as permissões necessárias e importa essa mesma key em todos os sellers white-label vinculados.

O objetivo é tirar do time da loja o trabalho manual de criar a key, montar a role recurso por recurso e repetir o processo em cada seller.

## Como funciona

Com o admin da VTEX aberto na aba ativa (`https://{conta}.myvtex.com`), ao clicar em **Iniciar configuração** a extensão:

1. Lê o cookie de sessão `VtexIdclientAutCookie` do usuário logado.
2. Procura uma API Key cujo label contenha "sinatra". Se não existir, cria uma nova com o label `Sinatra Access`.
3. Cria a role `Sinatra` na conta principal, com os recursos definidos em [`vtex-roles.json`](vtex-roles.json).
4. Associa a role à API Key.
5. Lista os sellers white-label da conta (`sellerType=2`).
6. Em cada seller, cria a role `Sinatra` e importa a API Key da conta principal com essa role.

Os sellers são processados em paralelo e de forma independente: uma falha em um seller não interrompe os demais.

### Endpoints VTEX utilizados

| Etapa | Método | Endpoint |
| --- | --- | --- |
| Buscar API Keys | `GET` | `/api/vlm/appkeys` |
| Criar API Key | `POST` | `/api/vlm/appkeys` |
| Criar role | `POST` | `/api/license-manager/site/pvt/roles` |
| Associar role à key | `PUT` | `/api/license-manager/users/{apiKey}/roles` |
| Listar sellers | `GET` | `/api/catalog_system/pvt/seller/list?sellerType=2` |
| Importar key no seller | `POST` | `/api/license-manager/site/pvt/logins` |

Todas as chamadas vão para `https://{conta}.vtexcommercestable.com.br`.

## Requisitos

- Google Chrome (ou navegador baseado em Chromium com suporte a Manifest V3).
- Estar logado no admin VTEX da conta principal com um usuário que tenha permissão para criar API Keys e roles no License Manager.
- Para a importação nos sellers funcionar, o mesmo usuário precisa ter acesso administrativo às contas dos sellers white-label.

## Instalação

### Pela Chrome Web Store

Instale pelo link: [Sinatra Setup Assistant na Chrome Web Store](https://chromewebstore.google.com/detail/minkdibgkefgibhkhijidcoknjlbfbfh).

A extensão está publicada como não listada, então não aparece na busca da loja. O acesso é feito apenas pelo link acima.

### A partir do código-fonte

1. Clone o repositório:
   ```bash
   git clone https://github.com/sinatrapro/sinatra-setup-assistant.git
   ```
2. Abra `chrome://extensions` no Chrome.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** e selecione a pasta do repositório.

Não há etapa de build: a extensão é JavaScript puro, sem dependências.

## Uso

1. Acesse o admin da sua conta em `https://{conta}.myvtex.com/admin` e faça login.
2. Com essa aba ativa, clique no ícone da extensão.
3. Clique em **Iniciar configuração** e aguarde a mensagem de conclusão.

Depois de concluir, a API Key aparece em **Configurações da conta > Chaves de aplicação** da conta principal e de cada seller white-label.

## Permissões da extensão

| Permissão | Por que é necessária |
| --- | --- |
| `cookies` | Ler o `VtexIdclientAutCookie` para autenticar as chamadas na API da VTEX em nome do usuário logado. |
| `tabs` / `activeTab` | Identificar a conta VTEX a partir da URL da aba ativa. |
| `https://*.myvtex.com/*` | Acessar o cookie de sessão do admin VTEX. |
| `https://*.vtexcommercestable.com.br/*` | Chamar as APIs da VTEX. |

## Privacidade e segurança

- A extensão só se comunica com domínios da VTEX. Nenhuma informação é enviada para a Sinatra ou para terceiros.
- O cookie de sessão é usado apenas durante a execução e não é armazenado.
- O token (secret) da API Key não é exibido nem guardado pela extensão.

## Permissões concedidas à role `Sinatra`

A role criada na VTEX é definida em [`vtex-roles.json`](vtex-roles.json) e inclui os seguintes recursos:

| Produto | Recursos |
| --- | --- |
| Catalog | Product Form, Category, Groups, Brands, SKUs, Sellers, Seller SKUs, Read Collections |
| Catalog API | View Category |
| OMS | View order, List Orders, Order feed subscription, View store sales stats, Feed v3 and Hook Admin |
| PCI Gateway | View Payment Data, View Payments Sensitive Data |
| Logistics | Logistics viewer, Logistics inventory read only, Logistics shipping read only |
| Pricing | Read prices |
| Rates and Benefits | Manage benefits and rates |
| Dynamic Storage | Read only documents, List data entity, View data entity details |
| License Manager | Get account by identifier |

Para alterar as permissões, edite `vtex-roles.json`. O arquivo segue o formato de payload do endpoint de criação de roles do License Manager.

## Estrutura do projeto

```
.
├── manifest.json        # Configuração da extensão (Manifest V3)
├── background.js        # Service worker com o fluxo de setup e as chamadas à VTEX
├── popup.html           # Interface do popup
├── popup.js             # Lógica do popup e exibição de status
├── styles.css           # Estilos do popup
├── vtex-roles.json      # Definição da role Sinatra
├── _locales/            # Traduções (en, pt_BR)
└── images/              # Ícones e logo
```

## Idiomas

A interface segue o idioma do navegador, com suporte a português (`pt_BR`) e inglês (`en`, padrão). Para adicionar um idioma, crie uma pasta em `_locales/` com um `messages.json` contendo as mesmas chaves.

## Mensagens de erro

| Mensagem | Causa provável |
| --- | --- |
| A aba ativa não é uma loja VTEX. | A aba ativa não está em um domínio `*.myvtex.com`. |
| Cookie VtexIdclientAutCookie não encontrado. | O usuário não está logado no admin VTEX dessa conta. |
| `Erro 401` / `Erro 403` | O usuário logado não tem permissão para criar API Keys ou roles. |

## Contribuindo

Issues e pull requests são bem-vindos. Para testar uma alteração, recarregue a extensão em `chrome://extensions` e execute o fluxo em uma conta VTEX de teste. Logs do service worker ficam disponíveis em **Inspecionar visualizações: service worker** na página da extensão.

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais detalhes.
