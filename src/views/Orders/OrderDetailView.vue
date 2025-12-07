<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.params.id)

const order = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const editError = ref('')
const editing = ref(false)
const saving = ref(false)

const editForm = ref({
  total: '',
  client_id: '',
  bill_id: '',
  delivery_method: '',
  status: '',
})
const clients = ref([])
const clientsLoading = ref(false)
const clientsError = ref('')
const filteredClients = computed(() => clients.value)
const clientNameMap = computed(() =>
  (clients.value || []).reduce((acc, c) => {
    const id = c.id_key ?? c.id
    if (id != null) acc[id] = `${c.name ?? ''} ${c.lastname ?? ''}`.trim()
    return acc
  }, {})
)
const products = ref([])
const orderDetails = ref([])
const productsLoading = ref(false)
const orderDetailsLoading = ref(false)
const productMap = computed(() =>
  (products.value || []).reduce((acc, p) => {
    const id = p.id_key ?? p.id ?? p.product_id
    if (id != null) acc[id] = p
    return acc
  }, {})
)
const detailsForOrder = computed(() =>
  (orderDetails.value || []).filter(
    (d) => d.order_id === (order.value?.id_key ?? order.value?.id ?? Number(orderId.value))
  )
)

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

function goBack() {
  router.push({ name: 'orders-list' })
}

const formattedDate = computed(() => {
  if (!order.value?.date) return 'N/D'
  const dateObj = new Date(order.value.date)
  if (isNaN(dateObj.getTime())) return order.value.date
  const pad = (n) => String(n).padStart(2, '0')
  const d = pad(dateObj.getDate())
  const m = pad(dateObj.getMonth() + 1)
  const y = dateObj.getFullYear()
  const hh = pad(dateObj.getHours())
  const mm = pad(dateObj.getMinutes())
  return `${d}/${m}/${y} ${hh}:${mm}`
})

const deliveryLabel = computed(() => {
  const found = deliveryOptions.find((o) => o.value === order.value?.delivery_method)
  return found?.label ?? order.value?.delivery_method ?? 'N/D'
})

const statusLabel = computed(() => {
  const found = statusOptions.find((o) => o.value === order.value?.status)
  return found?.label ?? order.value?.status ?? 'N/D'
})

function startEdit() {
  if (!order.value) return
  editForm.value = {
    total: order.value.total ?? '',
    client_id: order.value.client_id ?? '',
    bill_id: order.value.bill_id ?? '',
    delivery_method: order.value.delivery_method ?? '',
    status: order.value.status ?? '',
  }
  editing.value = true
  editError.value = ''
  successMessage.value = ''
}

function cancelEdit() {
  editing.value = false
  saving.value = false
  editError.value = ''
}

async function loadOrder() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId.value}`)
    if (!res.ok) {
      throw new Error(`Error al cargar orden (HTTP ${res.status})`)
    }
    order.value = await res.json()
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al cargar orden'
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
  try {
    const res = await fetch(`${API_BASE_URL}/products/?skip=0&limit=300`)
    if (!res.ok) {
      throw new Error(`Error al cargar productos (HTTP ${res.status})`)
    }
    const data = await res.json()
    products.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(err)
  } finally {
    productsLoading.value = false
  }
}

async function loadOrderDetails() {
  orderDetailsLoading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/order_details/?skip=0&limit=500`)
    if (!res.ok) {
      throw new Error(`Error al cargar detalles de orden (HTTP ${res.status})`)
    }
    const data = await res.json()
    orderDetails.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn(err)
  } finally {
    orderDetailsLoading.value = false
  }
}

async function saveOrder() {
  if (!order.value) return
  editError.value = ''
  successMessage.value = ''

  const totalNumber = Number(editForm.value.total)
  const clientId = Number(editForm.value.client_id)
  const billId = Number(editForm.value.bill_id)
  const deliveryMethod = Number(editForm.value.delivery_method)
  const status = Number(editForm.value.status)

  if (Number.isNaN(totalNumber) || totalNumber < 0) {
    editError.value = 'El total debe ser un número mayor o igual a 0.'
    return
  }
  if (Number.isNaN(clientId) || clientId <= 0) {
    editError.value = 'El cliente debe ser un ID válido.'
    return
  }
  if (Number.isNaN(billId) || billId <= 0) {
    editError.value = 'La factura debe ser un ID válido.'
    return
  }
  if (Number.isNaN(deliveryMethod) || deliveryMethod <= 0) {
    editError.value = 'Seleccioná un método de entrega.'
    return
  }
  if (Number.isNaN(status) || status <= 0) {
    editError.value = 'Seleccioná un estado.'
    return
  }

  const payload = {
    total: totalNumber,
    client_id: clientId,
    bill_id: billId,
    delivery_method: deliveryMethod,
    status,
  }

  saving.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let detail = `Error al actualizar orden (HTTP ${res.status})`
      try {
        const body = await res.json()
        if (Array.isArray(body.detail)) {
          detail = body.detail.map((d) => d.msg || d.detail || '').join(' | ')
        } else {
          detail = body.detail || body.message || detail
        }
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }

    const updated = await res.json()
    order.value = updated
    successMessage.value = 'Orden actualizada correctamente'
    editing.value = false
  } catch (err) {
    editError.value = err?.message || 'Error desconocido al actualizar orden'
  } finally {
    saving.value = false
  }
}

