const GQL_URL = 'http://localhost:4000/'

function sanitizeFileName(name) {
  return (name || 'qr').toString().normalize('NFKD').replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '_').slice(0, 64)
}

function getToken() {
  try { return sessionStorage.getItem('auth_token') || '' } catch { return '' }
}

function setToken(t) {
  try { sessionStorage.setItem('auth_token', t) } catch {}
}

async function gql(query, variables) {
  const r = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': getToken() },
    body: JSON.stringify({ query, variables }),
  })
  const j = await r.json()
  if (j.errors) throw new Error(j.errors[0].message || 'Error')
  return j.data
}

async function loadProducts() {
  const q = `
    query {
      products { id sku name totalStock isLowStock }
    }
  `
  const data = await gql(q)
  const body = document.getElementById('productsBody')
  body.innerHTML = ''
  data.products.forEach(p => {
    const tr = document.createElement('tr')
    const sku = document.createElement('td'); sku.textContent = p.sku
    const name = document.createElement('td'); name.textContent = p.name
    const stock = document.createElement('td'); stock.textContent = p.totalStock
    if (p.isLowStock) stock.className = 'low'
    const action = document.createElement('td')
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Edit'
    btnEdit.onclick = () => editProductPrompt(p)
    const btnDel = document.createElement('button'); btnDel.textContent = 'Delete'
    btnDel.style.marginLeft = '6px'
    btnDel.onclick = () => deleteProductConfirm(p)
    const btnQR = document.createElement('button'); btnQR.textContent = 'Show SKU QR'
    btnQR.style.marginLeft = '6px'
    btnQR.onclick = () => openQRModal('Label Produk (SKU)', p.sku, p.name)
    action.appendChild(btnEdit); action.appendChild(btnDel); action.appendChild(btnQR)
    tr.appendChild(sku); tr.appendChild(name); tr.appendChild(stock); tr.appendChild(action)
    body.appendChild(tr)
  })
  document.getElementById('lastSync').textContent = new Date().toLocaleTimeString('id-ID')
}

async function loadWarehouses() {
  const status = document.getElementById('whListStatus')
  if (status) status.textContent = 'Memuat...'
  try {
    const q = `query { warehouses { id name location code staffs { id name email } } }`
    const data = await gql(q)
    const sel = document.getElementById('warehouseSelect')
    if (sel) {
      sel.innerHTML = '<option value=\"\">Pilih Gudang (opsional)</option>'
      data.warehouses.forEach(w => {
        const opt = document.createElement('option')
        opt.value = w.id
        opt.textContent = `${w.name} (${w.code})`
        sel.appendChild(opt)
      })
    }
    const table = document.getElementById('warehousesBody')
    if (table) {
      table.innerHTML = ''
      data.warehouses.forEach(w => {
        const tr = document.createElement('tr')
        const name = document.createElement('td'); name.textContent = w.name
        const loc = document.createElement('td'); loc.textContent = w.location
        const code = document.createElement('td'); code.textContent = w.code
        const staffCell = document.createElement('td')
        const names = (w.staffs || []).map(s => s.name || s.email).filter(Boolean)
        staffCell.textContent = names.length ? names.join(', ') : '—'
        const action = document.createElement('td')
        const btnQR = document.createElement('button'); btnQR.textContent = 'Show Location QR'
        btnQR.onclick = () => openQRModal('QR Gudang (Code/ID)', w.code, w.name)
        action.appendChild(btnQR)
        tr.appendChild(name); tr.appendChild(loc); tr.appendChild(code); tr.appendChild(staffCell); tr.appendChild(action)
        table.appendChild(tr)
      })
    }
    if (status) status.textContent = `Loaded ${data.warehouses.length} gudang`
  } catch (err) {
    if (status) status.textContent = 'Gagal memuat gudang: ' + err.message
  }
}

async function createProduct(e) {
  e.preventDefault()
  const sku = document.getElementById('sku').value.trim()
  const name = document.getElementById('name').value.trim()
  const category = document.getElementById('category').value.trim() || null
  const priceRaw = document.getElementById('price').value
  const price = priceRaw ? parseFloat(priceRaw) : null
  const initialStockRaw = document.getElementById('initialStock').value
  const initialStock = initialStockRaw ? parseInt(initialStockRaw, 10) : null
  const warehouseId = document.getElementById('warehouseSelect').value || null
  const m = `
    mutation($sku: String!, $name: String!, $category: String, $price: Float, $initialStock: Int, $warehouseId: ID) {
      createProduct(sku: $sku, name: $name, category: $category, price: $price, initialStock: $initialStock, warehouseId: $warehouseId) { id sku name }
    }
  `
  const el = document.getElementById('createStatus')
  el.textContent = 'Mengirim...'
  try {
    await gql(m, { sku, name, category, price, initialStock, warehouseId })
    el.textContent = 'Berhasil'
    document.getElementById('createForm').reset()
    await loadProducts()
    openQRModal('Label Produk (SKU)', sku, name)
  } catch (err) {
    el.textContent = 'Gagal: ' + err.message
  }
}

