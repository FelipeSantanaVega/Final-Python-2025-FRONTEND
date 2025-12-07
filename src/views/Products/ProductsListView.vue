<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const products = ref([])
const inactiveProducts = computed(() => (products.value || []).filter((p) => p.active === false))
const activeProducts = computed(() => (products.value || []).filter((p) => p.active !== false))
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const deletingProductId = ref(null)
const confirmDeleteProductId = ref(null)
const confirmDeleteProductLabel = ref('')
const categories = ref([])
const categoriesLoading = ref(false)
const categoriesError = ref('')
const newCategoryName = ref('')
const creatingCategory = ref(false)
const editingCategoryId = ref(null)
const editingCategoryName = ref('')
const deletingCategoryId = ref(null)
const showCategoryManager = ref(false)
const selectedCategory = ref(null)
const showCategoryModal = ref(false)

// Formulario de nuevo producto
const productForm = ref({
  name: '',
  description: '',
  price: '',
  stock: '',
  category_id: '',
  active: true,
})

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function closeCategoryModal() {
  showCategoryModal.value = false
  selectedCategory.value = null
}

function closeCategoryManager() {
  showCategoryManager.value = false
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = ''

  try {
    const res = await fetch(
      `${API_BASE_URL}/categories/?skip=0&limit=100`
    )

    if (!res.ok) {
      throw new Error(`Error al cargar categorías (HTTP ${res.status})`)
    }

    const data = await res.json()
    categories.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Error cargando categorías', err)
    categoriesError.value =
      err?.message || 'Error desconocido al cargar categorías'
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

async function loadProducts() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await fetch(
      `${API_BASE_URL}/products/?skip=0&limit=100`
    )

    if (!res.ok) {
      throw new Error(`Error al cargar productos (HTTP ${res.status})`)
    }

    const data = await res.json()
    products.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Error cargando productos', err)
    errorMessage.value = err?.message || 'Error desconocido al cargar productos'
  } finally {
    loading.value = false
  }
}

async function createCategory() {
  clearMessages()
  categoriesError.value = ''

  const name = newCategoryName.value.trim()
  if (!name) {
    categoriesError.value = 'Ingresá un nombre para la categoría.'
    return
  }

  creatingCategory.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/categories/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    if (!res.ok) {
      let detail = `Error al crear categoría (HTTP ${res.status})`
      try {
        const body = await res.json()
        detail = body.detail || body.message || detail
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }

    const cat = await res.json()
    successMessage.value = `Categoría "${cat.name}" creada correctamente`
    newCategoryName.value = ''
    await loadCategories()
    // Preseleccionar la nueva categoría si existe id
    if (cat.id_key || cat.id) {
      productForm.value.category_id = cat.id_key ?? cat.id
      selectedCategory.value = cat
    }
  } catch (err) {
    categoriesError.value = err?.message || 'Error desconocido al crear categoría'
  } finally {
    creatingCategory.value = false
  }
}

function startEditCategory(cat) {
  editingCategoryId.value = cat.id_key ?? cat.id
  editingCategoryName.value = cat.name ?? ''
  categoriesError.value = ''
  successMessage.value = ''
  selectedCategory.value = cat
}

function cancelEditCategory() {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

async function saveCategoryEdit(catId) {
  if (!catId) return
  const name = editingCategoryName.value.trim()
  if (!name) {
    categoriesError.value = 'El nombre de la categoría no puede estar vacío.'
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/categories/${catId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_key: catId, name }),
    })

    if (!res.ok) {
      let detail = `Error al actualizar categoría (HTTP ${res.status})`
      try {
        const body = await res.json()
        detail = body.detail || body.message || detail
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }

    successMessage.value = 'Categoría actualizada correctamente'
    cancelEditCategory()
    await loadCategories()
  } catch (err) {
    categoriesError.value = err?.message || 'Error desconocido al actualizar categoría'
  }
}

