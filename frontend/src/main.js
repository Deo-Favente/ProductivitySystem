import { createApp, nextTick } from "vue";
import App from "./App.vue";
import { router } from "./router";
import Agenda from "./components/Agenda.vue";
import autoScroll from "./directives/autoscroll.js";

const app = createApp(App);
app.directive('autoscroll', autoScroll);
app.use(router);
app.mount("#app");

// ➜ Attendre que le router ait rendu la vue, puis accrocher Agenda
router.isReady().then(() => {
  const mountAgenda = async () => {
    await nextTick(); // s'assure que RouterView a rendu Home
    const el = document.getElementById("agenda-app");
    if (el && !el.__agendaMounted) {
      const agendaApp = createApp(Agenda);
      agendaApp.mount(el);
      el.__agendaMounted = true; // évite les montages multiples
    }
  };

  // monter une première fois
  mountAgenda();

  // re-tenter après chaque navigation (si tu changes de page puis reviens)
  router.afterEach(() => {
    // micro-queue pour laisser le DOM se peindre
    queueMicrotask(mountAgenda);
  });
});
