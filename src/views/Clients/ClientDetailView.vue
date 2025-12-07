<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddressForm from '../../components/clients/AddressForm.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const route = useRoute()
const router = useRouter()

const clientId = computed(() => route.params.id)

const client = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const showNewAddressForm = ref(false)
const deletingAddressId = ref(null)
const confirmDeleteAddressId = ref(null)
const confirmDeleteAddressLabel = ref('')

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadClient() {
  loading.value = true
  clearMessages()
  try {
    const res = await fetch(`${API_BASE_URL}/clients/${clientId.value}`)
    if (!res.ok) {
      throw new Error(`Error al cargar el cliente (HTTP ${res.status})`)
    }
    client.value = await res.json()
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al cargar el cliente'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'clients-list' })
}

function requestDeleteAddress(addr) {
  if (!addr) return
  confirmDeleteAddressId.value = addr.id_key ?? addr.id
  confirmDeleteAddressLabel.value = `${addr.street ?? 'Dirección'} ${addr.number ?? ''}`.trim()
  clearMessages()
}

async function deleteAddress(id) {
  if (id === undefined || id === null) {
    errorMessage.value = 'No se pudo eliminar: falta el ID de la dirección.'
    return
  }
  clearMessages()

  deletingAddressId.value = id
  try {
    const res = await fetch(`${API_BASE_URL}/addresses/${id}`, {
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
      throw new Error(detail || `Error al eliminar dirección (HTTP ${res.status})`)
    }

    successMessage.value = 'Dirección eliminada correctamente'
    await loadClient()
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al eliminar dirección'
  } finally {
    deletingAddressId.value = null
    confirmDeleteAddressId.value = null
    confirmDeleteAddressLabel.value = ''
  }
}

function handleAddressSaved() {
  showNewAddressForm.value = false
  successMessage.value = 'Dirección creada correctamente'
  loadClient()
}

onMounted(loadClient)
</script>

<template>
  <section class="page">
    <header class="detail-header">
      <div>
        <h2 class="title">
          Detalle de cliente
        </h2>
        <p class="subtitle">
          ID: <strong>{{ clientId }}</strong> — API: <strong>{{ API_BASE_URL }}</strong>
        </p>
      </div>

      <button class="btn btn-secondary btn-small" @click="goBack">
        ← Volver al listado
      </button>
    </header>

    <section class="messages">
      <p v-if="errorMessage" class="msg msg-error">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="msg msg-success">
        {{ successMessage }}
      </p>
    </section>

    <section v-if="loading" class="card">
      Cargando cliente...
    </section>

    <template v-else-if="client">
      <section class="detail-grid">
        <!-- Datos del cliente -->
        <article class="card">
          <h3>Datos del cliente</h3>
          <div class="kv">
            <div class="kv-row">
              <span class="kv-label">Nombre</span>
              <span class="kv-value">{{ client.name }} {{ client.lastname }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Email</span>
              <span class="kv-value">{{ client.email }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Teléfono</span>
              <span class="kv-value">{{ client.telephone }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">ID interno</span>
              <span class="kv-value">#{{ client.id_key }}</span>
            </div>
          </div>
        </article>

        <!-- Direcciones -->
        <article class="card">
          <header class="card-header">
            <h3>Direcciones</h3>

            <button
              v-if="!showNewAddressForm"
              class="btn btn-secondary btn-small"
              @click="showNewAddressForm = true"
            >
              + Nueva dirección
            </button>
          </header>

          <div v-if="showNewAddressForm" class="address-form-wrapper">
            <AddressForm
              :client-id="client.id_key"
              @saved="handleAddressSaved"
              @cancel="showNewAddressForm = false"
            />
          </div>

          <p
            v-if="!client.addresses || !Array.isArray(client.addresses) || !client.addresses.length"
            class="empty"
          >
            Este cliente no tiene direcciones cargadas.
          </p>

          <ul
            v-else
            class="sub-list"
          >
            <li
              v-for="addr in client.addresses"
              :key="addr.id_key ?? addr.id ?? `${client.id_key}-addr-${addr.street}-${addr.number}`"
              class="address-item"
            >
              <div>
                <strong>{{ addr.street }} {{ addr.number }}</strong>
                <span v-if="addr.city"> — {{ addr.city }}</span>
              </div>

              <button
                class="btn btn-danger btn-small"
                @click="requestDeleteAddress(addr)"
                :disabled="deletingAddressId === (addr.id_key ?? addr.id)"
              >
                {{ deletingAddressId === (addr.id_key ?? addr.id) ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </li>
          </ul>
        </article>

        <!-- Órdenes -->
        <article class="card">
          <header class="card-header">
            <h3>Órdenes</h3>
            <!-- Más adelante: botón "Nueva orden" -->
          </header>

          <p
            v-if="!client.orders || !Array.isArray(client.orders) || !client.orders.length"
            class="empty"
          >
            Este cliente no tiene órdenes registradas.
          </p>

          <ul
            v-else
            class="sub-list"
          >
            <li
              v-for="order in client.orders"
              :key="order.id_key ?? order.order_id ?? `${client.id_key}-order-${order}`"
            >
              Pedido
              <strong>#{{ order.id_key ?? order.order_id ?? 's/n' }}</strong>
              — Total:
              {{ order.total ?? order.total_amount ?? 'N/D' }}
              — Estado:
              {{ order.status ?? order.state ?? 'N/D' }}
            </li>
          </ul>
        </article>
      </section>

      <div
        v-if="confirmDeleteAddressId !== null"
        class="modal-backdrop"
        @click.self="confirmDeleteAddressId = null"
      >
        <div class="modal">
          <header class="modal-header">
            <h3>Eliminar dirección</h3>
            <button class="btn btn-secondary btn-small" @click="confirmDeleteAddressId = null">
              Cancelar
            </button>
          </header>
          <div class="modal-body">
            <p class="hint">
              Vas a eliminar:
              <strong>{{ confirmDeleteAddressLabel || 'Esta dirección' }}</strong>
            </p>
            <div class="modal-actions">
              <button class="btn btn-danger btn-small" @click="deleteAddress(confirmDeleteAddressId)">
                Confirmar
              </button>
              <button class="btn btn-secondary btn-small" @click="confirmDeleteAddressId = null">
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <section v-else class="card">
      No se encontró el cliente.
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

.title {
  margin-bottom: 0.25rem;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 0;
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

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
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
  margin-bottom: 0.5rem;
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

.address-form-wrapper {
  margin-bottom: 0.75rem;
}

.address-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
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

.empty {
  margin-top: 0.25rem;
  color: #6b7280;
}

.sub-list {
  margin: 0.25rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}

.sub-list li {
  margin-bottom: 0.2rem;
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
