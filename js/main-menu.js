function toggleBambookMenu(button) {
  var navId = button && button.getAttribute('aria-controls') || 'bambook-primary-nav';
  var nav = document.getElementById(navId);
  if (!nav) return;

  var isOpen = nav.classList.toggle('is-open');
  if (button) button.setAttribute('aria-expanded', String(isOpen));

  // On mobile: move the shop button into the dropdown when open, back when closed
  var header = nav.closest('.bambook-main-menu');
  if (!header) return;
  var shopBtn = header.querySelector('.bambook-menu-actions .bambook-shop-button');
  var actions = header.querySelector('.bambook-menu-actions');

  if (isOpen && shopBtn) {
    nav.appendChild(shopBtn);
  } else if (!isOpen && actions) {
    var inNav = nav.querySelector('.bambook-shop-button');
    if (inNav) actions.appendChild(inNav);
  }
}

function restoreBambookDesktopMenu() {
  if (!window.matchMedia('(min-width: 1081px)').matches) return;

  document.querySelectorAll('.bambook-main-menu').forEach(function (header) {
    var nav = header.querySelector('.bambook-menu-links');
    var actions = header.querySelector('.bambook-menu-actions');
    var toggle = header.querySelector('.bambook-menu-toggle');
    var shopButton = nav && nav.querySelector('.bambook-shop-button');

    if (nav) nav.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (shopButton && actions) actions.appendChild(shopButton);
  });
}

window.openBambookCart = function () {
  if (window.BambookCart) window.BambookCart.open();
};

document.addEventListener('DOMContentLoaded', function () {
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var activeByPage = {
    'index.html': 'home',
    'product.html': 'shop',
    'faq.html': 'faq',
    'mission.html': 'mission',
  };
  var activeSection = activeByPage[path] || '';

  document.querySelectorAll('.bambook-menu-links a[data-section]').forEach(function (link) {
    if (link.dataset.section === activeSection) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.bambook-menu-links.is-open').forEach(function (nav) {
      nav.classList.remove('is-open');
      var toggle = document.querySelector('[aria-controls="' + nav.id + '"]');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  });

  window.addEventListener('resize', restoreBambookDesktopMenu);
  restoreBambookDesktopMenu();
});
