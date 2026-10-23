/**
 * TG Links - cPanel Node.js Application Manager Entry Point (CommonJS)
 * 
 * Specifically designed for LiteSpeed (lsnode.js) and Phusion Passenger.
 * LiteSpeed's lsnode.js loads startup files using require(). Because this file
 * has a .cjs extension, Node.js always treats it as CommonJS regardless of
 * "type": "module" in package.json, preventing ERR_REQUIRE_ASYNC_MODULE.
 */

const path = require("node:path");
const fs = require("node:fs");

// Ensure NODE_ENV is set to production
process.env.NODE_ENV = process.env.NODE_ENV || process.env.PASSENGER_APP_ENV || "production";

// Locate compiled production server bundle across candidate paths
const bundleCandidates = [
  path.join(__dirname, "dist", "server.cjs"),
  path.join(process.cwd(), "dist", "server.cjs")
];

const bundlePath = bundleCandidates.find(p => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

if (!bundlePath) {
  console.error("=================================================================");
  console.error("[TG Links Startup Error] Compiled production server bundle not found!");
  console.error("Expected path: " + path.join(__dirname, "dist", "server.cjs"));
  console.error("");
  console.error("Please run the production build command before launching in cPanel:");
  console.error("  npm run build");
  console.error("=================================================================");
  process.exit(1);
}

// Synchronously require the compiled production bundle
const serverModule = require(bundlePath);
const app = serverModule.default || serverModule;

module.exports = app;
module.exports.default = app;
