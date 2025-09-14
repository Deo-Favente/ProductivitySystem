/* 
  Nom : index.js
  Description : Configuration du routeur Vue.js pour l'application
  Auteur : Deo-Favente
*/

// Imports
import { createRouter, createWebHistory } from "vue-router";
import Home from "../pages/Home.vue";
import NewTask from "../pages/NewTask.vue";

export const router = createRouter({
  history: createWebHistory(), // Utilisation de l'historique HTML5
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/new", name: "new", component: NewTask }
  ],
  scrollBehavior() {
    return { top: 0 }; // Toujours scroller en haut lors du changement de route
  }
});
