# Frontend – Final Programación 3 (Clientes)

[![Ver video de la funcionalidad en YouTube](https://img.youtube.com/vi/kj-1hmfLbr8/maxresdefault.jpg)](https://youtu.be/kj-1hmfLbr8)

> 🎥 **Video de la demo completa:** https://youtu.be/kj-1hmfLbr8  

---

## Backend relacionado

El backend de esta aplicación (API REST en Python / FastAPI) está en el siguiente repositorio:

👉 **Backend:** https://github.com/FelipeSantanaVega/Final2025Python

La API está desplegada en Render y este front se comunica contra esa API (o contra el backend local, según la variable de entorno).

---

## Descripción del proyecto

Este repositorio contiene el **frontend** del trabajo práctico final de Programación 3.

Es una Single Page Application (SPA) muy simple que:

- Lista clientes obtenidos desde la API (`GET /clients`).
- Permite **crear** nuevos clientes (`POST /clients`).
- Permite **eliminar** clientes (`DELETE /clients/{id}`).
- Muestra las **direcciones** asociadas a cada cliente (`addresses`) cuando el backend las devuelve.
- Usa un **tema oscuro** pensado para ser cómodo a la vista (sin blancos puros).

La idea del proyecto es demostrar:

1. Consumo de una API REST real desplegada en la nube.
2. Manejo básico de estado en el front (listado, alta y baja).
3. Separación clara entre frontend y backend.

---

## Tecnologías utilizadas

- **Vue 3** con **Composition API**
- **Vite** como bundler
- **JavaScript** / ESNext
- HTML + CSS plano (sin framework de UI adicional)

---

## Requisitos

- Node.js **>= 18** (recomendado)
- npm (incluido con Node)

---

## Configuración de entorno

El front utiliza una variable de entorno para saber a qué API pegarle:

- `VITE_API_BASE_URL` → URL base del backend

Ejemplos de configuración:

### Desarrollo contra backend local (Docker/local)

```env
# .env
VITE_API_BASE_URL=http://localhost:8000
