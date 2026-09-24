import { Hono } from 'hono'
import { serve } from '@hono/node-server'
const app = new Hono().basePath('/api')

app.get('/', (c) => c.text('¡Hola desde Hono y Turborepo!'))
serve(app, (info) => {
    console.log(`Listening on http://localhost:${info.port}`) // Listening on http://localhost:3000
  })
export { app }
