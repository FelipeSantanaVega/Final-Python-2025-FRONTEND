<script setup>
import { ref, onMounted, computed } from 'vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const bills = ref([])
const loading = ref(false)
const errorMessage = ref('')
const expanded = ref({})
const clients = ref([])
const clientsLoading = ref(false)
const clientsError = ref('')
const selectedBill = ref(null)
const showModal = ref(false)
const orders = ref([])
const orderDetails = ref([])
const products = ref([])
const ordersLoading = ref(false)
const detailsLoading = ref(false)
const productsLoading = ref(false)
const orderedBills = computed(() =>
  [...bills.value].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    if (dateA !== dateB) return dateB - dateA
    const idA = a.id_key ?? a.id ?? 0
    const idB = b.id_key ?? b.id ?? 0
    return idB - idA
  })
)
const clientNameMap = computed(() =>
  (clients.value || []).reduce((acc, c) => {
    const id = c.id_key ?? c.id
    if (id != null) acc[id] = `${c.name ?? ''} ${c.lastname ?? ''}`.trim()
    return acc
  }, {})
)
const orderByBillId = computed(() =>
  (orders.value || []).reduce((acc, o) => {
    const billId = o.bill_id
    if (billId != null) acc[billId] = o
    return acc
  }, {})
)
const productMap = computed(() =>
  (products.value || []).reduce((acc, p) => {
    const id = p.id_key ?? p.id ?? p.product_id
    if (id != null) acc[id] = p
    return acc
  }, {})
)

const itemsForBill = (bill) => {
  const billId = bill.id_key ?? bill.id
  const order = orderByBillId.value[billId]
  if (!order) return []
  return (orderDetails.value || []).filter((d) => d.order_id === (order.id_key ?? order.id))
}

const paymentLabels = {
  1: 'Efectivo',
  2: 'Tarjeta',
  3: 'Débito',
  4: 'Crédito',
  5: 'Transferencia',
}

function paymentLabel(val) {
  return paymentLabels[val] || val || 'N/D'
}

function toggleExpanded(id) {
  expanded.value[id] = !expanded.value[id]
}

function openModal(bill) {
  selectedBill.value = bill
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedBill.value = null
}

async function loadBills() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/bills/?skip=0&limit=200`)
    if (!res.ok) {
      throw new Error(`Error al cargar facturas (HTTP ${res.status})`)
    }
    const data = await res.json()
    bills.value = Array.isArray(data) ? data : []
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al cargar facturas'
  } finally {
    loading.value = false
  }
}

async function loadClients() {
  clientsLoading.value = true
  clientsError.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/clients?skip=0&limit=300`)
    if (!res.ok) {
      throw new Error(`Error al cargar clientes (HTTP ${res.status})`)
    }
    const data = await res.json()
    clients.value = Array.isArray(data) ? data : []
  } catch (err) {
    clientsError.value = err?.message || 'Error desconocido al cargar clientes'
    clients.value = []
  } finally {
    clientsLoading.value = false
  }
}

async function loadOrders() {
  ordersLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/orders/?skip=0&limit=300`)
    if (!res.ok) throw new Error(`Error al cargar órdenes (HTTP ${res.status})`)
    const data = await res.json()
    orders.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(err)
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

async function loadOrderDetails() {
  detailsLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/order_details/?skip=0&limit=500`)
    if (!res.ok) throw new Error(`Error al cargar detalles de órdenes (HTTP ${res.status})`)
    const data = await res.json()
    orderDetails.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(err)
    orderDetails.value = []
  } finally {
    detailsLoading.value = false
  }
}

