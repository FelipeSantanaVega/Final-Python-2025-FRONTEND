<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const orders = ref([])
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const deletingOrderId = ref(null)
const confirmDeleteOrderId = ref(null)
const confirmDeleteOrderLabel = ref('')
const clients = ref([])
const clientsLoading = ref(false)
const clientsError = ref('')
const products = ref([])
const productsLoading = ref(false)
const productsError = ref('')
const discountPct = ref(0)

const form = ref({
  client_id: '',
  delivery_method: '',
  status: '',
})

const orderItems = ref([
  { product_id: '', quantity: 1 },
])

const deliveryOptions = [
  { label: 'Retiro auto (DRIVE_THRU)', value: 1 },
  { label: 'En mano (ON_HAND)', value: 2 },
  { label: 'Envío a domicilio (HOME_DELIVERY)', value: 3 },
]

const statusOptions = [
  { label: 'Pendiente', value: 1 },
  { label: 'En progreso', value: 2 },
  { label: 'Entregado', value: 3 },
  { label: 'Cancelado', value: 4 },
]

const filteredClients = computed(() => clients.value)
const sortedOrders = computed(() =>
  [...orders.value].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    if (dateA !== dateB) return dateB - dateA
    const idA = a.id_key ?? a.id ?? a.order_id ?? 0
    const idB = b.id_key ?? b.id ?? b.order_id ?? 0
    return idB - idA
  })
)
const productMap = computed(() =>
  (products.value || []).reduce((acc, p) => {
    const id = p.id_key ?? p.id ?? p.product_id
    if (id != null) acc[id] = p
    return acc
  }, {})
)

const computedSubtotal = computed(() =>
  orderItems.value.reduce((sum, item) => {
    const prod = productMap.value[item.product_id]
    const price = prod?.price ?? prod?.unit_price ?? 0
    const qty = Number(item.quantity) || 0
    return sum + price * qty
  }, 0)
)

const computedTotal = computed(() => {
  const pct = Number(discountPct.value) || 0
  const subtotal = computedSubtotal.value
  const discountAmount = pct > 0 ? (subtotal * pct) / 100 : 0
  return Math.max(subtotal - discountAmount, 0)
})

const clientNameMap = computed(() =>
  (clients.value || []).reduce((acc, c) => {
    const id = c.id_key ?? c.id
    if (id != null) acc[id] = `${c.name ?? ''} ${c.lastname ?? ''}`.trim()
    return acc
  }, {})
)

const deliveryLabel = (val) => {
  const found = deliveryOptions.find((o) => o.value === val)
  return found?.label ?? val ?? 'N/D'
}

const statusLabel = (val) => {
  const found = statusOptions.find((o) => o.value === val)
  return found?.label ?? val ?? 'N/D'
}

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadOrders() {
  loading.value = true
  clearMessages()
  try {
    const res = await fetch(`${API_BASE_URL}/orders/?skip=0&limit=100`)
    if (!res.ok) {
      throw new Error(`Error al cargar órdenes (HTTP ${res.status})`)
    }
    const data = await res.json()
    orders.value = Array.isArray(data) ? data : []
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al cargar órdenes'
  } finally {
    loading.value = false
  }
}

async function loadClients() {
  clientsLoading.value = true
  clientsError.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/clients?skip=0&limit=200`)
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

async function loadProducts() {
  productsLoading.value = true
  productsError.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/products/?skip=0&limit=200`)
    if (!res.ok) {
      throw new Error(`Error al cargar productos (HTTP ${res.status})`)
    }
    const data = await res.json()
    products.value = Array.isArray(data) ? data : []
  } catch (err) {
    productsError.value = err?.message || 'Error desconocido al cargar productos'
    products.value = []
  } finally {
    productsLoading.value = false
  }
}

function addOrderItem() {
  orderItems.value.push({ product_id: '', quantity: 1 })
}

function removeOrderItem(idx) {
  orderItems.value.splice(idx, 1)
  if (!orderItems.value.length) {
    orderItems.value.push({ product_id: '', quantity: 1 })
  }
}