async function deleteOrder() {
  if (!order.value) return
  const confirmed = window.confirm('¿Seguro que querés eliminar esta orden?')
  if (!confirmed) return

  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId.value}`, {
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

    router.push({ name: 'orders-list' })
  } catch (err) {
    editError.value = err?.message || 'Error desconocido al eliminar orden'
  }
}

onMounted(() => {
  loadOrder()
  loadClients()
  loadProducts()
  loadOrderDetails()
})
</script>

<template>
  <section class="page">
    <header class="detail-header">
      <div>
        <h2 class="title">
          Detalle de orden
        </h2>
        <p class="subtitle">
          ID: <strong>{{ orderId }}</strong> — API: <strong>{{ API_BASE_URL }}</strong>
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-danger btn-small" @click="deleteOrder">
          Eliminar
        </button>
        <button class="btn btn-secondary btn-small" @click="goBack">
          ← Volver al listado
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="msg msg-error">
      {{ errorMessage }}
    </p>
    <p v-if="editError" class="msg msg-error">
      {{ editError }}
    </p>
    <p v-if="successMessage" class="msg msg-success">
      {{ successMessage }}
    </p>

    <section v-if="loading" class="card">
      Cargando orden...
    </section>

    <section v-else-if="order" class="card">
      <div class="card-header">
        <h3>Datos principales</h3>
        <div class="btn-group">
          <button
            v-if="!editing"
            class="btn btn-small"
            @click="startEdit"
          >
            Editar
          </button>
          <template v-else>
            <button
              class="btn btn-secondary btn-small"
              type="button"
              @click="cancelEdit"
              :disabled="saving"
            >
              Cancelar
            </button>
            <button
              class="btn btn-small"
              type="button"
              @click="saveOrder"
              :disabled="saving"
            >
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </template>
        </div>
      </div>

      <div class="kv">
        <div class="kv-row">
          <span class="kv-label">Total</span>
          <span class="kv-value" v-if="!editing">
            {{ order.total ?? 'N/D' }}
          </span>
          <input v-else v-model="editForm.total" type="number" min="0" step="0.01" />
        </div>
        <div class="kv-row">
          <span class="kv-label">Cliente</span>
          <span class="kv-value" v-if="!editing">
            {{ clientNameMap[order.client_id] ?? `#${order.client_id ?? 'N/D'}` }}
          </span>
          <div v-else class="stacked-select">
            <select v-model="editForm.client_id" :disabled="clientsLoading">
              <option value="">Selecciona un cliente</option>
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
        </div>
        <div class="kv-row">
          <span class="kv-label">Factura</span>
          <span class="kv-value" v-if="!editing">
            {{ order.bill_id ?? 'N/D' }}
          </span>
          <input v-else v-model="editForm.bill_id" type="number" min="1" />
        </div>
        <div class="kv-row">
          <span class="kv-label">Método de entrega</span>
          <span class="kv-value" v-if="!editing">
            {{ deliveryLabel }}
          </span>
          <select v-else v-model="editForm.delivery_method">
            <option value="">Selecciona</option>
            <option v-for="opt in deliveryOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="kv-row">
          <span class="kv-label">Estado</span>
          <span class="kv-value" v-if="!editing">
            {{ statusLabel }}
          </span>
          <select v-else v-model="editForm.status">
            <option value="">Selecciona</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="kv-row">
          <span class="kv-label">Fecha</span>
          <span class="kv-value">
            {{ formattedDate }}
          </span>
        </div>
      </div>

      <div class="items-card">
        <h4>Productos en esta orden</h4>
        <p v-if="orderDetailsLoading" class="hint">Cargando productos...</p>
        <p v-else-if="!detailsForOrder.length" class="hint">No hay ítems asociados.</p>
        <ul v-else class="items-list">
          <li v-for="d in detailsForOrder" :key="d.id_key ?? `${d.order_id}-${d.product_id}`">
            <span class="item-name">{{ productMap[d.product_id]?.name ?? `Producto #${d.product_id}` }}</span>
            <span class="item-qty">Cantidad: {{ d.quantity }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section v-else class="card">
      No se encontró la orden.
    </section>
  </section>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1rem 3rem;
  color: #e5e7eb;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.title {
  margin-bottom: 0.25rem;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 0;
  color: #9ca3af;
  font-size: 0.95rem;
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
  background: #020617;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.kv {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
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

.hint {
  font-size: 0.8rem;
  color: #9ca3af;
}

.hint-error {
  color: #fca5a5;
}

.stacked-select {
  display: grid;
  gap: 0.4rem;
}

.stacked-select input {
  width: 100%;
}

.kv input,
.kv select {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #374151;
  font-size: 0.9rem;
  background: #020617;
  color: #e5e7eb;
}

.kv input:focus,
.kv select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
}

.btn-group {
  display: flex;
  gap: 0.5rem;
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
</style>
