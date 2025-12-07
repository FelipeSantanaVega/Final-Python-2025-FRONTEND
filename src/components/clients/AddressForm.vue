<script setup>
import { ref } from 'vue'

const props = defineProps({
  clientId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['saved', 'cancel'])

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const form = ref({
  street: '',
  number: '',
  city: '',
})

const loading = ref(false)
const errorMessage = ref('')

function resetForm() {
  form.value = {
    street: '',
    number: '',
    city: '',
  }
  errorMessage.value = ''
}

async function saveAddress() {
  errorMessage.value = ''
  loading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street: form.value.street,
        number: form.value.number,
        city: form.value.city,
        client_id: Number(props.clientId),
      }),
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = body.detail || body.message || ''
      } catch {
        /* ignore */
      }
      throw new Error(detail || `Error al crear dirección (HTTP ${res.status})`)
    }

    resetForm()
    emit('saved')
  } catch (err) {
    errorMessage.value = err.message || 'Error desconocido al crear dirección'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="saveAddress" class="form">
    <div class="form-row-inline">
      <div class="form-field">
        <label>Calle</label>
        <input v-model="form.street" required />
      </div>
      <div class="form-field small">
        <label>Número</label>
        <input v-model="form.number" required />
      </div>
      <div class="form-field">
        <label>Ciudad</label>
        <input v-model="form.city" />
      </div>
    </div>

    <p v-if="errorMessage" class="msg msg-error">
      {{ errorMessage }}
    </p>

    <div class="actions">
      <button
        type="button"
        class="btn btn-secondary btn-small"
        @click="emit('cancel')"
        :disabled="loading"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="btn btn-small"
        :disabled="loading"
      >
        {{ loading ? 'Guardando...' : 'Guardar dirección' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.address-form-wrapper {
  margin-bottom: 1rem;
}

.form {
  margin-top: 0.5rem;
  display: grid;
  gap: 0.75rem;
}

.form-row-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Cada campo puede ocupar espacio flexible y envolver */
.form-field {
  flex: 1 1 200px;
}

/* El número ocupa menos ancho, pero también se adapta */
.form-field.small {
  flex: 0 0 110px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.form-field.small {
  max-width: 120px;
}

label {
  font-weight: 600;
  color: #e5e7eb;
}

input {
  padding: 0.35rem 0.6rem;
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

.msg {
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  margin: 0;
}

.msg-error {
  background: #451a1a;
  color: #fecaca;
  border: 1px solid #b91c1c;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: none;
  background: #3b82f6;
  color: #e5e7eb;
  font-size: 0.85rem;
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
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}
</style>
