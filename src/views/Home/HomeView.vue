<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const orders = ref([])
const bills = ref([])
const products = ref([])
const clients = ref([])
const loading = ref(false)
const errorMessage = ref('')
const timeframe = ref('month') // 'month' | 'year'
const hoverPoint = ref(null)

const statusOptions = [
  { label: 'Pendiente', value: 1 },
  { label: 'En progreso', value: 2 },
  { label: 'Entregado', value: 3 },
  { label: 'Cancelado', value: 4 },
]

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [ordersData, billsData, productsData, clientsData] = await Promise.all([
      fetchJson(`${API_BASE_URL}/orders/?skip=0&limit=300`),
      fetchJson(`${API_BASE_URL}/bills/?skip=0&limit=300`),
      fetchJson(`${API_BASE_URL}/products/?skip=0&limit=200`),
      fetchJson(`${API_BASE_URL}/clients?skip=0&limit=300`),
    ])
    orders.value = Array.isArray(ordersData) ? ordersData : []
    bills.value = Array.isArray(billsData) ? billsData : []
    products.value = Array.isArray(productsData) ? productsData : []
    clients.value = Array.isArray(clientsData) ? clientsData : []
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al cargar datos'
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

const clientNameMap = computed(() =>
  (clients.value || []).reduce((acc, c) => {
    const id = c.id_key ?? c.id
    if (id != null) acc[id] = `${c.name ?? ''} ${c.lastname ?? ''}`.trim()
    return acc
  }, {})
)

const statusLabel = (val) => {
  const found = statusOptions.find((o) => o.value === val)
  return found?.label ?? val ?? 'N/D'
}

const totalSales = computed(() =>
  orders.value.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
)

const ordersToday = computed(() => {
  const today = new Date()
  const day = today.getDate()
  const month = today.getMonth()
  const year = today.getFullYear()
  return orders.value.filter((o) => {
    const d = new Date(o.date)
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
  }).length
})

const salesToday = computed(() => {
  const today = new Date()
  const day = today.getDate()
  const month = today.getMonth()
  const year = today.getFullYear()
  return orders.value.reduce((sum, o) => {
    const d = new Date(o.date)
    if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
      return sum + (Number(o.total) || 0)
    }
    return sum
  }, 0)
})

const lowStock = computed(() =>
  products.value
    .filter((p) => (p.stock ?? 0) <= 5)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 5)
)

const recentOrders = computed(() =>
  [...orders.value]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5)
)

const recentBills = computed(() =>
  [...bills.value]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5)
)

const salesByPeriod = computed(() => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  if (timeframe.value === 'year') {
    const monthTotals = Array.from({ length: 12 }, (_, idx) => ({
      label: `${currentYear}-${String(idx + 1).padStart(2, '0')}`,
      value: 0,
    }))
    orders.value.forEach((o) => {
      const d = new Date(o.date)
      if (isNaN(d.getTime())) return
      if (d.getFullYear() !== currentYear) return
      const idx = d.getMonth()
      monthTotals[idx].value += Number(o.total) || 0
    })
    return monthTotals
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const dayTotals = Array.from({ length: daysInMonth }, (_, idx) => ({
    label: String(idx + 1).padStart(2, '0'),
    value: 0,
  }))
  orders.value.forEach((o) => {
    const d = new Date(o.date)
    if (isNaN(d.getTime())) return
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const day = d.getDate()
      dayTotals[day - 1].value += Number(o.total) || 0
    }
  })
  return dayTotals
})

const maxSales = computed(() => {
  const vals = salesByPeriod.value.map((p) => p.value)
  return Math.max(...(vals.length ? vals : [0]))
})

const chartSeries = computed(() => {
  const series = salesByPeriod.value
  if (!series.length) return []
  const maxVal = maxSales.value || 1
  const n = series.length
  return series.map((p, idx) => {
    const x = n === 1 ? 0 : (idx / (n - 1)) * 100
    const y = 100 - (p.value / maxVal) * 100
    const width = n === 1 ? 100 : 100 / (n - 1)
    const xStart = Math.max(0, Math.min(100 - width, x - width / 2))
    return { ...p, x, y, width, xStart }
  })
})