async function deleteCategory(catId) {
  if (!catId) return
  const confirmed = window.confirm('¿Seguro que querés eliminar esta categoría?')
  if (!confirmed) return

  deletingCategoryId.value = catId
  categoriesError.value = ''
  successMessage.value = ''

  try {
    const res = await fetch(`${API_BASE_URL}/categories/${catId}`, {
      method: 'DELETE',
    })

    if (!res.ok && res.status !== 204) {
      let detail = `Error al eliminar categoría (HTTP ${res.status})`
      try {
        const body = await res.json()
        detail = body.detail || body.message || detail
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }

    // Si la categoría eliminada estaba seleccionada, limpiamos
    if (productForm.value.category_id === catId) {
      productForm.value.category_id = ''
    }

    successMessage.value = 'Categoría eliminada correctamente'
    await loadCategories()
  } catch (err) {
    categoriesError.value = err?.message || 'Error desconocido al eliminar categoría'
  } finally {
    deletingCategoryId.value = null
  }
}

async function createProduct() {
  clearMessages()

  // Validación simple en el front
  if (!productForm.value.category_id) {
    errorMessage.value = 'Debés elegir una categoría de la lista.'
    return
  }

  const categoryIdNumber = Number(productForm.value.category_id)

  if (Number.isNaN(categoryIdNumber) || categoryIdNumber <= 0) {
    errorMessage.value = 'El ID de categoría debe ser un número mayor a 0.'
    return
  }

  const payload = {
    name: productForm.value.name,
    // Si la API no usa description, la va a ignorar
    description: productForm.value.description,
    price: Number(productForm.value.price),
    stock:
      productForm.value.stock === '' || productForm.value.stock === null
        ? 0
        : Number(productForm.value.stock),
    category_id: categoryIdNumber,
    active: true,
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
})


    if (!res.ok) {
      let message = `Error al crear producto (HTTP ${res.status})`

      try {
        const body = await res.json()

        if (Array.isArray(body.detail)) {
          // FastAPI HTTPValidationError
          message = body.detail
            .map((d) => {
              const loc = Array.isArray(d.loc) ? d.loc.join('.') : ''
              return loc ? `${loc}: ${d.msg}` : d.msg
            })
            .join(' | ')
        } else if (typeof body.detail === 'string') {
          message = body.detail
        } else if (body.message) {
          message = body.message
        }
      } catch {
        // dejamos el mensaje genérico
      }

      errorMessage.value = message
      return
    }

    // Si llega acá, se creó bien
    productForm.value = {
      name: '',
      description: '',
      price: '',
      stock: '',
      category_id: '',
    }

    successMessage.value = 'Producto creado correctamente'
    await loadProducts()
  } catch (err) {
    errorMessage.value =
      err?.message || 'Error desconocido al crear producto'
  }
}


async function deleteProduct(id) {
  clearMessages()

  deletingProductId.value = id
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
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
      throw new Error(detail || `Error al eliminar producto (HTTP ${res.status})`)
    }

    successMessage.value = 'Producto eliminado correctamente'
    await loadProducts()
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al eliminar producto'
  } finally {
    deletingProductId.value = null
  }
}

function requestDeleteProduct(p) {
  confirmDeleteProductId.value = p.id_key ?? p.id ?? p.product_id
  confirmDeleteProductLabel.value = p.name ?? p.title ?? `#${confirmDeleteProductId.value}`
  clearMessages()
}

function cancelDeleteProduct() {
  confirmDeleteProductId.value = null
  confirmDeleteProductLabel.value = ''
}

