import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Generate a per-response nonce
      const nonce = nanoid();

      // Inject nonce into all script tags to satisfy CSP if enabled by browser/head
      template = template.replace(/<script\b/gi, `<script nonce="${nonce}"`);
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);

      // Apply CSP header with nonce for dev, mirroring meta policy but nonce-enabling inline if any
      const csp = [
        `default-src 'self'`,
        `connect-src 'self' ws: wss: https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://replit.com`,
        `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' blob: https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://replit.com`,
        `script-src-elem 'self' 'nonce-${nonce}' blob: https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://replit.com`,
        `worker-src 'self' blob:`,
        `img-src 'self' data: blob: https:`,
        `style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`,
        `font-src 'self' data: https://cdn.jsdelivr.net`,
        `object-src 'none'`,
      ].join('; ');

      res
        .status(200)
        .set({ "Content-Type": "text/html", "Content-Security-Policy": csp })
        .end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (_req, res, next) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let html = await fs.promises.readFile(indexPath, 'utf-8');

      const nonce = nanoid();
      html = html.replace(/<script\b/gi, `<script nonce="${nonce}"`);

      const csp = [
        `default-src 'self'`,
        `connect-src 'self' ws: wss: https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://replit.com`,
        `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' blob: https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://replit.com`,
        `script-src-elem 'self' 'nonce-${nonce}' blob: https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://replit.com`,
        `worker-src 'self' blob:`,
        `img-src 'self' data: blob: https:`,
        `style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`,
        `font-src 'self' data: https://cdn.jsdelivr.net`,
        `object-src 'none'`,
      ].join('; ');

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Security-Policy', csp);
      res.status(200).end(html);
    } catch (e) {
      next(e);
    }
  });
}