const polylinePoints = computed(() =>
  chartSeries.value.map((pt) => `${pt.x},${pt.y}`).join(' ')
)

onMounted(loadData)
</script>

<template>
  <section class="page">
    <header class="header">
      <div>
        <h2 class="title">Home</h2>
        <p class="subtitle">Panel general - API: {{ API_BASE_URL }}</p>
      </div>
      <div class="actions">
        <RouterLink to="/orders" class="btn btn-small">Nueva orden</RouterLink>
        <RouterLink to="/products" class="btn btn-secondary btn-small">Nuevo producto</RouterLink>
        <RouterLink to="/clients" class="btn btn-secondary btn-small">Nuevo cliente</RouterLink>
      </div>
    </header>

    <p v-if="errorMessage" class="msg msg-error">{{ errorMessage }}</p>

    <section class="grid kpis">
      <div class="card kpi">
        <p class="kpi-label">Ventas totales</p>
        <p class="kpi-value">${{ totalSales.toFixed(2) }}</p>
      </div>
      <div class="card kpi">
        <p class="kpi-label">Órdenes hoy</p>
        <p class="kpi-value">{{ ordersToday }}</p>
      </div>
      <div class="card kpi">
        <p class="kpi-label">Ventas hoy</p>
        <p class="kpi-value">${{ salesToday.toFixed(2) }}</p>
      </div>
      <div class="card kpi">
        <p class="kpi-label">Facturas generadas</p>
        <p class="kpi-value">{{ bills.length }}</p>
      </div>
      <div class="card kpi">
        <p class="kpi-label">Productos con bajo stock</p>
        <p class="kpi-value">{{ lowStock.length }}</p>
      </div>
    </section>

    <section class="card chart-card">
      <header class="card-header">
        <h3>Ventas por {{ timeframe === 'year' ? 'año' : 'mes' }}</h3>
        <div class="segmented">
          <button
            class="segmented-btn"
            :class="{ active: timeframe === 'month' }"
            @click="timeframe = 'month'"
          >
            Mes
          </button>
          <button
            class="segmented-btn"
            :class="{ active: timeframe === 'year' }"
            @click="timeframe = 'year'"
          >
            Año
          </button>
        </div>
      </header>
      <div class="chart">
        <div v-if="!salesByPeriod.length" class="empty">Sin datos de ventas.</div>
        <div v-else class="line-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" @mouseleave="hoverPoint = null">
            <rect
              v-for="pt in chartSeries"
              :key="`hit-${pt.label}`"
              :x="pt.xStart"
              y="0"
              :width="pt.width"
              height="100"
              fill="transparent"
              @mouseenter="hoverPoint = pt"
            />
            <polyline
              :points="polylinePoints"
              fill="none"
              stroke="#3b82f6"
              stroke-width="0.5"
            />
            <circle
              v-for="pt in chartSeries"
              :key="pt.label"
              :cx="pt.x"
              :cy="pt.y"
              r="3"
              fill="#60a5fa"
              @mouseenter="hoverPoint = pt"
              @mouseleave="hoverPoint = null"
            />
            <g v-if="hoverPoint">
              <circle :cx="hoverPoint.x" :cy="hoverPoint.y" r="4" fill="#93c5fd" />
            </g>
          </svg>
          <div
            v-if="hoverPoint"
            class="tooltip"
            :style="{
              left: `calc(${hoverPoint.x}% )`,
              top: `calc(${hoverPoint.y}% )`,
            }"
          >
            <div class="tooltip-label">{{ hoverPoint.label }}</div>
            <div class="tooltip-value">${{ (hoverPoint.value ?? 0).toFixed(2) }}</div>
          </div>
          <div class="chart-labels" :style="{ '--points': chartSeries.length }">
            <span v-for="p in chartSeries" :key="p.label" class="chart-label">
              {{ p.label }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <div class="grid panels">
      <section class="card">
        <header class="card-header">
          <h3>Últimas órdenes</h3>
        </header>
        <ul class="list">
          <li v-for="o in recentOrders" :key="o.id_key ?? o.id ?? o.order_id">
            <div>
              <strong>Orden #{{ o.id_key ?? o.id ?? o.order_id ?? 's/n' }}</strong>
              <div class="muted">
                Total: ${{ o.total ?? 'N/D' }} · {{ formatDate(o.date) }} · Estado: {{ statusLabel(o.status) }}
              </div>
            </div>
            <RouterLink :to="`/orders/${o.id_key ?? o.id ?? o.order_id}`" class="link">Ver</RouterLink>
          </li>
          <li v-if="!recentOrders.length" class="empty">Sin órdenes recientes.</li>
        </ul>
      </section>

      <section class="card">
        <header class="card-header">
          <h3>Últimas facturas</h3>
        </header>
        <ul class="list">
          <li v-for="b in recentBills" :key="b.id_key ?? b.id">
            <div>
              <strong>Factura #{{ b.bill_number ?? b.id_key ?? b.id }}</strong>
              <div class="muted">
                Total: ${{ b.total ?? 'N/D' }} · {{ formatDate(b.date) }} · Cliente:
                {{ clientNameMap[b.client_id] ?? `#${b.client_id ?? 'N/D'}` }}
              </div>
            </div>
          </li>
          <li v-if="!recentBills.length" class="empty">Sin facturas recientes.</li>
        </ul>
      </section>

      <section class="card">
        <header class="card-header">
          <h3>Stock bajo</h3>
        </header>
        <ul class="list">
          <li v-for="p in lowStock" :key="p.id_key ?? p.id ?? p.product_id">
            <div>
              <strong>{{ p.name ?? 'Producto' }}</strong>
              <div class="muted">Stock: {{ p.stock ?? 'N/D' }}</div>
            </div>
            <RouterLink :to="`/products/${p.id_key ?? p.id ?? p.product_id}`" class="link">Ver</RouterLink>
          </li>
          <li v-if="!lowStock.length" class="empty">No hay alertas de stock.</li>
        </ul>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
  color: #e5e7eb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.title {
  margin: 0 0 0.2rem;
}

