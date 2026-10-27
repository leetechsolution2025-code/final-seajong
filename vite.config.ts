import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Plugin tự động kích hoạt backend Express server.js cùng lúc với Vite dev server
 */
function autoBackendPlugin(): Plugin {
  let serverProcess: ChildProcess | null = null

  const startBackend = () => {
    const req = http.get('http://localhost:3005/api/health', () => {
      // Backend đã chạy
    })

    req.on('error', () => {
      console.log('\x1b[36m%s\x1b[0m', '⚡ [Vite Plugin] Đang tự động khởi động Backend Express Server (server.js)...')
      serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
        stdio: 'inherit',
        shell: false,
      })

      serverProcess.on('error', (err) => {
        console.error('Không thể khởi chạy backend server:', err)
      })
    })
  }

  const cleanup = () => {
    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM')
      } catch (e) {}
      serverProcess = null
    }
  }

  return {
    name: 'auto-backend-server',
    configureServer(server) {
      startBackend()

      server.httpServer?.on('close', cleanup)
      process.on('exit', cleanup)
      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      server.watcher.add(path.join(__dirname, 'server.js'))
      server.watcher.on('change', (file) => {
        if (file.endsWith('server.js')) {
          console.log('\x1b[33m%s\x1b[0m', '⚡ [Vite Plugin] server.js thay đổi -> Khởi động lại Backend...')
          cleanup()
          setTimeout(startBackend, 600)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), autoBackendPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
})
