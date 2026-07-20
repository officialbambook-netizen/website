(function () {
  var selectedColor = 'White';
  var fallbackColors = ['White', 'Pink', 'Beige', 'Black', 'Gray'];
  var fallbackDots = {
    White: '#EEEAE4',
    Pink: '#C98B80',
    Beige: '#C4A882',
    Black: '#2C2C2C',
    Gray: '#8A8480'
  };

  function cartSvg() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><path d="M6 8h12l-1 10H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>';
  }

  function init() {
    if (document.getElementById('pdp-sticky-bar')) return;
    if (document.getElementById('lv-quick-add')) return;

    var colors = window.BambookCart && Array.isArray(window.BambookCart.colors)
      ? window.BambookCart.colors
      : fallbackColors;
    var dots = window.BambookCart && window.BambookCart.colorDots
      ? window.BambookCart.colorDots
      : fallbackDots;

    var html =
      '<div class="lv-quick-add" id="lv-quick-add" aria-label="הוספה מהירה — MyBambook">' +
        '<div class="lv-color-picker" role="group" aria-label="בחירת צבע" aria-expanded="false">' +
          colors.map(function (color) {
            return '<button class="lv-color-swatch' + (color === selectedColor ? ' is-selected' : '') + '" type="button" data-color="' + color + '" aria-label="' + color + '" aria-pressed="' + (color === selectedColor ? 'true' : 'false') + '">' +
              '<span style="background:' + dots[color] + '"></span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<button class="lv-trigger" id="lv-trigger" type="button" aria-label="הוספה לסל">' +
          cartSvg() +
          '<span>Add to Cart · $139</span>' +
        '</button>' +
        '<p class="lv-cart-status" id="lv-cart-status" role="status" aria-live="polite"></p>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    var tray = document.getElementById('lv-quick-add');
    var trigger = document.getElementById('lv-trigger');
    var picker = tray.querySelector('.lv-color-picker');
    setTimeout(function () { tray.classList.add('lv-visible'); }, 500);

    var footer = document.querySelector('.site-footer');
    if (footer && 'IntersectionObserver' in window) {
      var footerObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          tray.classList.toggle('lv-footer-visible', entry.isIntersecting);
          if (entry.isIntersecting) setPickerOpen(false);
        });
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0.01 });
      footerObserver.observe(footer);
    }

    function setPickerOpen(isOpen) {
      picker.classList.toggle('is-open', isOpen);
      picker.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    tray.querySelectorAll('.lv-color-swatch').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!picker.classList.contains('is-open') && button.dataset.color === selectedColor) {
          setPickerOpen(true);
          return;
        }

        selectedColor = button.dataset.color;
        tray.querySelectorAll('.lv-color-swatch').forEach(function (swatch) {
          var isSelected = swatch === button;
          swatch.classList.toggle('is-selected', isSelected);
          swatch.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
        setPickerOpen(false);
      });
    });

    document.addEventListener('click', function (event) {
      if (!picker.contains(event.target)) setPickerOpen(false);
    });

    trigger.addEventListener('click', function () {
      if (!window.BambookCart) return;
      window.BambookCart.addQuickProduct({
        color: selectedColor,
        statusId: 'lv-cart-status'
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setPickerOpen(false);
        if (window.BambookCart) window.BambookCart.close();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
