// Compatibility layer. The universal Shopify cart lives in universal-cart.js.
function toggleMobileMenu() {
  var nav = document.querySelector('.nav-links');
  if (!nav) return;
  nav.classList.toggle('active');
}

function openBambookCart() {
  if (window.BambookCart) window.BambookCart.open();
}

function openProductCart() {
  openBambookCart();
}

function pushToMockCart() {
  if (window.BambookCart) {
    window.BambookCart.addQuickProduct();
  }
}

function renderCustomCart() {
  if (window.BambookCart) window.BambookCart.open();
}

function removeFromMock() {
  renderCustomCart();
}

function addToBambookCart(item) {
  if (!item || !window.BambookCart) return;
  window.BambookCart.open();
}
