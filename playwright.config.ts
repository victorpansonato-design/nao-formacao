import { defineConfig, devices } from '@playwright/test'

// No Windows, um cwd com a letra da unidade em minúscula (c:\...) faz o Vite resolver o React por dois caminhos
// e a página quebra com "Invalid hook call". O servidor de teste sempre sobe a partir do caminho com a letra em maiúscula.
const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase())

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5182', trace: 'retain-on-failure', screenshot: 'only-on-failure', reducedMotion: 'reduce' },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5182 --strictPort', cwd, url: 'http://127.0.0.1:5182', reuseExistingServer: !process.env.CI },
})
