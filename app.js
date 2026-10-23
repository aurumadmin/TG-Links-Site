/**
 * TG Links - cPanel & Production Application Entry Point
 * 
 * Specifically configured for:
 * - cPanel Node.js Application Manager (CloudLinux / Phusion Passenger)
 * - Node.js 20+ Runtime
 * - Preserving Standalone VPS / Docker / Cloud Run Deployments
 * 
 * IMPORTANT: This entry point loads the compiled production application
 * from 'dist/server.cjs'. Run 'npm run build' before starting the app in cPanel.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure NODE_ENV is set to production for app.js entry point
process.env.NODE_ENV = "production";

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
  console.error("Please run the production build command in your project directory:");
  console.error("  npm run build");
  console.error("=================================================================");
  process.exit(1);
}

// Import and launch the compiled application
const serverModule = await import(pathToFileURL(bundlePath).href);
const app = serverModule.default || serverModule;

export default app;
export { app };
