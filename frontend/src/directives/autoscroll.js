// src/directives/autoscroll.js
function supportsReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setup(el, binding) {
  // Options
  const opts = Object.assign({ speed: 20, pauseOnHover: true }, binding?.value || {});
  // speed: pixels/seconde

  // Structure: on crée un track interne si absent
  let track = el.querySelector('.scroller__track');
  if (!track) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scroller__track';
    // déplacer tous les enfants actuels dans wrapper
    while (el.firstChild) wrapper.appendChild(el.firstChild);
    el.appendChild(wrapper);
    track = wrapper;
  }

  // Dupliquer le contenu pour le défilement infini
  const clone = track.cloneNode(true);
  clone.classList.add('scroller__clone');
  // On ne veut pas re-cloner indéfiniment si on ré-exécute
  const oldClone = el.querySelector('.scroller__clone');
  if (oldClone) oldClone.remove();
  el.appendChild(clone);

  // Calcul de la hauteur originale (avant duplication)
  // On force un reflow pour avoir la bonne hauteur
  const originalHeight = track.scrollHeight;

  // Définir variables CSS pour l’animation
  el.style.setProperty('--scroll-distance', `${-originalHeight}px`);
  const duration = Math.max(1, Math.round(originalHeight / Math.max(1, opts.speed))); // secondes
  el.style.setProperty('--scroll-duration', `${duration}s`);

  // Pause au survol (optionnel)
  if (opts.pauseOnHover) {
    const pause = () => { el.classList.add('is-paused'); };
    const resume = () => { el.classList.remove('is-paused'); };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    // Mobile: toucher pour pause courte
    let touchTimer = null;
    el.addEventListener('touchstart', () => {
      pause();
      clearTimeout(touchTimer);
      touchTimer = setTimeout(resume, 1200);
    }, { passive: true });
  }

  // Respect de prefers-reduced-motion
  if (supportsReducedMotion()) {
    el.classList.add('reduced-motion');
  }

  // Sauver une petite API sur l’élément pour les mises à jour
  el.__autoscroll__ = { opts, refresh: () => setup(el, binding) };
}

export default {
  mounted(el, binding) {
    // Le conteneur doit masquer le débordement
    el.classList.add('scroller');
    setup(el, binding);
  },
  updated(el, binding) {
    // Si le contenu a changé (ex: loadAll()), on recalcule
    // Petit debounce pour éviter de recalculer trop souvent
    clearTimeout(el.__autoscroll_update_to);
    el.__autoscroll_update_to = setTimeout(() => {
      el.__autoscroll__?.refresh();
    }, 100);
  },
  unmounted(el) {
    clearTimeout(el.__autoscroll_update_to);
    delete el.__autoscroll__;
  }
};
