import { createRouter, createWebHistory } from "vue-router";
import Home from "../pages/Home.vue";
import NewTask from "../pages/NewTask.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/new", name: "new", component: NewTask }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