async function toggleActive(product, activeState) {
  clearMessages()
  const payload = {
    name: product.name ?? product.title ?? '',
    description: product.description ?? '',
    price: Number(product.price ?? product.unit_price ?? 0),
    stock: Number(product.stock ?? product.quantity ?? 0),
    category_id: product.category_id ?? product.category?.id_key ?? product.category?.id,
    active: activeState,
  }
  if (!payload.name || !payload.category_id || !payload.price) {
    errorMessage.value = 'No se pudo preparar la actualización de estado.'
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products/${product.id_key ?? product.id ?? product.product_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      let detail = `Error al actualizar producto (HTTP ${res.status})`
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
    successMessage.value = activeState ? 'Producto activado' : 'Producto inactivado'
    await loadProducts()
  } catch (err) {
    errorMessage.value = err?.message || 'Error desconocido al actualizar producto'
  }
}

onMounted(() => {
  loadCategories()
  loadProducts()
})

// Escucha eventos globales para refrescar productos (por ejemplo, después de crear una orden)
function handleExternalRefresh() {
  loadProducts()
}

onMounted(() => {
  window.addEventListener('order-updated', handleExternalRefresh)
})

onUnmounted(() => {
  window.removeEventListener('order-updated', handleExternalRefresh)
})
</script>

<template>
  <section class="page">
    <h2 class="title">Productos</h2>
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

    <!-- NUEVO PRODUCTO -->
    <section class="card">
      <h3>Nuevo producto</h3>
      <form @submit.prevent="createProduct" class="form">
        <div class="form-row">
          <label>Nombre</label>
          <input v-model="productForm.name" required />
        </div>
        <div class="form-row">
          <label>Descripción</label>
          <textarea v-model="productForm.description" rows="2" />
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Precio</label>
            <input v-model="productForm.price" type="number" step="0.01" required />
          </div>
          <div class="form-row">
            <label>Stock</label>
            <input v-model="productForm.stock" type="number" required />
          </div>
          <div class="form-row">
            <label>
              Categoría
              <span class="required">*</span>
            </label>
            <select
              v-model="productForm.category_id"
              :disabled="categoriesLoading || !categories.length"
              required
            >
              <option value="">
                Selecciona una categoría
              </option>
              <option
                v-for="cat in categories"
                :key="cat.id_key ?? cat.id"
                :value="cat.id_key ?? cat.id"
              >
                {{ cat.name ?? `Categoría ${cat.id_key ?? cat.id}` }}
              </option>
            </select>
            <small class="hint">
              Elegí una categoría existente. Si no ves opciones, verificá la API de categorías.
            </small>
            <small v-if="categoriesLoading" class="hint">
              Cargando categorías...
            </small>
            <small v-else-if="categoriesError" class="hint hint-error">
              {{ categoriesError }}
            </small>
            <div class="category-toggle">
              <button
                type="button"
                class="btn btn-secondary btn-small"
                @click="showCategoryManager = true"
              >
                Gestionar categorías
              </button>
            </div>
          </div>
        </div>


        <button type="submit" class="btn">
          Crear producto
        </button>
      </form>
    </section>

    <!-- LISTADO DE PRODUCTOS -->
    <section class="card">
      <header class="card-header">
        <h3>Listado de productos</h3>
        <button class="btn btn-secondary" @click="loadProducts" :disabled="loading">
          {{ loading ? 'Cargando...' : 'Recargar' }}
        </button>
      </header>

      <p v-if="!loading && (!products || !products.length)" class="empty">
        No hay productos cargados.
      </p>

      <ul v-if="products && products.length" class="product-list">
        <li v-for="p in activeProducts" :key="p.id_key ?? p.id ?? p.product_id" class="product-item">
          <div class="product-main">
            <div>
              <div class="product-title">
                <!-- Intentamos varios campos típicos -->
                <strong>{{ p.name || p.title || 'Producto sin nombre' }}</strong>
                <span class="product-id">
                  #{{ p.id_key ?? p.id ?? p.product_id ?? 's/n' }}
                </span>
              </div>
              <div class="product-sub">
                Precio:
                {{ p.price ?? p.unit_price ?? 'N/D' }} —
                Stock:
                {{ p.stock ?? p.quantity ?? 'N/D' }}
              </div>
            </div>
          </div>

          <div class="product-actions">
            <RouterLink
              :to="`/products/${p.id_key ?? p.id ?? p.product_id}`"
              class="btn btn-secondary btn-small"
            >
              Ver detalle
            </RouterLink>

            <button
              class="btn btn-secondary btn-small"
              @click="toggleActive(p, false)"
              :disabled="deletingProductId === (p.id_key ?? p.id ?? p.product_id)"
            >
              Inactivar
            </button>
            <button
              class="btn btn-danger btn-small"
              @click="requestDeleteProduct(p)"
              :disabled="deletingProductId === (p.id_key ?? p.id ?? p.product_id)"
            >
              {{
                deletingProductId === (p.id_key ?? p.id ?? p.product_id)
                  ? 'Eliminando...'
                  : 'Eliminar'
              }}
            </button>
          </div>
        </li>
      </ul>

      <h4 class="inactive-title" v-if="inactiveProducts.length">Productos inactivos</h4>
      <ul v-if="inactiveProducts.length" class="product-list inactive">
        <li v-for="p in inactiveProducts" :key="p.id_key ?? p.id ?? p.product_id" class="product-item">
          <div class="product-main">
            <div>
              <div class="product-title">
                <strong>{{ p.name || p.title || 'Producto sin nombre' }}</strong>
                <span class="product-id">
                  #{{ p.id_key ?? p.id ?? p.product_id ?? 's/n' }}
                </span>
              </div>
              <div class="product-sub">
                Precio: {{ p.price ?? p.unit_price ?? 'N/D' }} · Stock: {{ p.stock ?? p.quantity ?? 'N/D' }}
              </div>
            </div>
          </div>
          <div class="product-actions">
            <button
              class="btn btn-small"
              @click="toggleActive(p, true)"
              :disabled="deletingProductId === (p.id_key ?? p.id ?? p.product_id)"
            >
              Activar
            </button>
          </div>
        </li>
      </ul>
    </section>

    <div
      v-if="confirmDeleteProductId !== null"
      class="modal-backdrop"
      @click.self="cancelDeleteProduct"
    >
      <div class="modal">
        <header class="modal-header">
          <h3>Eliminar producto</h3>
          <button class="btn btn-secondary btn-small" @click="cancelDeleteProduct">
            Cancelar
          </button>
        </header>
        <div class="modal-body">
          <p class="hint">
            Vas a eliminar:
            <strong>{{ confirmDeleteProductLabel || `#${confirmDeleteProductId}` }}</strong>
          </p>
          <div class="modal-actions">
            <button class="btn btn-danger btn-small" @click="deleteProduct(confirmDeleteProductId)">
              Confirmar
            </button>
            <button class="btn btn-secondary btn-small" @click="cancelDeleteProduct">
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal gestor de categorías -->
    <div v-if="showCategoryManager" class="modal-backdrop" @click.self="closeCategoryManager">
      <div class="modal">
        <header class="modal-header">
          <h3>Gestionar categorías</h3>
          <button class="btn btn-secondary btn-small" type="button" @click="closeCategoryManager">
            Cerrar
          </button>
        </header>
        <div class="modal-body">
          <div class="category-inline">
            <input
              v-model="newCategoryName"
              placeholder="Nueva categoría"
              :disabled="creatingCategory"
            />
            <button
              type="button"
              class="btn btn-small"
              @click="createCategory"
              :disabled="creatingCategory"
            >
              {{ creatingCategory ? 'Creando...' : 'Crear categoría' }}
            </button>
          </div>
          <div class="category-list" v-if="categories.length">
            <h4>Categorías</h4>
            <ul>
              <li v-for="cat in categories" :key="cat.id_key ?? cat.id">
                <div class="category-row">
                  <div class="category-name">
                    <span v-if="editingCategoryId !== (cat.id_key ?? cat.id)">
                      {{ cat.name ?? `Categoría ${cat.id_key ?? cat.id}` }}
                    </span>
                    <input
                      v-else
                      v-model="editingCategoryName"
                      :disabled="deletingCategoryId === (cat.id_key ?? cat.id)"
                    />
                  </div>
                  <div class="category-actions">
                    <template v-if="editingCategoryId === (cat.id_key ?? cat.id)">
                      <button
                        type="button"
                        class="btn btn-secondary btn-small"
                        @click="cancelEditCategory"
                        :disabled="deletingCategoryId === (cat.id_key ?? cat.id)"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        class="btn btn-small"
                        @click="saveCategoryEdit(cat.id_key ?? cat.id)"
                        :disabled="deletingCategoryId === (cat.id_key ?? cat.id)"
                      >
                        Guardar
                      </button>
                    </template>
                    <template v-else>
                      <button
                        type="button"
                        class="btn btn-secondary btn-small"
                        @click="startEditCategory(cat)"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-small"
                        @click="() => { selectedCategory = cat; showCategoryModal = true }"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        class="btn btn-danger btn-small"
                        @click="deleteCategory(cat.id_key ?? cat.id)"
                        :disabled="deletingCategoryId === (cat.id_key ?? cat.id)"
                      >
                        {{ deletingCategoryId === (cat.id_key ?? cat.id) ? 'Eliminando...' : 'Eliminar' }}
                      </button>
                    </template>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="showCategoryModal && selectedCategory" class="modal-backdrop" @click.self="closeCategoryModal">
            <div class="modal">
              <header class="modal-header">
                <h3>Categoría #{{ selectedCategory.id_key ?? selectedCategory.id }}</h3>
                <button class="btn btn-secondary btn-small" type="button" @click="closeCategoryModal">
                  Cerrar
                </button>
              </header>
              <div class="modal-body">
                <div class="kv">
                  <div class="kv-row">
                    <span class="kv-label">Nombre</span>
                    <span class="kv-value">{{ selectedCategory.name ?? 'Sin nombre' }}</span>
                  </div>
                  <div class="kv-row">
                    <span class="kv-label">ID</span>
                    <span class="kv-value">#{{ selectedCategory.id_key ?? selectedCategory.id }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.required {
  color: #f97316;
  font-weight: 600;
  margin-left: 0.15rem;
}

