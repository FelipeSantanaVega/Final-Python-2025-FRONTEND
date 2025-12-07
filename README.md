# Frontend - Final Programación 3

[![Ver video de la funcionalidad en YouTube](https://img.youtube.com/vi/_0WMXaPCJLg/maxresdefault.jpg)](https://www.youtube.com/watch?v=_0WMXaPCJLg)

> Video de la demo completa: https://www.youtube.com/watch?v=_0WMXaPCJLg

---

## Backend relacionado

El backend de esta aplicación (API REST en Python / FastAPI) está en el siguiente repositorio:

👉 **Backend:** https://github.com/FelipeSantanaVega/Final2025Python

La API está desplegada en Render y este front se comunica contra esa API (o contra el backend local, según la variable de entorno).

---

## Descripción del proyecto

Este repositorio contiene el **frontend** del trabajo práctico final de Programación 3. Es una SPA que consume la API de FastAPI y permite gestionar todo el flujo de e-commerce:

- **Inicio:** KPIs de ventas/órdenes/facturas, alerta de stock bajo y gráfico de líneas (mes/año) con tooltips inmediatos para ver ventas por día/mes.
- **Productos:** listado, alta y edición; gestión de categorías en modal (crear/editar/eliminar); popup para sumar stock; activación/inactivación con lista separada de inactivos; detalles editables y confirmación antes de borrar.
- **Órdenes:** creación con selección de cliente y productos, validación de stock (bloquea si no hay suficiente), descuento %, total calculado automático, listado de más recientes a antiguas, detalle con productos y confirmación al eliminar.
- **Facturas:** listado de más recientes a antiguas, muestra nombre de cliente y método de pago; detalle en modal con totales, descuento y productos de la orden.
- **Clientes:** alta y edición; direcciones con alta/eliminación mediante modal con confirmación; listado de órdenes asociadas y mensajes claros cuando falta información.

La idea del proyecto es demostrar consumo de API REST real, manejo de estado (listado, alta, baja, edición) y separación clara entre frontend y backend.

---

## Tecnologías utilizadas

