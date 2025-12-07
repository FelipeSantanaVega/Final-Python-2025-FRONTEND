<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const route = useRoute()
const router = useRouter()

const productId = computed(() => route.params.id)

const product = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const editing = ref(false)
const saving = ref(false)
const editError = ref('')
const addStockOpen = ref(false)
const addStockValue = ref(0)
const addStockSaving = ref(false)
const editForm = ref({
  name: '',
  price: '',
  stock: '',
  category_id: '',
  description: '',
})
const categories = ref([])
const categoriesLoading = ref(false)
const categoriesError = ref('')

const descriptionText = computed(() => {
  if (!product.value) return ''
  return (
    product.value.description ||
    product.value.details ||
    product.value.detail ||
    product.value.summary ||
    ''
  )
})

const categoryName = computed(() => {
  if (!product.value) return 'N/D'
  if (product.value.category?.name) return product.value.category.name
  const id = product.value.category_id ?? product.value.category?.id_key ?? product.value.category?.id
  if (!id) return 'N/D'
  const found = categories.value.find(
    (c) => (c.id_key ?? c.id) === id
  )
  return found?.name ?? `Categoría #${id}`
})

function goBack() {
  router.push({ name: 'products-list' })
}

function startEdit() {
  if (!product.value) return
  editForm.value = {
    name: product.value.name ?? '',
    price: product.value.price ?? '',
    stock: product.value.stock ?? '',
    category_id: product.value.category_id ?? '',
    description: product.value.description ?? '',
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

async function loadProduct() {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId.value}`)
    if (!res.ok) {
      throw new Error(`Error al cargar producto (HTTP ${res.status})`)
    }
    product.value = await res.json()
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al cargar producto'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/categories/?skip=0&limit=100`)
    if (!res.ok) {
      throw new Error(`Error al cargar categorías (HTTP ${res.status})`)
    }
    const data = await res.json()
    categories.value = Array.isArray(data) ? data : []
  } catch (err) {
    categoriesError.value = err?.message || 'Error desconocido al cargar categorías'
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

async function saveEdit() {
  if (!product.value) return
  editError.value = ''
  successMessage.value = ''

  const name = editForm.value.name.trim()
  const priceNum = Number(editForm.value.price)
  const stockNum = Number(editForm.value.stock)
  const categoryNum = Number(editForm.value.category_id)

  if (!name) {
    editError.value = 'El nombre es obligatorio.'
    return
  }
  if (Number.isNaN(priceNum) || priceNum <= 0) {
    editError.value = 'El precio debe ser mayor a 0.'
    return
  }
  if (Number.isNaN(stockNum) || stockNum < 0) {
    editError.value = 'El stock debe ser 0 o mayor.'
    return
  }
  if (Number.isNaN(categoryNum) || categoryNum <= 0) {
    editError.value = 'La categoría debe ser un número válido.'
    return
  }

  const payload = {
    name,
    description: editForm.value.description,
    price: priceNum,
    stock: stockNum,
    category_id: categoryNum,
  }

  saving.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let detail = `Error al actualizar (HTTP ${res.status})`
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
    product.value = updated
    successMessage.value = 'Producto actualizado correctamente'
    editing.value = false
  } catch (err) {
    editError.value = err?.message || 'Error desconocido al actualizar'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadProduct()
})

function openAddStock() {
  addStockValue.value = 0
  addStockOpen.value = true
  successMessage.value = ''
  errorMessage.value = ''
  editError.value = ''
}

function closeAddStock() {
  addStockOpen.value = false
  addStockSaving.value = false
}

async function submitAddStock() {
  if (!product.value) return
  const increment = Number(addStockValue.value)
  if (Number.isNaN(increment) || increment <= 0) {
    errorMessage.value = 'Ingresá una cantidad mayor a 0 para sumar stock.'
    return
  }
  const baseStock = Number(product.value.stock ?? product.value.quantity ?? 0) || 0
  const newStock = baseStock + increment

  // Build full payload to satisfy backend validation
  const payload = {
    name: product.value.name ?? product.value.title ?? '',
    description: product.value.description ?? '',
    price: Number(product.value.price ?? product.value.unit_price ?? 0),
    stock: newStock,
    category_id:
      product.value.category_id ??
      product.value.category?.id_key ??
      product.value.category?.id ??
      null,
  }

  if (!payload.name || !payload.category_id || !payload.price) {
    errorMessage.value = 'No se pudo preparar la actualización: faltan datos del producto.'
    return
  }
  addStockSaving.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      let detail = `Error al actualizar stock (HTTP ${res.status})`
      try {
        const body = await res.json()
        if (Array.isArray(body.detail)) {
          detail = body.detail
            .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
            .join(' | ')
        } else {
          detail = body.detail || body.message || detail
        }
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }
    const updated = await res.json()
    product.value = updated
    successMessage.value = 'Stock actualizado correctamente'
    closeAddStock()
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al actualizar stock'
  } finally {
    addStockSaving.value = false
  }
}
</script>

