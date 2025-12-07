<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-root">
    <header class="app-header">
      <h1 class="app-title">Panel E-commerce – TP Final 2025</h1>

      <nav class="app-nav">
        <RouterLink
          to="/home"
          class="nav-link"
          active-class="nav-link--active"
        >
          Home
        </RouterLink>

        <RouterLink
          to="/clients"
          class="nav-link"
          active-class="nav-link--active"
        >
          Clientes
        </RouterLink>

        <RouterLink 
          to="/products" 
          class="nav-link" 
          active-class="nav-link--active"
        >
          Productos
        </RouterLink>

        <RouterLink 
          to="/orders" 
          class="nav-link" 
          active-class="nav-link--active"
        >
          Órdenes
        </RouterLink>

        <RouterLink 
          to="/bills" 
          class="nav-link" 
          active-class="nav-link--active"
        >
          Facturas
        </RouterLink>

        <!-- Futuro:
        
          Productos
        </RouterLink>
        <RouterLink to="/orders" class="nav-link" active-class="nav-link--active">
          Órdenes
        </RouterLink>
        <RouterLink to="/categories" class="nav-link" active-class="nav-link--active">
          Categorías
        </RouterLink>
        <RouterLink to="/bills" class="nav-link" active-class="nav-link--active">
          Facturas
        </RouterLink>
        <RouterLink to="/health" class="nav-link" active-class="nav-link--active">
          Health
        </RouterLink>
        -->
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #020617; /* negro azulado */
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #1f2937;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.app-nav {
  display: flex;
  gap: 0.75rem;
}

.nav-link {
  font-size: 0.9rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  text-decoration: none;
  color: #e5e7eb;
  border: 1px solid transparent;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.nav-link:hover {
  background: #111827;
  border-color: #374151;
}

.nav-link--active {
  background: #3b82f6;
  border-color: #2563eb;
  color: #e5e7eb;
}

.app-main {
  flex: 1;
  padding: 1.5rem 1rem 2.5rem;
}
</style>
