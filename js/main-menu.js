function toggleLaveroMenu(button) {
  var navId = button && button.getAttribute('aria-controls') || 'lavero-primary-nav';
  var nav = document.getElementById(navId);
  if (!nav) return;

  var isOpen = nav.classList.toggle('is-open');
  if (button) button.setAttribute('aria-expanded', String(isOpen));

  // On mobile: move the shop button into the dropdown when open, back when closed
  var header = nav.closest('.lavero-main-menu');
  if (!header) return;
  var shopBtn = header.querySelector('.lavero-menu-actions .lavero-shop-button');
  var actions = header.querySelector('.lavero-menu-actions');

  if (isOpen && shopBtn) {
    nav.appendChild(shopBtn);
  } else if (!isOpen && actions) {
    var inNav = nav.querySelector('.lavero-shop-button');
    if (inNav) actions.appendChild(inNav);
  }
}

function restoreLaveroDesktopMenu() {
  if (!window.matchMedia('(min-width: 1081px)').matches) return;

  document.querySelectorAll('.lavero-main-menu').forEach(function (header) {
    var nav = header.querySelector('.lavero-menu-links');
    var actions = header.querySelector('.lavero-menu-actions');
    var toggle = header.querySelector('.lavero-menu-toggle');
    var shopButton = nav && nav.querySelector('.lavero-shop-button');

    if (nav) nav.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (shopButton && actions) actions.appendChild(shopButton);
  });
}

window.openLaveroCart = function () {
  if (window.LaveroCart) window.LaveroCart.open();
};

document.addEventListener('DOMContentLoaded', function () {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var activeSection = path === 'product.html'
    ? 'shop'
    : path === 'water-education.html'
      ? 'science'
      : path === 'mission.html'
        ? 'mission'
        : path === 'replacement-filters.html'
          ? 'filters'
          : 'home';

  document.querySelectorAll('.lavero-menu-links a[data-section]').forEach(function (link) {
    if (link.dataset.section === activeSection) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.lavero-menu-links.is-open').forEach(function (nav) {
      nav.classList.remove('is-open');
      var toggle = document.querySelector('[aria-controls="' + nav.id + '"]');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  window.addEventListener('resize', restoreLaveroDesktopMenu);
  restoreLaveroDesktopMenu();
});
