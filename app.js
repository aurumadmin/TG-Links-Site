/**
 * TG Links - cPanel & Production Entry Point
 * 
 * Synchronous CommonJS/ESM bridge without top-level await.
 * This file delegates directly to app.cjs so that both:
 * 1. Startup file set to "app.js" (Node 20 require-ESM compatible without top-level await)
 * 2. Startup file set to "app.cjs" (Pure CommonJS compatible with all lsnode.js versions)
 * work seamlessly without ERR_REQUIRE_ASYNC_MODULE.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

process.env.NODE_ENV = process.env.NODE_ENV || process.env.PASSENGER_APP_ENV || "production";

// Synchronously load the CommonJS launcher (app.cjs)
const app = require("./app.cjs");

export default app;
export { app };