<template>
  <section class="page">
    <header class="detail-header">
      <div>
        <h2 class="title">
          Detalle de producto
        </h2>
        <p class="subtitle">
          ID: <strong>{{ productId }}</strong> · API: <strong>{{ API_BASE_URL }}</strong>
        </p>
      </div>

      <div class="header-actions">
        <button class="btn btn-secondary btn-small" @click="goBack">
          ← Volver al listado
        </button>
        <button class="btn btn-small" @click="openAddStock">
          + Agregar stock
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
      Cargando producto...
    </section>

    <template v-else-if="product">
      <section class="card">
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
                @click="saveEdit"
                :disabled="saving"
              >
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </template>
          </div>
        </div>

        <div class="kv">
          <div class="kv-row">
            <span class="kv-label">Nombre</span>
            <span class="kv-value" v-if="!editing">
              {{ product.name || product.title || 'Sin nombre' }}
            </span>
            <input v-else v-model="editForm.name" required />
          </div>
          <div class="kv-row">
            <span class="kv-label">Precio</span>
            <span class="kv-value" v-if="!editing">
              {{ product.price ?? product.unit_price ?? 'N/D' }}
            </span>
            <input v-else v-model="editForm.price" type="number" step="0.01" />
          </div>
          <div class="kv-row">
            <span class="kv-label">Stock</span>
            <span class="kv-value" v-if="!editing">
              {{ product.stock ?? product.quantity ?? 'N/D' }}
            </span>
            <input v-else v-model="editForm.stock" type="number" />
          </div>
          <div class="kv-row">
            <span class="kv-label">Categoría</span>
            <span class="kv-value" v-if="!editing">
              {{ categoryName }}
            </span>
            <select
              v-else
              v-model="editForm.category_id"
              :disabled="categoriesLoading || saving"
            >
              <option value="">Selecciona una categoría</option>
              <option
                v-for="cat in categories"
                :key="cat.id_key ?? cat.id"
                :value="cat.id_key ?? cat.id"
              >
                {{ cat.name ?? `Categoría ${cat.id_key ?? cat.id}` }}
              </option>
            </select>
          </div>
          <div class="kv-row">
            <span class="kv-label">ID interno</span>
            <span class="kv-value">
              #{{ product.id_key ?? product.id ?? product.product_id ?? 's/n' }}
            </span>
          </div>
        </div>

        <div class="section">
          <h4>Descripción</h4>
          <template v-if="!editing">
            <p class="description">
              {{ descriptionText || 'Sin descripción' }}
            </p>
          </template>
          <template v-else>
            <textarea
              v-model="editForm.description"
              rows="4"
              placeholder="Descripción del producto"
            />
          </template>
        </div>
      </section>

      <div v-if="addStockOpen" class="modal-backdrop" @click.self="closeAddStock">
        <div class="modal">
          <header class="modal-header">
            <h3>Agregar stock</h3>
            <button class="btn btn-secondary btn-small" @click="closeAddStock">Cerrar</button>
          </header>
          <div class="modal-body">
            <p class="hint">Stock actual: {{ product?.stock ?? 0 }}</p>
            <div class="form-row">
              <label>Cantidad a sumar</label>
              <input
                class="styled-input"
                v-model.number="addStockValue"
                type="number"
                min="1"
                placeholder="Ej: 10"
              />
            </div>
            <div class="modal-actions">
              <button class="btn btn-small" @click="submitAddStock" :disabled="addStockSaving">
                {{ addStockSaving ? 'Actualizando...' : 'Agregar' }}
              </button>
              <button class="btn btn-secondary btn-small" @click="closeAddStock" :disabled="addStockSaving">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <section v-else class="card">
      No se encontró el producto.
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
  background: #020617;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
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

.kv input,
.kv select,
.section textarea {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #374151;
  font-size: 0.9rem;
  background: #020617;
  color: #e5e7eb;
}

.kv input:focus,
.kv select:focus,
.section textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
}

.btn-group {
  display: flex;
  gap: 0.5rem;
}

.section {
  margin-top: 1rem;
}

.description {
  font-size: 0.9rem;
  color: #d1d5db;
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

.msg-success {
  background: #064e3b;
  color: #bbf7d0;
  border: 1px solid #16a34a;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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
  gap: 0.75rem;
}

.styled-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #374151;
  font-size: 0.9rem;
  background: #020617;
  color: #e5e7eb;
}

.styled-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
