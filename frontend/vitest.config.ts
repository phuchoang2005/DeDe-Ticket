import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // Default to node (matches the util/integration specs that read files via
    // import.meta.url). Component specs can opt in with `// @vitest-environment jsdom`.
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', '**/.next/**', '**/._*'],
  },
});
