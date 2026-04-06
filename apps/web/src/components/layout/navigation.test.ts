import assert from "node:assert/strict";
import test from "node:test";
import { APP_NAV_ITEMS, MOBILE_NAV_ITEMS } from "./navigation";

test("desktop navigation exposes the MCP page", () => {
    assert.ok(APP_NAV_ITEMS.some((item) => item.href === "/mcp" && item.label === "MCP"));
});

test("mobile navigation keeps MCP hidden", () => {
    assert.ok(MOBILE_NAV_ITEMS.every((item) => item.href !== "/mcp"));
});