.hint {
  margin-top: 0.1rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.hint-error {
  color: #fca5a5;
}

.page {
  max-width: 960px;
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
textarea,
select {
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid #374151;
  font-size: 0.9rem;
  background: #020617;
  color: #e5e7eb;
  resize: vertical;
}

input::placeholder,
textarea::placeholder {
  color: #6b7280;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
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

.product-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.product-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #1f2937;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.product-item:last-child {
  border-bottom: none;
}

.product-title {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.product-id {
  font-size: 0.78rem;
  color: #9ca3af;
}

.product-sub {
  font-size: 0.85rem;
  color: #9ca3af;
}

.product-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inactive-title {
  margin-top: 1rem;
  color: #9ca3af;
}

.product-list.inactive .product-item {
  opacity: 0.7;
}

.empty {
  margin-top: 0.75rem;
  color: #6b7280;
}

.category-inline {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.category-inline input {
  flex: 1;
}

.category-toggle {
  margin-top: 0.5rem;
}

.category-manager {
  margin-top: 0.75rem;
  border: 1px solid #1f2937;
  border-radius: 0.6rem;
  padding: 0.75rem;
  background: #0b1224;
  display: grid;
  gap: 0.6rem;
}

.category-list {
  border-top: 1px solid #1f2937;
  padding-top: 0.5rem;
}

.category-list h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.category-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.category-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.category-name input {
  width: 100%;
  max-width: 260px;
}

.category-actions {
  display: flex;
  gap: 0.35rem;
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
</style>