function openQRModal(title, text, filename) {
  document.getElementById('qrTitle').textContent = title
  const canvas = document.getElementById('qrCanvas')
  canvas.innerHTML = ''
  QRCode.toCanvas(text, { width: 256 }, (error, c) => {
    if (error) return
    canvas.appendChild(c)
    window.__lastQRCanvas = c
  })
  window.__qrFilename = sanitizeFileName(filename || title || 'qr')
  const modal = document.getElementById('qrModal')
  modal.style.display = 'flex'
}
document.getElementById('closeQR').addEventListener('click', () => {
  document.getElementById('qrModal').style.display = 'none'
})
document.getElementById('printQR').addEventListener('click', () => {
  const c = window.__lastQRCanvas
  if (!c) return
  try {
    const jpg = c.toDataURL('image/jpeg', 0.95)
    let style = document.getElementById('qrPrintStyle')
    if (!style) {
      style = document.createElement('style')
      style.id = 'qrPrintStyle'
      style.textContent = `
        @page { margin: 10mm; }
        body.printing * { visibility: hidden !important; }
        body.printing #qrPrintArea, body.printing #qrPrintArea * { visibility: visible !important; }
        body.printing #qrPrintArea { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        body.printing #qrPrintArea img { width: 256px; height: 256px; image-rendering: pixelated; }
      `
      document.head.appendChild(style)
    }
    let area = document.getElementById('qrPrintArea')
    if (!area) {
      area = document.createElement('div')
      area.id = 'qrPrintArea'
      document.body.appendChild(area)
    }
    area.innerHTML = ''
    const img = document.createElement('img')
    img.alt = 'QR Code'
    img.src = jpg
    area.appendChild(img)
    document.body.classList.add('printing')
    const done = () => {
      setTimeout(() => {
        document.body.classList.remove('printing')
        area.innerHTML = ''
      }, 300)
    }
    if (img.complete) {
      window.print()
      done()
    } else {
      img.addEventListener('load', () => { window.print(); done() })
      img.addEventListener('error', () => { window.print(); done() })
    }
  } catch (e) {
    try {
      const c = window.__lastQRCanvas
      if (!c) return
      const jpg = c.toDataURL('image/jpeg', 0.95)
      const a = document.createElement('a')
      a.href = jpg
      const base = window.__qrFilename || 'qr'
      a.download = `${base}.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {}
  }
})

document.getElementById('downloadQR').addEventListener('click', () => {
  const c = window.__lastQRCanvas
  if (!c) return
  const jpg = c.toDataURL('image/jpeg', 0.95)
  const a = document.createElement('a')
  a.href = jpg
  const base = window.__qrFilename || 'qr'
  a.download = `${base}.jpg`
  document.body.appendChild(a)
  a.click()
  a.remove()
})

async function editProductPrompt(p) {
  const name = prompt('Nama baru', p.name)
  if (name == null) return
  const priceStr = prompt('Harga baru (contoh 12.5)', '')
  const price = priceStr ? parseFloat(priceStr) : null
  const category = prompt('Kategori baru', p.category || '')
  const m = `
    mutation($id: ID!, $name: String, $price: Float, $category: String) {
      updateProduct(id: $id, name: $name, price: $price, category: $category) { id name }
    }
  `
  await gql(m, { id: p.id, name, price, category })
  await loadProducts()
}

async function deleteProductConfirm(p) {
  if (!confirm('Hapus produk ini?')) return
  const m = `mutation($id: ID!) { deleteProduct(id: $id) }`
  try {
    await gql(m, { id: p.id })
    await loadProducts()
  } catch (e) {
    alert(e.message)
  }
}

async function loadTransactions() {
  const q = `
    query {
      transactions(limit: 20) {
        type quantity timestamp
        sourceWarehouse { name }
        targetWarehouse { name }
      }
    }
  `
  const data = await gql(q)
  const body = document.getElementById('txBody')
  body.innerHTML = ''
  data.transactions.forEach(t => {
    const tr = document.createElement('tr')
    const type = document.createElement('td'); type.textContent = t.type
    const qty = document.createElement('td'); qty.textContent = t.quantity
    const time = document.createElement('td'); time.textContent = new Date(t.timestamp).toLocaleString('id-ID')
    const src = document.createElement('td'); src.textContent = t.sourceWarehouse?.name || ''
    const dst = document.createElement('td'); dst.textContent = t.targetWarehouse?.name || ''
    tr.appendChild(type); tr.appendChild(qty); tr.appendChild(time); tr.appendChild(src); tr.appendChild(dst)
    body.appendChild(tr)
  })
}

document.getElementById('refresh').addEventListener('click', loadProducts)
document.getElementById('createForm').addEventListener('submit', createProduct)
document.getElementById('loadTx').addEventListener('click', loadTransactions)
document.getElementById('createWarehouseForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('whName').value.trim()
  const location = document.getElementById('whLocation').value.trim()
  const code = document.getElementById('whCode').value.trim()
  const m = `mutation($name:String!,$location:String!,$code:String!){ createWarehouse(name:$name, location:$location, code:$code){ id } }`
  const s = document.getElementById('whStatus'); s.textContent = 'Mengirim...'
  try {
    await gql(m, { name, location, code })
    s.textContent = 'Berhasil'
    e.target.reset()
    await loadWarehouses()
  } catch (err) {
    s.textContent = 'Gagal: ' + err.message
  }
})
document.getElementById('refreshWarehouses').addEventListener('click', loadWarehouses)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('loginEmail').value.trim()
  const password = document.getElementById('loginPassword').value
  const status = document.getElementById('loginStatus'); status.textContent = 'Mengautentikasi...'
  const m = `mutation($email:String!,$password:String!){ login(email:$email, password:$password) }`
  try {
    const d = await gql(m, { email, password })
    setToken(d.login)
    document.getElementById('loginOverlay').style.display = 'none'
    await loadProducts()
    await loadWarehouses()
    setInterval(loadProducts, 3000)
  } catch (err) {
    status.textContent = 'Gagal login: ' + err.message
  }
})

;(async function init() {
  if (getToken()) {
    document.getElementById('loginOverlay').style.display = 'none'
    await loadProducts()
    await loadWarehouses()
    setInterval(loadProducts, 3000)
  } else {
    document.getElementById('loginOverlay').style.display = 'flex'
  }
})()

window.addEventListener('unload', () => {
  try { sessionStorage.removeItem('auth_token') } catch {}
})
