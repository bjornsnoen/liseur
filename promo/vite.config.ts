import {defineConfig} from 'vite';
import revideo from '@revideo/vite-plugin';

process.env.DISABLE_TELEMETRY = 'true';
export default defineConfig({plugins: [revideo()], server: {host: '127.0.0.1'}, optimizeDeps: {include: ['@revideo/core', '@revideo/2d', '@revideo/2d/lib/jsx-dev-runtime', '@revideo/renderer/lib/client/render']}});
