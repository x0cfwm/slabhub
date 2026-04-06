export const mcpDocumentation = {
    title: "SlabHub MCP",
    summary:
        "A private MCP server that lets AI agents operate against your SlabHub inventory and shop analytics with your existing account session.",
    methods: [
        {
            name: "search_inventory",
            purpose: "Find inventory by name, set, grade, workflow state, or status label.",
            inputs: ["query", "stage", "statusSystemId", "itemType", "limit"],
            output:
                "A filtered item list with normalized pricing, media URLs, and workflow status context.",
            examplePrompt: "Find all listed PSA 10 items from OP-01.",
        },
        {
            name: "get_item_details",
            purpose:
                "Load one inventory item with its full normalized record, linked market product, recent sales, and transition history.",
            inputs: ["itemId"],
            output:
                "A single item payload with pricing context, media URLs, workflow status, linked product details, and history.",
            examplePrompt: "Open the details for inventory item abc123 and summarize its last sales.",
        },
        {
            name: "update_item_status",
            purpose:
                "Move an item to a new canonical stage, align workflow status, and optionally persist listing or sold pricing.",
            inputs: ["itemId", "stage", "listingPrice", "soldPrice", "soldDate", "statusId", "statusSystemId"],
            output: "The updated normalized item payload.",
            examplePrompt: "Mark item abc123 as SOLD for 240 and set the sold date to today.",
        },
        {
            name: "get_analytics_summary",
            purpose: "Return the same summary blocks used in the shop analytics dashboard.",
            inputs: ["days"],
            output: "Views, sources, top items, top countries, and top-line conversion metrics.",
            examplePrompt: "Show my last 30 days of traffic sources and top viewed items.",
        },
        {
            name: "list_active_listings",
            purpose:
                "List the items currently in LISTED state, ordered the same way the public shop page presents them.",
            inputs: ["limit", "statusSystemId"],
            output: "A normalized listing feed for active inventory.",
            examplePrompt: "Give me the first 25 active listings in my shop.",
        },
        {
            name: "create_inventory_item",
            purpose:
                "Quick-add a new inventory item using the same item-type validation rules as the API.",
            inputs: [
                "itemType",
                "productName",
                "productType",
                "cardVariantId",
                "refPriceChartingProductId",
                "gradeProvider",
                "gradeValue",
                "condition",
                "pricing and acquisition fields",
            ],
            output: "The created normalized inventory item with its default ACQUIRED workflow status when available.",
            examplePrompt: "Create a sealed Romance Dawn booster box acquired for 110.",
        },
    ],
    howToUse: [
        {
            title: "1. Set the session token",
            body:
                "Add `SLABHUB_MCP_SESSION_TOKEN` to your local environment and point it at a valid SlabHub session token from the same account you want the MCP server to act as.",
            code: "SLABHUB_MCP_SESSION_TOKEN=your_session_token_here",
        },
        {
            title: "2. Install dependencies",
            body:
                "The MCP package lives in the monorepo workspace and shares the existing Prisma client and database connection.",
            code: "pnpm install",
        },
        {
            title: "3. Run the server locally",
            body:
                "Use the package-local stdio entry when wiring it into a desktop agent or local MCP client.",
            code: "pnpm --filter @slabhub/mcp run dev:stdio",
        },
        {
            title: "4. Register it in your MCP client",
            body:
                "Point your MCP client at the package command and keep the same environment variables available to the process.",
            code:
                "{\n  \"command\": \"pnpm\",\n  \"args\": [\"--filter\", \"@slabhub/mcp\", \"run\", \"dev:stdio\"],\n  \"env\": {\n    \"DATABASE_URL\": \"postgresql://...\",\n    \"SLABHUB_MCP_SESSION_TOKEN\": \"...\"\n  }\n}",
        },
    ],
    profits: [
        {
            title: "Ship listings faster",
            body:
                "Agents can search, inspect, update, and create inventory without bouncing between manual dashboards, which shortens the path from acquisition to listing.",
        },
        {
            title: "Reduce operational drag",
            body:
                "Bulk-ready tooling around status moves and listing retrieval removes repetitive coordination work from daily inventory maintenance.",
        },
        {
            title: "Turn analytics into action",
            body:
                "Traffic sources and top-viewed items can flow directly into agent prompts, helping you prioritize what to relist, reprice, or promote next.",
        },
    ],
} as const;
