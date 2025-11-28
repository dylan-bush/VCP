// Copy index.html to 404.html so GitHub Pages can serve SPA routes with relative paths.
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const distDir = join(process.cwd(), "dist");
const indexPath = join(distDir, "index.html");
const fallbackPath = join(distDir, "404.html");

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

if (!existsSync(indexPath)) {
  console.error("dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}

copyFileSync(indexPath, fallbackPath);
console.log("Created dist/404.html for GitHub Pages fallback.");
