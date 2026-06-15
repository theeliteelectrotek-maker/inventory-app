import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom plugin: injects VITE_ Firebase env vars into firebase-messaging-sw.js
// Service workers cannot use import.meta.env, so we inject them as self.* globals.
function firebaseSwInjector() {
  return {
    name: 'firebase-sw-injector',
    // Runs after the build writes all files
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const swSrc  = path.resolve(__dirname, 'public', 'firebase-messaging-sw.js');
      const swDest = path.resolve(outDir, 'firebase-messaging-sw.js');

      if (!fs.existsSync(swSrc)) return;

      const env = loadEnv('production', __dirname, '');

      // Build a small injection block that sets all config values as self.* globals
      // BEFORE the firebase SDK compat scripts run.
      const injection = `
// ─── Injected by Vite build ───────────────────────────────────────────────────
self.FIREBASE_API_KEY             = ${JSON.stringify(env.VITE_FIREBASE_API_KEY             || '')};
self.FIREBASE_AUTH_DOMAIN         = ${JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN         || '')};
self.FIREBASE_PROJECT_ID          = ${JSON.stringify(env.VITE_FIREBASE_PROJECT_ID          || '')};
self.FIREBASE_STORAGE_BUCKET      = ${JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET      || '')};
self.FIREBASE_MESSAGING_SENDER_ID = ${JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')};
self.FIREBASE_APP_ID              = ${JSON.stringify(env.VITE_FIREBASE_APP_ID              || '')};
// ─────────────────────────────────────────────────────────────────────────────
`;

      const original = fs.readFileSync(swSrc, 'utf8');
      fs.writeFileSync(swDest, injection + original, 'utf8');
      console.log('[firebase-sw-injector] ✅  firebase-messaging-sw.js written to dist/ with injected env vars.');
    },
  };
}

// Dev-mode helper: serve a runtime-injected firebase-messaging-sw.js
// so the dev server also works without a real build step.
function firebaseSwDevServer() {
  return {
    name: 'firebase-sw-dev-server',
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (req, res, _next) => {
        const swSrc = path.resolve(__dirname, 'public', 'firebase-messaging-sw.js');
        if (!fs.existsSync(swSrc)) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        // Read .env in dev mode
        const env = loadEnv('development', __dirname, '');

        const injection = `
// ─── Injected by Vite dev server ─────────────────────────────────────────────
self.FIREBASE_API_KEY             = ${JSON.stringify(env.VITE_FIREBASE_API_KEY             || '')};
self.FIREBASE_AUTH_DOMAIN         = ${JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN         || '')};
self.FIREBASE_PROJECT_ID          = ${JSON.stringify(env.VITE_FIREBASE_PROJECT_ID          || '')};
self.FIREBASE_STORAGE_BUCKET      = ${JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET      || '')};
self.FIREBASE_MESSAGING_SENDER_ID = ${JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')};
self.FIREBASE_APP_ID              = ${JSON.stringify(env.VITE_FIREBASE_APP_ID              || '')};
// ─────────────────────────────────────────────────────────────────────────────
`;

        const original = fs.readFileSync(swSrc, 'utf8');
        const content  = injection + original;

        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(content);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      firebaseSwDevServer(),
      firebaseSwInjector(),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