async function loadProducts() {
  productsLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/products/?skip=0&limit=300`)
    if (!res.ok) throw new Error(`Error al cargar productos (HTTP ${res.status})`)
    const data = await res.json()
    products.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(err)
    products.value = []
  } finally {
    productsLoading.value = false
  }
}

onMounted(loadBills)
onMounted(loadClients)
onMounted(loadOrders)
onMounted(loadOrderDetails)
onMounted(loadProducts)
</script>

<template>
  <section class="page">
    <h2 class="title">Facturas</h2>
    <p class="subtitle">
      API base: <strong>{{ API_BASE_URL }}</strong>
    </p>

    <section class="messages">
      <p v-if="errorMessage" class="msg msg-error">
        {{ errorMessage }}
      </p>
    </section>

    <section class="card">
      <header class="card-header">
        <h3>Listado de facturas</h3>
        <button class="btn btn-secondary" @click="loadBills" :disabled="loading">
          {{ loading ? 'Cargando...' : 'Recargar' }}
        </button>
      </header>

      <p v-if="!loading && (!bills || !bills.length)" class="empty">
        No hay facturas registradas.
      </p>

      <ul v-if="bills && bills.length" class="bill-list">
        <li v-for="b in orderedBills" :key="b.id_key ?? b.id" class="bill-item">
          <div class="bill-main">
            <div class="bill-title">
              <strong>#{{ b.bill_number ?? b.id_key ?? b.id }}</strong>
              <span class="bill-sub">
                Cliente: {{ clientNameMap[b.client_id] ?? `#${b.client_id ?? 'N/D'}` }} · Fecha: {{ b.date ?? 'N/D' }}
              </span>
            </div>
            <div class="bill-meta">
              Total: {{ b.total ?? 'N/D' }} · Descuento: {{ b.discount ?? 0 }} · Pago: {{ paymentLabel(b.payment_type) }}
            </div>
          </div>
          <div class="bill-actions">
            <button
              class="btn btn-secondary btn-small"
              @click="openModal(b)"
            >
              Ver detalle
            </button>
          </div>
        </li>
      </ul>
    </section>

    <div v-if="showModal && selectedBill" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <header class="modal-header">
          <h3>Factura #{{ selectedBill.bill_number ?? selectedBill.id_key ?? selectedBill.id }}</h3>
          <button class="btn btn-secondary btn-small" @click="closeModal">Cerrar</button>
        </header>
        <div class="modal-body">
          <div class="kv">
            <div class="kv-row">
              <span class="kv-label">Cliente</span>
              <span class="kv-value">{{ clientNameMap[selectedBill.client_id] ?? `#${selectedBill.client_id ?? 'N/D'}` }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Fecha</span>
              <span class="kv-value">{{ selectedBill.date ?? 'N/D' }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Total</span>
              <span class="kv-value">{{ selectedBill.total ?? 'N/D' }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Descuento</span>
              <span class="kv-value">{{ selectedBill.discount ?? 0 }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Pago</span>
              <span class="kv-value">{{ paymentLabel(selectedBill.payment_type) }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">ID factura</span>
              <span class="kv-value">{{ selectedBill.id_key ?? selectedBill.id }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Número de factura</span>
              <span class="kv-value">{{ selectedBill.bill_number ?? 'N/D' }}</span>
            </div>
          </div>

          <div class="items-card">
            <h4>Productos de la orden</h4>
            <p v-if="detailsLoading || ordersLoading || productsLoading" class="hint">Cargando items...</p>
            <p v-else-if="!itemsForBill(selectedBill).length" class="hint">No hay items asociados.</p>
            <ul v-else class="items-list">
              <li v-for="d in itemsForBill(selectedBill)" :key="d.id_key ?? `${d.order_id}-${d.product_id}`">
                <span class="item-name">{{ productMap[d.product_id]?.name ?? `Producto #${d.product_id}` }}</span>
                <span class="item-qty">Cantidad: {{ d.quantity }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
  color: #e5e7eb;
}

.title {
  margin-bottom: 0.25rem;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #9ca3af;
  font-size: 0.95rem;
}

.messages {
  min-height: 1.5rem;
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

.card {
  border: 1px solid #1f2937;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
  margin-bottom: 1.5rem;
  background: #020617;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
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

.btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
  box-shadow: none;
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

.bill-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.bill-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #1f2937;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.bill-item:last-child {
  border-bottom: none;
}

.bill-title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.bill-sub {
  font-size: 0.82rem;
  color: #9ca3af;
}

.bill-meta {
  font-size: 0.85rem;
  color: #9ca3af;
}

.bill-extra {
  margin-top: 0.35rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid #1f2937;
  border-radius: 0.5rem;
  background: #0b1224;
  font-size: 0.85rem;
  color: #d1d5db;
  display: grid;
  gap: 0.2rem;
}

.bill-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.empty {
  margin-top: 0.75rem;
  color: #6b7280;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 50;
}

.modal {
  width: min(600px, 100%);
  background: #0b1224;
  border: 1px solid #1f2937;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.modal-body .kv {
  display: grid;
  gap: 0.4rem;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

.kv-label {
  color: #9ca3af;
}

.kv-value {
  font-weight: 500;
}

.items-card {
  margin-top: 1rem;
  border-top: 1px solid #1f2937;
  padding-top: 0.75rem;
  display: grid;
  gap: 0.35rem;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0;
  display: grid;
  gap: 0.35rem;
}

.items-list li {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.item-name {
  font-weight: 600;
}

.item-qty {
  color: #9ca3af;
}
</style>