function syncTotal() {
  // total now calculated client-side only
  return Number(computedTotal.value.toFixed(2))
}

async function createOrder() {
  clearMessages()
  const totalNumber = syncTotal()
  const clientId = Number(form.value.client_id)
  const deliveryMethod = Number(form.value.delivery_method)
  const status = Number(form.value.status)

  if (Number.isNaN(totalNumber) || totalNumber < 0) {
    errorMessage.value = 'El total debe ser un número mayor o igual a 0.'
    return
  }
  if (Number.isNaN(clientId) || clientId <= 0) {
    errorMessage.value = 'El cliente debe ser un ID válido.'
    return
  }
  if (Number.isNaN(deliveryMethod) || deliveryMethod <= 0) {
    errorMessage.value = 'Seleccioná un método de entrega.'
    return
  }
  if (Number.isNaN(status) || status <= 0) {
    errorMessage.value = 'Seleccioná un estado.'
    return
  }

  // Validación en cliente: no permitir cantidades mayores al stock disponible
  for (const item of orderItems.value) {
    const prod = productMap.value[item.product_id]
    const qty = Number(item.quantity) || 0
    if (prod && prod.stock != null && qty > prod.stock) {
      errorMessage.value = `No hay stock suficiente para ${prod.name ?? 'el producto'} (disponible: ${prod.stock}, solicitado: ${qty}).`
      return
    }
  }

  const payload = {
    total: totalNumber,
    client_id: clientId,
    delivery_method: deliveryMethod,
    status,
    discount_pct: Number(discountPct.value) || 0,
    items: orderItems.value
      .filter((it) => it.product_id && Number(it.quantity) > 0)
      .map((it) => ({
        product_id: Number(it.product_id),
        quantity: Number(it.quantity),
      })),
  }

  try {
    const res = await fetch(`${API_BASE_URL}/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let detail = `Error al crear orden (HTTP ${res.status})`
      try {
        const body = await res.json()
        if (Array.isArray(body.detail)) {
          detail = body.detail
            .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
            .join(' | ')
        } else if (typeof body.detail === 'object') {
          detail = JSON.stringify(body.detail)
        } else {
          detail = body.detail || body.message || detail
        }
      } catch {
        /* ignore */
      }
      if (detail && detail.toLowerCase().includes('stock')) {
        detail = 'No podés vender más de lo que hay en inventario. Revisá el stock y ajustá la cantidad.'
      }
      throw new Error(detail)
    }

    form.value = {
      client_id: '',
      delivery_method: '',
      status: '',
    }
    discountPct.value = 0
    orderItems.value = [{ product_id: '', quantity: 1 }]
    successMessage.value = 'Orden creada correctamente'
    window.dispatchEvent(new CustomEvent('order-updated'))
    await loadOrders()
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al crear orden'
  }
}

function requestDeleteOrder(order) {
  confirmDeleteOrderId.value = order?.id_key ?? order?.id ?? order?.order_id
  confirmDeleteOrderLabel.value = `Orden #${confirmDeleteOrderId.value ?? ''}`
  clearMessages()
}

function cancelDeleteOrder() {
  confirmDeleteOrderId.value = null
  confirmDeleteOrderLabel.value = ''
}

async function deleteOrder(id) {
  deletingOrderId.value = id
  clearMessages()

  try {
    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok && res.status !== 204) {
      let detail = ''
      try {
        const body = await res.json()
        detail = body.detail || body.message || ''
      } catch {
        /* ignore */
      }
      throw new Error(detail || `Error al eliminar orden (HTTP ${res.status})`)
    }

    successMessage.value = 'Orden eliminada correctamente'
    await loadOrders()
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al eliminar orden'
  } finally {
    deletingOrderId.value = null
    cancelDeleteOrder()
  }
}

onMounted(() => {
  loadOrders()
  loadClients()
  loadProducts()
})
</script>

<template>
  <section class="page">
    <h2 class="title">Órdenes</h2>
    <p class="subtitle">
      API base:
      <strong>{{ API_BASE_URL }}</strong>
    </p>

    <section class="messages">
      <p v-if="errorMessage" class="msg msg-error">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="msg msg-success">
        {{ successMessage }}
      </p>
    </section>

    <!-- Nueva orden -->
    <section class="card">
      <h3>Nueva orden</h3>
      <form @submit.prevent="createOrder" class="form">
        <div class="form-row-inline">
          <div class="form-row">
            <label>Cliente</label>
            <select v-model="form.client_id" required :disabled="clientsLoading">
              <option value="">
                Selecciona un cliente
              </option>
              <option
                v-for="c in filteredClients"
                :key="c.id_key ?? c.id"
                :value="c.id_key ?? c.id"
              >
                {{ c.name }} {{ c.lastname }} — #{{ c.id_key ?? c.id }}
              </option>
            </select>
            <small v-if="clientsError" class="hint hint-error">{{ clientsError }}</small>
            <small v-else-if="clientsLoading" class="hint">Cargando clientes...</small>
          </div>
          <div class="form-row">
            <label>Descuento % (opcional)</label>
            <input v-model="discountPct" type="number" min="0" max="100" step="0.01" placeholder="Ej: 10 para 10%" />
          </div>
          <div class="form-row">
            <label>Total</label>
            <input :value="computedTotal.toFixed(2)" readonly />
            <small class="hint">Se calcula automáticamente (envío = 0).</small>
          </div>
        </div>

        <div class="form-row-inline">
          <div class="form-row">
            <label>Método de entrega</label>
            <select v-model="form.delivery_method" required>
              <option value="">Selecciona</option>
              <option v-for="opt in deliveryOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <label>Estado</label>
            <select v-model="form.status" required>
              <option value="">Selecciona</option>
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="order-items">
          <div class="order-items-header">
            <div>
              <h4>Productos de la orden</h4>
              <p class="hint">Seleccioná productos y cantidades. El total se calcula automáticamente.</p>
              <p class="hint" v-if="productsError">{{ productsError }}</p>
              <p class="hint" v-else-if="productsLoading">Cargando productos...</p>
            </div>
            <button type="button" class="btn btn-secondary btn-small" @click="addOrderItem" :disabled="productsLoading">
              + Agregar producto
            </button>
          </div>

          <div class="order-item-row" v-for="(item, idx) in orderItems" :key="idx">
            <select v-model="item.product_id" :disabled="productsLoading">
              <option value="">Selecciona producto</option>
              <option
                v-for="p in products"
                :key="p.id_key ?? p.id ?? p.product_id"
                :value="p.id_key ?? p.id ?? p.product_id"
              >
                {{ p.name || 'Producto' }} — ${{ p.price ?? p.unit_price ?? 'N/D' }}
              </option>
            </select>
            <input v-model.number="item.quantity" type="number" min="1" placeholder="Cantidad" />
            <span class="item-subtotal">
              Subtotal: {{
                ((productMap[item.product_id]?.price ?? productMap[item.product_id]?.unit_price ?? 0) *
                  (item.quantity || 0)
              ).toFixed(2)
              }}
            </span>
            <button
              type="button"
              class="btn btn-danger btn-small"
              @click="removeOrderItem(idx)"
              :disabled="orderItems.length === 1"
            >
              Eliminar
            </button>
          </div>
          <div class="order-total">
            <strong>Total calculado:</strong> ${{ computedTotal.toFixed(2) }}
          </div>
        </div>

        <button type="submit" class="btn">
          Crear orden
        </button>
      </form>
    </section>

    <!-- Listado -->
    <section class="card">
      <header class="card-header">
        <h3>Listado de órdenes</h3>
        <button class="btn btn-secondary" @click="loadOrders" :disabled="loading">
          {{ loading ? 'Cargando...' : 'Recargar' }}
        </button>
      </header>

      <p v-if="!loading && (!orders || !orders.length)" class="empty">
        No hay órdenes cargadas.
      </p>

      <ul v-if="orders && orders.length" class="order-list">
        <li v-for="o in sortedOrders" :key="o.id_key ?? o.id ?? o.order_id" class="order-item">
          <div class="order-main">
            <div>
              <div class="order-title">
                <strong>Orden #{{ o.id_key ?? o.id ?? o.order_id ?? 's/n' }}</strong>
                <span class="order-sub">
                  Cliente: {{ clientNameMap[o.client_id] ?? `#${o.client_id ?? 'N/D'}` }} · Factura: {{ o.bill_id ?? 'N/D' }}
                </span>
              </div>
              <div class="order-meta">
                Total: {{ o.total ?? 'N/D' }} · Entrega: {{ deliveryLabel(o.delivery_method) }} · Estado: {{ statusLabel(o.status) }}
              </div>
            </div>
          </div>

          <div class="order-actions">
            <RouterLink
              :to="`/orders/${o.id_key ?? o.id ?? o.order_id}`"
              class="btn btn-secondary btn-small"
            >
              Ver detalle
            </RouterLink>
            <button
              class="btn btn-danger btn-small"
              @click="requestDeleteOrder(o)"
              :disabled="deletingOrderId === (o.id_key ?? o.id ?? o.order_id)"
            >
              {{
                deletingOrderId === (o.id_key ?? o.id ?? o.order_id)
                  ? 'Eliminando...'
                  : 'Eliminar'
              }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </section>

  <div
    v-if="confirmDeleteOrderId !== null"
    class="modal-backdrop"
    @click.self="cancelDeleteOrder"
  >
    <div class="modal">
      <header class="modal-header">
        <h3>Eliminar orden</h3>
        <button class="btn btn-secondary btn-small" @click="cancelDeleteOrder">
          Cancelar
        </button>
      </header>
      <div class="modal-body">
        <p class="hint">
          Vas a eliminar:
          <strong>{{ confirmDeleteOrderLabel || `#${confirmDeleteOrderId}` }}</strong>
        </p>
        <div class="modal-actions">
          <button class="btn btn-danger btn-small" @click="deleteOrder(confirmDeleteOrderId)">
            Confirmar
          </button>
          <button class="btn btn-secondary btn-small" @click="cancelDeleteOrder">
            Volver
          </button>
        </div>
      </div>
    </div>
  </div>
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

.msg-success {
  background: #064e3b;
  color: #bbf7d0;
  border: 1px solid #16a34a;
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

.form {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.75rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.form-row-inline {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .form-row-inline {
    grid-template-columns: minmax(0, 1fr);
  }
}

label {
  font-weight: 600;
  color: #e5e7eb;
}

input,
select {
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #374151;
  font-size: 0.9rem;
  background: #020617;
  color: #e5e7eb;
}

input:focus,
select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
}

.stacked-select {
  display: grid;
  gap: 0.4rem;
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

.btn-danger {
  background: #dc2626;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-small {
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}

.order-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.order-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #1f2937;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.order-item:last-child {
  border-bottom: none;
}

.order-title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.order-sub {
  font-size: 0.82rem;
  color: #9ca3af;
}

.order-meta {
  font-size: 0.85rem;
  color: #9ca3af;
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.empty {
  margin-top: 0.75rem;
  color: #6b7280;
}

.hint {
  font-size: 0.8rem;
  color: #9ca3af;
}

.hint-error {
  color: #fca5a5;
}

.order-items {
  margin-top: 0.5rem;
  border: 1px solid #1f2937;
  border-radius: 0.6rem;
  padding: 0.75rem;
  background: #0b1224;
  display: grid;
  gap: 0.5rem;
}

.order-items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.order-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 0.7fr) auto auto;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 900px) {
  .order-item-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

.item-subtotal {
  font-size: 0.85rem;
  color: #9ca3af;
}

.order-total {
  margin-top: 0.35rem;
  font-size: 0.95rem;
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
  width: min(500px, 100%);
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

.modal-body {
  display: grid;
  gap: 0.6rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
