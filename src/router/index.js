import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/Home/HomeView.vue'
import ClientsListView from '../views/Clients/ClientsListView.vue'
import ClientDetailView from '../views/Clients/ClientDetailView.vue'
import ProductsListView from '../views/Products/ProductsListView.vue'
import ProductDetailView from '../views/Products/ProductDetailView.vue'
import OrdersListView from '../views/Orders/OrdersListView.vue'
import OrderDetailView from '../views/Orders/OrderDetailView.vue'
import BillsListView from '../views/Bills/BillsListView.vue'



  const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/clients',
    name: 'clients-list',
    component: ClientsListView,
  },
  {
    path: '/clients/:id',
    name: 'client-detail',
    component: ClientDetailView,
  },
  {
    path: '/products',
    name: 'products-list',
    component: ProductsListView,
  },
  {
    path: '/products/:id',
    name: 'product-detail',
    component: ProductDetailView,
  },
  {
    path: '/orders',
    name: 'orders-list',
    component: OrdersListView,
  },
  {
    path: '/orders/:id',
    name: 'order-detail',
    component: OrderDetailView,
  },
  {
    path: '/bills',
    name: 'bills-list',
    component: BillsListView,
  },
]


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
