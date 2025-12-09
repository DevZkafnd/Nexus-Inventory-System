import { promises as fs } from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const cwd = path.resolve(__dirname, '..')

function run(cmd, opts = {}) {
  return new Promise((resolve) => {
    const p = exec(cmd, { cwd, ...opts }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? err.code : 0, stdout, stderr })
    })
    p.stdout && p.stdout.pipe(process.stdout)
    p.stderr && p.stderr.pipe(process.stderr)
  })
}

async function ensureEnv() {
  const envPath = path.join(cwd, '.env')
  let exists = true
  try {
    await fs.access(envPath)
  } catch {
    exists = false
  }
  if (!exists) {
    const content = 'DATABASE_URL="postgresql://postgres@localhost:5432/inventory"\nSHADOW_DATABASE_URL="postgresql://postgres@localhost:5432/inventory_shadow"\n'
    await fs.writeFile(envPath, content)
  } else {
    const txt = await fs.readFile(envPath, 'utf-8')
    let out = txt
    if (!/DATABASE_URL=/.test(txt)) out += '\nDATABASE_URL="postgresql://postgres@localhost:5432/inventory"\n'
    if (!/SHADOW_DATABASE_URL=/.test(txt)) out += '\nSHADOW_DATABASE_URL="postgresql://postgres@localhost:5432/inventory_shadow"\n'
    if (out !== txt) await fs.writeFile(envPath, out)
  }
}

async function ensurePrismaConfig() {
  const p = path.join(cwd, 'prisma.config.ts')
  try {
    await fs.access(p)
  } catch {
    const content = 'import \"dotenv/config\"\nimport { defineConfig, env } from \"prisma/config\"\nexport default defineConfig({\n  schema: \"prisma/schema.prisma\",\n  migrations: { path: \"prisma/migrations\" },\n  datasource: { url: env(\"DATABASE_URL\"), shadowDatabaseUrl: env(\"SHADOW_DATABASE_URL\") },\n})\n'
    await fs.writeFile(p, content)
  }
}

async function ensureDeps() {
  const pkgPath = path.join(cwd, 'package.json')
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
  const need = [
    '@apollo/server',
    'graphql',
    'dotenv',
    'pg',
    '@prisma/adapter-pg',
    '@prisma/client',
    'prisma',
  ]
  const needDev = ['typescript', 'ts-node', 'nodemon', '@types/node']
  const has = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {})
  const missing = need.filter((d) => !has[d])
  const missingDev = needDev.filter((d) => !has[d])
  if (missing.length) {
    const r = await run('npm install ' + missing.join(' '))
    if (!r.ok) process.exit(r.code || 1)
  }
  if (missingDev.length) {
    const r = await run('npm install -D ' + missingDev.join(' '))
    if (!r.ok) process.exit(r.code || 1)
  }
}

async function ensureDockerDb() {
  const v = await run('docker --version')
  if (!v.ok) return
  await run('docker compose up -d nexus-db')
}

async function prismaGenerate() {
  const r = await run('npx prisma generate')
  if (!r.ok) process.exit(r.code || 1)
}

async function prismaDbPush() {
  const r = await run('npx prisma db push')
  if (!r.ok) {
    await ensureDockerDb()
    const r2 = await run('npx prisma db push')
    if (!r2.ok) process.exit(r2.code || 1)
  }
}

async function main() {
  await ensureEnv()
  await ensurePrismaConfig()
  await ensureDeps()
  await prismaGenerate()
  await prismaDbPush()
  process.stdout.write('Setup selesai\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

