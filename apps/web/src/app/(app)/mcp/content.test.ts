import assert from "node:assert/strict";
import test from "node:test";
import { mcpDocumentation } from "./content";

test("MCP docs enumerate the planned tools", () => {
    assert.deepEqual(
        mcpDocumentation.methods.map((method) => method.name),
        [
            "search_inventory",
            "get_item_details",
            "update_item_status",
            "get_analytics_summary",
            "list_active_listings",
            "create_inventory_item",
        ],
    );
});

test("MCP docs keep the required sections", () => {
    assert.ok(mcpDocumentation.howToUse.length >= 4);
    assert.ok(mcpDocumentation.profits.length >= 3);
});
