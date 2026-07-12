// Compatibility layer. The universal Shopify cart lives in universal-cart.js.
function toggleMobileMenu() {
  var nav = document.querySelector('.nav-links');
  if (!nav) return;
  nav.classList.toggle('active');
}

function openLaveroCart() {
  if (window.LaveroCart) window.LaveroCart.open();
}

function openProductCart() {
  openLaveroCart();
}

function pushToMockCart() {
  if (window.LaveroCart) {
    window.LaveroCart.addQuickProduct();
  }
}

function renderCustomCart() {
  if (window.LaveroCart) window.LaveroCart.open();
}

function removeFromMock() {
  renderCustomCart();
}

function addToLaveroCart(item) {
  if (!item || !window.LaveroCart) return;
  window.LaveroCart.open();
}
