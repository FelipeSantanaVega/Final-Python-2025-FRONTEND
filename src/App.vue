<script setup>
import { ref, onMounted } from 'vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// estado general
const clients = ref([])
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// formulario nuevo cliente
const clientForm = ref({
  name: '',
  lastname: '',
  email: '',
  telephone: '',
})

// para mostrar que se está eliminando un cliente puntual
const deletingClientId = ref(null)

// helpers
function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

// cargar clientes
async function loadClients() {
  loading.value = true
  clearMessages()
  try {
    const res = await fetch(`${API_BASE_URL}/clients?skip=0&limit=100`)
    if (!res.ok) {
      throw new Error(`Error al cargar clientes (HTTP ${res.status})`)
    }
    clients.value = await res.json()
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al cargar clientes'
  } finally {
    loading.value = false
  }
}

// crear cliente
async function createClient() {
  clearMessages()
  try {
    const res = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientForm.value),
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = body.detail || body.message || ''
      } catch {
        /* ignore */
      }
      throw new Error(detail || `Error al crear cliente (HTTP ${res.status})`)
    }

    // limpiar formulario
    clientForm.value = {
      name: '',
      lastname: '',
      email: '',
      telephone: '',
    }

    successMessage.value = 'Cliente creado correctamente'
    await loadClients()
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al crear cliente'
  }
}

// eliminar cliente
async function deleteClient(id) {
  clearMessages()

  const confirmed = window.confirm('¿Seguro que querés eliminar este cliente?')
  if (!confirmed) return

  deletingClientId.value = id
  try {
    const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
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
      throw new Error(detail || `Error al eliminar cliente (HTTP ${res.status})`)
    }

    successMessage.value = 'Cliente eliminado correctamente'
    await loadClients()
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al eliminar cliente'
  } finally {
    deletingClientId.value = null
  }
}

onMounted(loadClients)
</script>

<template>
  <main class="page">
    <h1 class="title">Clientes – Front Final 2025</h1>
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

    <!-- NUEVO CLIENTE -->
    <section class="card">
      <h2>Nuevo cliente</h2>
      <form @submit.prevent="createClient" class="form">
        <div class="form-row">
          <label>Nombre</label>
          <input v-model="clientForm.name" required />
        </div>
        <div class="form-row">
          <label>Apellido</label>
          <input v-model="clientForm.lastname" required />
        </div>
        <div class="form-row">
          <label>Email</label>
          <input v-model="clientForm.email" type="email" required />
        </div>
        <div class="form-row">
          <label>Teléfono</label>
          <input v-model="clientForm.telephone" />
        </div>

        <button type="submit" class="btn">
          Crear cliente
        </button>
      </form>
    </section>

    <!-- LISTADO DE CLIENTES -->
    <section class="card">
      <header class="card-header">
        <h2>Listado de clientes</h2>
        <button class="btn btn-secondary" @click="loadClients" :disabled="loading">
          {{ loading ? 'Cargando...' : 'Recargar' }}
        </button>
      </header>

      <p v-if="!loading && (!clients || !clients.length)" class="empty">
        No hay clientes cargados.
      </p>

      <ul v-if="clients && clients.length" class="client-list">
        <li v-for="c in clients" :key="c.id_key" class="client-item">
          <div class="client-header">
            <div>
              <div class="client-main">
                <strong>{{ c.name }} {{ c.lastname }}</strong>
                <span class="client-id">#{{ c.id_key }}</span>
              </div>
              <div class="client-sub">
                {{ c.email }} — {{ c.telephone }}
              </div>
            </div>

            <button
              class="btn btn-danger"
              @click="deleteClient(c.id_key)"
              :disabled="deletingClientId === c.id_key"
            >
              {{ deletingClientId === c.id_key ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>

          <!-- ADDRESSES -->
          <div
            v-if="Array.isArray(c.addresses) && c.addresses.length"
            class="subsection"
          >
            <h3>Direcciones ({{ c.addresses.length }})</h3>
            <ul class="sub-list">
              <li
                v-for="addr in c.addresses"
                :key="addr.id_key ?? `${c.id_key}-addr-${addr.street}-${addr.number}`"
              >
                {{ addr.street }} {{ addr.number }}
                — {{ addr.city }}
                <!-- client_id viene en el body, lo mostramos solo si querés
                (#{{ addr.client_id }})
                -->
              </li>
            </ul>
          </div>

          <div
            v-else
            class="subsection subsection-empty"
          >
            <em>Este cliente no tiene direcciones cargadas.</em>
          </div>

          <!-- Si más adelante querés agregar orders, acá podés meter otra subsection -->
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #020617; /* negro azulado, oscuro pero no “pozo” */
  color: #e5e7eb;      /* gris muy claro, no blanco puro */
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Layout general */
.page {
  max-width: 960px;
  margin: 2rem auto;
  padding: 0 1rem 3rem;
  color: #e5e7eb;
}

.title {
  margin-bottom: 0.25rem;
  color: #e5e7eb;       /* título claramente visible */
}

.subtitle {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #9ca3af;       /* gris medio, no tan fuerte */
  font-size: 0.95rem;
}

/* Mensajes */
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

/* Contenedores (cards) */
.card {
  border: 1px solid #1f2937;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
  margin-bottom: 1.5rem;
  background: #020617; /* casi el fondo, pero se separa por el borde */
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

/* Formularios */
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

label {
  font-weight: 600;
  color: #e5e7eb;
}

input {
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #374151;
  font-size: 0.9rem;
  background: #020617;
  color: #e5e7eb;
}

input::placeholder {
  color: #6b7280;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
}

/* Botones */
.btn {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: none;
  background: #3b82f6;
  color: #e5e7eb;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.05s ease, box-shadow 0.15s ease;
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

/* Listado de clientes */
.client-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.client-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #1f2937;
}

.client-item:last-child {
  border-bottom: none;
}

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.client-main {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.client-id {
  font-size: 0.78rem;
  color: #9ca3af;
}

.client-sub {
  font-size: 0.85rem;
  color: #9ca3af;
}

/* Secciones hijas (addresses) */
.subsection {
  margin-top: 0.5rem;
  font-size: 0.88rem;
}

.subsection h3 {
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.subsection-empty {
  color: #6b7280;
}

.sub-list {
  margin: 0;
  padding-left: 1.1rem;
}

.sub-list li {
  margin-bottom: 0.15rem;
}

/* Estado vacío */
.empty {
  margin-top: 0.75rem;
  color: #6b7280;
}
</style>
