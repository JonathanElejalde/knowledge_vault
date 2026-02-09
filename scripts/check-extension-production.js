/**
 * Fails if extension config is not production-safe (non-HTTPS).
 * Run after build-extension-config.js with production .env, before packaging.
 *
 * Usage: node scripts/check-extension-production.js
 * Exit: 0 if OK, 1 if non-HTTPS detected.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, "extension", "lib", "env.generated.js");
const manifestPath = path.join(rootDir, "extension", "manifest.json");

const HTTPS_PREFIX = "https://";

function fail(msg) {
  console.error("check-extension-production: " + msg);
  process.exit(1);
}

// 1. Check env.generated.js
if (!fs.existsSync(envPath)) {
  fail("extension/lib/env.generated.js not found. Run scripts/build-extension-config.js first.");
}

const envContent = fs.readFileSync(envPath, "utf8");
const apiMatch = envContent.match(/API_BASE_URL\s*=\s*["']([^"']+)["']/);
const frontendMatch = envContent.match(/FRONTEND_BASE_URL\s*=\s*["']([^"']+)["']/);

if (!apiMatch) {
  fail("API_BASE_URL not found in env.generated.js");
}
if (!frontendMatch) {
  fail("FRONTEND_BASE_URL not found in env.generated.js");
}

const apiBase = apiMatch[1];
const frontendBase = frontendMatch[1];

if (!apiBase.startsWith(HTTPS_PREFIX)) {
  fail('API_BASE_URL must be HTTPS in production. Current: "' + apiBase + '"');
}
if (!frontendBase.startsWith(HTTPS_PREFIX)) {
  fail('FRONTEND_BASE_URL must be HTTPS in production. Current: "' + frontendBase + '"');
}

// 2. Check manifest.json host_permissions
if (!fs.existsSync(manifestPath)) {
  fail("extension/manifest.json not found.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const hostPerms = manifest.host_permissions || [];

const httpHosts = hostPerms.filter((p) => typeof p === "string" && p.startsWith("http://"));
if (httpHosts.length > 0) {
  fail(
    "manifest.json host_permissions must be HTTPS only for production. Found http: " +
      httpHosts.join(", ")
  );
}

console.log("check-extension-production: OK (HTTPS API, frontend, and host_permissions)");