.subtitle {
  margin: 0;
  color: #9ca3af;
  font-size: 0.95rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.msg {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.msg-error {
  background: #451a1a;
  color: #fecaca;
  border: 1px solid #b91c1c;
}

.grid {
  display: grid;
  gap: 1rem;
}

.kpis {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.kpi {
  padding: 0.75rem;
}

.kpi-label {
  margin: 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

.kpi-value {
  margin: 0.1rem 0 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.card {
  border: 1px solid #1f2937;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
  background: #020617;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.chart-card {
  margin: 1rem 0;
}

.segmented {
  display: inline-flex;
  border: 1px solid #374151;
  border-radius: 999px;
  overflow: hidden;
}

.segmented-btn {
  background: transparent;
  border: none;
  color: #e5e7eb;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.segmented-btn.active {
  background: #3b82f6;
}

.chart {
  margin-top: 0.75rem;
  min-height: 160px;
}

.line-chart {
  display: grid;
  gap: 0.4rem;
  position: relative;
}

.line-chart svg {
  width: 100%;
  height: 260px;
  background: #0b1224;
  border: 1px solid #1f2937;
  border-radius: 0.5rem;
}

.chart-labels {
  display: grid;
  grid-template-columns: repeat(var(--points, 1), minmax(0, 1fr));
  gap: 0.1rem;
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
}

.line-chart svg,
.line-chart circle {
  transition: none;
}

.tooltip {
  position: absolute;
  transform: translate(-50%, -120%);
  background: #0b1224;
  border: 1px solid #1f2937;
  border-radius: 0.5rem;
  padding: 0.35rem 0.55rem;
  font-size: 0.85rem;
  color: #e5e7eb;
  pointer-events: none;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
}

.tooltip-label {
  color: #9ca3af;
  font-size: 0.8rem;
}

.tooltip-value {
  font-weight: 600;
}

.panels {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  margin-top: 1rem;
}

.list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.muted {
  color: #9ca3af;
  font-size: 0.85rem;
}

.link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.85rem;
}

.empty {
  color: #6b7280;
  font-size: 0.9rem;
}

.btn {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: none;
  background: #3b82f6;
  color: #e5e7eb;
  font-size: 0.9rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.05s ease,
    box-shadow 0.15s ease;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.6);
}

.btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.8);
}

.btn-secondary {
  background: #4b5563;
}

.btn-secondary:hover {
  background: #374151;
}

.btn-small {
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}
</style>
