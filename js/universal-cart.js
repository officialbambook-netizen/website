(function () {
  var STOREFRONT_ENDPOINT = 'https://w1c0ed-5s.myshopify.com/api/2024-10/graphql.json';
  var STOREFRONT_TOKEN = 'f2863bebc601b26a3c6f35a9c63c560e';
  var STORAGE_KEY = 'laveroCart';

  var SIZE_VARIANTS = {
    S: { variantId: 'gid://shopify/ProductVariant/43638796943473' },
    M: { variantId: 'gid://shopify/ProductVariant/43638796910705' },
    L: { variantId: 'gid://shopify/ProductVariant/43638796877937' }
  };
  var DEFAULT_SIZE = 'M';

  var CART_LINE_FIELDS = [
    'id quantity',
    'merchandise { ... on ProductVariant {',
    '  id',
    '  title',
    '  image { url }',
    '  compareAtPrice { amount }',
    '  product { title featuredImage { url } }',
    '}}',
    'cost { subtotalAmount { amount } totalAmount { amount } }',
    'discountAllocations { discountedAmount { amount } }'
  ].join('\n');

  var currentCart = null;
  var currentConfig = { sizes: [DEFAULT_SIZE], plan: 'one-time', quantity: 1 };

  function currencySymbol(code) {
    var map = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
    if (code && map[code]) return map[code];
    return code ? code + ' ' : '$';
  }

  // --- Meta Pixel helpers --------------------------------------------------
  // fbq is loaded once site-wide by js/meta-pixel.js; these no-op safely on any
  // page without the pixel. Every value/id comes from the live Shopify cart —
  // never hardcoded (Shopify is the source of truth). Currency uses the cart's
  // currencyCode when present and falls back to USD if the cart has no lines yet.
  // Only AddToCart fires from here — InitiateCheckout/AddPaymentInfo/Purchase are
  // fired by Shopify's own Facebook & Instagram Sales Channel on its checkout
  // pages. Don't re-add InitiateCheckout here; it duplicated Shopify's event
  // (confirmed in Events Manager 2026-07-16) and was removed for that reason.
  function fbTrack(eventName, params) {
    if (typeof window.fbq === 'function') window.fbq('track', eventName, params || {});
  }
  function variantNumericId(gid) {
    return String(gid == null ? '' : gid).split('/').pop();
  }
  function cartEdges(cart) {
    return (cart && cart.lines && cart.lines.edges) ? cart.lines.edges : [];
  }
  function cartEventParams(cart) {
    var currency = 'USD';
    var value = 0;
    try { value = parseFloat(cart.cost.totalAmount.amount) || 0; } catch (e) {}
    try { currency = cart.cost.totalAmount.currencyCode || 'USD'; } catch (e) {}
    return {
      content_type: 'product',
      content_ids: cartEdges(cart).map(function (edge) {
        return variantNumericId(edge.node.merchandise.id);
      }),
      num_items: cartEdges(cart).reduce(function (sum, edge) {
        return sum + (Number(edge.node.quantity) || 0);
      }, 0),
      value: value,
      currency: currency
    };
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function ensureStyles() {
    if (document.getElementById('lavero-universal-cart-styles')) return;
    document.head.insertAdjacentHTML('beforeend', [
      '<style id="lavero-universal-cart-styles">',
      '#lavero-cart-dialog{border:none;padding:0;margin:0 auto 0 0;border-radius:0 18px 18px 0;max-width:min(480px,96vw);width:100%;height:100vh;max-height:100vh;background:var(--ivory,#fff9f0);box-shadow:24px 0 72px rgba(64,54,50,.22);overflow:clip;}',
      '#lavero-cart-dialog[open]{display:flex;flex-direction:column;}',
      '#lavero-cart-dialog::backdrop{background:rgba(40,32,28,.52);backdrop-filter:blur(4px);}',
      '.cdlg-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px 16px;border-bottom:1px solid var(--line,#eadfd3);flex-shrink:0;}',
      '.cdlg-title{margin:0;font:700 19px var(--font-sans,Inter,Arial,sans-serif);color:var(--brown,#403632);}',
      '.cdlg-close{background:var(--cream,#f7efe3);border:none;border-radius:50%;width:34px;height:34px;font-size:19px;cursor:pointer;color:var(--brown,#403632);display:grid;place-items:center;flex-shrink:0;transition:background .15s;}',
      '.cdlg-close:hover{background:var(--sand,#efe2d0);}',
      '.cdlg-body{flex:1;min-height:0;overflow-y:auto;padding:0 24px;}',
      '.cdlg-footer{padding:14px 24px 20px;border-top:1px solid var(--line,#eadfd3);flex-shrink:0;background:var(--ivory,#fff9f0);}',
      '.cdlg-item,.cdlg-line{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--line,#eadfd3);align-items:flex-start;}',
      '.cdlg-item:last-child,.cdlg-line:last-child{border-bottom:none;}',
      '.cdlg-item-img,.cdlg-line img{width:72px;height:72px;border-radius:10px;object-fit:cover;flex-shrink:0;}',
      '.cdlg-item-img-placeholder{width:72px;height:72px;border-radius:10px;background:var(--cream,#f7efe3);flex-shrink:0;}',
      '.cdlg-item-body{flex:1;min-width:0;}',
      '.cdlg-item-name{font:700 14px var(--font-sans,Inter,Arial,sans-serif);color:var(--brown,#403632);}',
      '.cdlg-item-variant{font:500 12px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);margin-top:2px;}',
      '.cdlg-item-plan{font:600 12px var(--font-sans,Inter,Arial,sans-serif);color:var(--gold,#b88e4a);margin-top:2px;}',
      '.cdlg-item-note{font:500 11px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);margin-top:1px;}',
      '.cdlg-item-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:12px;}',
      '.cdlg-item-qty{font:500 12px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);}',
      '.cdlg-item-price{font:700 14px var(--font-sans,Inter,Arial,sans-serif);color:var(--brown,#403632);}',
      '.cdlg-item-original{font:500 13px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);text-decoration:line-through;margin-inline-end:5px;}',
      '.cdlg-item-remove{background:none;border:none;font:500 11px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);cursor:pointer;padding:0;text-decoration:underline;margin-top:5px;display:block;}',
      '.cdlg-item-remove:hover{color:var(--blush,#c98b80);}',
      '.cdlg-item-save{font:600 11px var(--font-sans,Inter,Arial,sans-serif);color:var(--gold,#b88e4a);margin-top:3px;text-align:end;}',
      '.cdlg-totals-row{display:flex;justify-content:space-between;padding:5px 0;gap:16px;}',
      '.cdlg-totals-label,.cdlg-totals-value{font:500 13px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);}',
      '.cdlg-totals-value{color:var(--brown,#403632);}',
      '.cdlg-totals-discount-label,.cdlg-totals-discount-value{font:700 13px var(--font-sans,Inter,Arial,sans-serif);color:var(--gold,#b88e4a);}',
      '.cdlg-totals-sub-label,.cdlg-totals-sub-value{font:500 11px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);}',
      '.cdlg-total-row{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 0;border-top:2px solid var(--line,#eadfd3);margin-top:6px;}',
      '.cdlg-total-label{font:800 15px var(--font-sans,Inter,Arial,sans-serif);color:var(--brown,#403632);}',
      '.cdlg-total-value{font:800 19px var(--font-sans,Inter,Arial,sans-serif);color:var(--brown,#403632);}',
      '.cdlg-checkout{display:block;background:var(--brown,#403632);color:var(--ivory,#fff9f0);text-align:center;padding:16px;border-radius:10px;font:800 13px var(--font-sans,Inter,Arial,sans-serif);letter-spacing:normal;text-decoration:none;margin-top:14px;text-transform:uppercase;transition:background .2s;}',
      '.cdlg-checkout:hover{background:var(--green,#173c34);}',
      '.cdlg-trust{text-align:center;font:500 11px var(--font-sans,Inter,Arial,sans-serif);color:var(--taupe,#786f68);margin:10px 0 0;}',
      '.cdlg-empty{text-align:center;padding:48px 0 40px;color:var(--taupe,#786f68);font:500 14px var(--font-sans,Inter,Arial,sans-serif);}',
      '@media(max-width:520px){#lavero-cart-dialog{border-radius:0 18px 18px 0;width:min(420px,92vw);}.cdlg-header,.cdlg-body,.cdlg-footer{padding-left:20px;padding-right:20px;}}',
      '</style>'
    ].join(''));
  }

  function ensureDrawer() {
    ensureStyles();
    var legacy = document.getElementById('custom-cart');
    if (legacy) legacy.remove();

    var drawer = document.getElementById('lavero-cart-dialog');
    if (drawer) return drawer;

    document.body.insertAdjacentHTML('beforeend', [
      '<dialog id="lavero-cart-dialog" aria-label="עגלת קניות">',
      '  <div class="cdlg-header">',
      '    <h2 class="cdlg-title">העגלה שלכם</h2>',
      '    <button class="cdlg-close" type="button" aria-label="סגירת העגלה">&times;</button>',
      '  </div>',
      '  <div class="cdlg-body"><div id="lavero-cart-lines"></div></div>',
      '  <div class="cdlg-footer">',
      '    <div id="lavero-cart-totals"></div>',
      '    <a id="lavero-checkout-btn" href="#" class="cdlg-checkout">לתשלום</a>',
      '    <p class="cdlg-trust">משלוח חינם &nbsp;&middot;&nbsp; אחריות החזר כספי — 60 יום</p>',
      '  </div>',
      '</dialog>'
    ].join(''));

    drawer = document.getElementById('lavero-cart-dialog');
    drawer.querySelector('.cdlg-close').addEventListener('click', close);
    return drawer;
  }

  async function storefrontFetch(query, variables) {
    var res = await fetch(STOREFRONT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query: query, variables: variables })
    });
    if (!res.ok) throw new Error('שגיאת רשת. נסו שוב.');
    var json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  }

  function normalizeConfig(config) {
    var next = config || {};
    var sizes = Array.isArray(next.sizes) && next.sizes.length
      ? next.sizes.slice()
      : [next.size || DEFAULT_SIZE];
    var quantity = Math.max(1, Number(next.quantity || sizes.length || 1));
    sizes = Array.from({ length: quantity }, function (_, index) {
      return sizes[index] || sizes[0] || DEFAULT_SIZE;
    });

    return {
      sizes: sizes,
      plan: 'one-time',
      quantity: quantity
    };
  }

  function selectedLines(config) {
    return config.sizes.map(function (size, index) {
      var variant = SIZE_VARIANTS[size];
      if (!variant || !variant.variantId) {
        throw new Error('מידה ' + size + ' אינה זמינה כרגע.');
      }
      return { size: size, variantId: variant.variantId, quantity: 1 };
    });
  }

  function normalizeCheckoutUrl(url) {
    if (!url) return url;
    try {
      var parsed = new URL(url);
      var allowedHosts = ['w1c0ed-5s.myshopify.com'];
      if (allowedHosts.indexOf(parsed.hostname) === -1) {
        parsed.hostname = 'w1c0ed-5s.myshopify.com';
      }
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }

  async function buildShopifyCart(config) {
    var lines = selectedLines(config).map(function (line) {
      return { merchandiseId: line.variantId, quantity: line.quantity };
    });

    var data = await storefrontFetch([
      'mutation cartCreate($input: CartInput!) {',
      '  cartCreate(input: $input) {',
      '    cart {',
      '      id checkoutUrl',
      '      lines(first: 20) { edges { node { ' + CART_LINE_FIELDS + ' } } }',
      '      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }',
      '      discountCodes { code applicable }',
      '    }',
      '    userErrors { field message }',
      '  }',
      '}'
    ].join('\n'), {
      input: {
        lines: lines,
        buyerIdentity: { countryCode: 'IL' }
      }
    });

    var errors = data.cartCreate.userErrors;
    if (errors.length) throw new Error(errors[0].message);
    return data.cartCreate.cart;
  }

  function showStatus(message, targetId) {
    var status = document.getElementById(targetId || 'cart-status') ||
      document.getElementById('lv-cart-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-visible', Boolean(message));
  }

  function setBadge(count) {
    document.querySelectorAll('.lavero-cart-badge, .cart-badge').forEach(function (badge) {
      badge.textContent = String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('.lavero-sr-only, #cart-count-label').forEach(function (el) {
      el.textContent = count + ' ' + (count === 1 ? 'פריט' : 'פריטים') + ' בעגלה';
    });
  }

  function syncCartToLocalStorage(cart) {
    if (!cart || !cart.lines || !cart.lines.edges.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    var sym = currencySymbol(cart.cost && cart.cost.totalAmount && cart.cost.totalAmount.currencyCode);
    var items = cart.lines.edges.map(function (edge) {
      var node = edge.node;
      var merchandise = node.merchandise || {};
      var product = merchandise.product || {};
      return {
        title: product.title || 'כפפות קומפרסיה MyBambook',
        bundle: merchandise.title || 'סטנדרטי',
        priceStr: (parseFloat(node.cost.totalAmount.amount) || 0).toFixed(2) + ' ' + sym,
        imgURL: merchandise.image && merchandise.image.url
          ? merchandise.image.url
          : (product.featuredImage && product.featuredImage.url ? product.featuredImage.url : 'assets/lavero-woman-shower.jpeg')
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cartId: cart.id || '',
      checkoutUrl: cart.checkoutUrl || '',
      currencySymbol: sym,
      items: items
    }));
  }

  function renderSavedCart() {
    ensureDrawer();
    var linesEl = document.getElementById('lavero-cart-lines');
    var totalsEl = document.getElementById('lavero-cart-totals');
    var checkoutBtn = document.getElementById('lavero-checkout-btn');
    var parsed = null;

    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      parsed = null;
    }

    var items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : []);
    var checkoutUrl = parsed && !Array.isArray(parsed) ? parsed.checkoutUrl : '';
    var sym = (parsed && !Array.isArray(parsed) && parsed.currencySymbol) || '$';

    if (!items.length) {
      if (linesEl) linesEl.innerHTML = '<div class="cdlg-empty">העגלה שלכם ריקה.</div>';
      if (totalsEl) totalsEl.innerHTML = '';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      setBadge(0);
      return;
    }

    var sum = 0;
    linesEl.innerHTML = items.map(function (item) {
      var price = parseFloat(String(item.priceStr || '').replace(/[^\d.]/g, '')) || 0;
      sum += price;
      return [
        '<div class="cdlg-line">',
        '  <img src="' + escapeHTML(item.imgURL || 'assets/lavero-woman-shower.jpeg') + '" alt="">',
        '  <div style="flex:1;">',
        '    <div style="font-weight:700;font-size:15px;color:var(--ink,var(--brown,#403632));">' + escapeHTML(item.title || 'כפפות קומפרסיה MyBambook') + '</div>',
        '    <div style="color:var(--taupe,#786f68);font-size:13px;margin-top:3px;">' + escapeHTML(item.bundle || 'סטנדרטי') + '</div>',
        '    <div style="font-weight:700;font-size:15px;color:var(--ink,var(--brown,#403632));margin-top:8px;">' + escapeHTML(item.priceStr || ('0.00 ' + sym)) + '</div>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
    totalsEl.innerHTML = '<div class="cdlg-total-row"><span class="cdlg-total-label">סכום ביניים</span><span class="cdlg-total-value">' + sum.toFixed(2) + '&nbsp;' + escapeHTML(sym) + '</span></div>';
    if (checkoutBtn) {
      if (checkoutUrl) {
        checkoutBtn.href = normalizeCheckoutUrl(checkoutUrl);
        checkoutBtn.style.display = '';
      } else {
        checkoutBtn.style.display = 'none';
      }
    }
    setBadge(items.length);
  }

  function render(cart, config) {
    ensureDrawer();
    currentCart = cart;
    currentConfig = normalizeConfig(config || currentConfig);
    syncCartToLocalStorage(cart);

    var linesEl = document.getElementById('lavero-cart-lines');
    var totalsEl = document.getElementById('lavero-cart-totals');
    var checkoutBtn = document.getElementById('lavero-checkout-btn');

    if (!linesEl || !totalsEl) return;

    var edges = cart && cart.lines ? cart.lines.edges : [];
    if (!edges.length) {
      linesEl.innerHTML = '<div class="cdlg-empty">העגלה שלכם ריקה.</div>';
      totalsEl.innerHTML = '';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      setBadge(0);
      return;
    }
    if (checkoutBtn) checkoutBtn.style.display = '';

    var sym = currencySymbol(cart.cost && cart.cost.totalAmount && cart.cost.totalAmount.currencyCode);
    var unitCount = edges.reduce(function (sum, edge) {
      return sum + edge.node.quantity;
    }, 0);

    setBadge(unitCount);

    function lineActualTotal(node) {
      var subtotal = parseFloat(node.cost && node.cost.subtotalAmount && node.cost.subtotalAmount.amount);
      var lineDiscount = (node.discountAllocations || []).reduce(function (sum, a) {
        return sum + (parseFloat(a.discountedAmount && a.discountedAmount.amount) || 0);
      }, 0);
      var fromTotal = parseFloat(node.cost && node.cost.totalAmount && node.cost.totalAmount.amount);
      var fromAlloc = isNaN(subtotal) ? NaN : subtotal - lineDiscount;
      var picked = Math.min(
        isNaN(fromTotal) ? Infinity : fromTotal,
        isNaN(fromAlloc) ? Infinity : fromAlloc
      );
      if (!isFinite(picked)) picked = isNaN(subtotal) ? 0 : subtotal;
      return picked;
    }

    try {
      var linesHTML = '';
      edges.forEach(function (edge) {
        var node = edge.node;
        var merchandise = node.merchandise;
        var img = (merchandise.image && merchandise.image.url) ||
          (merchandise.product.featuredImage && merchandise.product.featuredImage.url);
        var lineTotal = lineActualTotal(node);

        // Compare-at strikethrough comes from Shopify (variant compareAtPrice) — never a
        // hardcoded anchor. Shows e.g. sym199 struck → sym139 once compareAtPrice is set in admin.
        var unitCompareAt = parseFloat(merchandise.compareAtPrice && merchandise.compareAtPrice.amount) || 0;
        var compareTotal = unitCompareAt * node.quantity;
        var showCompare = compareTotal > lineTotal + 0.01;
        var priceHTML = showCompare
          ? '<span class="cdlg-item-original">' + compareTotal.toFixed(2) + '&nbsp;' + escapeHTML(sym) + '</span><span class="cdlg-item-price">' + lineTotal.toFixed(2) + '&nbsp;' + escapeHTML(sym) + '</span>'
          : '<span class="cdlg-item-price">' + lineTotal.toFixed(2) + '&nbsp;' + escapeHTML(sym) + '</span>';

        linesHTML += [
          '<div class="cdlg-item">',
          img ? '<img class="cdlg-item-img" src="' + escapeHTML(img) + '" alt="">' : '<div class="cdlg-item-img-placeholder"></div>',
          '  <div class="cdlg-item-body">',
          '    <div class="cdlg-item-name">' + escapeHTML(merchandise.product.title) + '</div>',
          '    <div class="cdlg-item-variant">' + escapeHTML(merchandise.title) + '</div>',
          '    <div class="cdlg-item-bottom">',
          '      <span class="cdlg-item-qty">כמות ' + node.quantity + '</span>',
          '      <span>' + priceHTML + '</span>',
          '    </div>',
          '    <button class="cdlg-item-remove" type="button" data-cart-line-id="' + escapeHTML(node.id) + '">הסרה</button>',
          '  </div>',
          '</div>'
        ].join('');
      });

      linesEl.innerHTML = linesHTML;
      linesEl.querySelectorAll('[data-cart-line-id]').forEach(function (button) {
        button.addEventListener('click', function () {
          removeCartLine(button.dataset.cartLineId);
        });
      });
    } catch (renderErr) {
      linesEl.innerHTML = '<div class="cdlg-empty" style="color:var(--blush,#c98b80);">שגיאה בהצגת העגלה: ' + escapeHTML(renderErr.message) + '</div>';
      console.error('renderCartDialog error:', renderErr);
    }

    var todayBill = parseFloat(cart.cost.totalAmount.amount);
    if (isNaN(todayBill)) todayBill = 0;
    totalsEl.innerHTML = '<div class="cdlg-total-row"><span class="cdlg-total-label">לתשלום היום</span><span class="cdlg-total-value">' + todayBill.toFixed(2) + '&nbsp;' + escapeHTML(sym) + '</span></div>';
    if (checkoutBtn) checkoutBtn.href = normalizeCheckoutUrl(cart.checkoutUrl);
  }

  async function fetchCart(cartId) {
    var data = await storefrontFetch([
      'query getCart($id: ID!) {',
      '  cart(id: $id) {',
      '    id checkoutUrl',
      '    lines(first: 20) { edges { node { ' + CART_LINE_FIELDS + ' } } }',
      '    cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }',
      '    discountCodes { code applicable }',
      '  }',
      '}'
    ].join('\n'), { id: cartId });
    return data.cart;
  }

  // Opening from the menu icon on a fresh page load has no in-memory cart, so the
  // drawer was painting the localStorage snapshot (no line IDs = no Remove). Re-fetch
  // the live Shopify cart by its stored ID so the menu cart behaves like the cart right
  // after add-to-cart (Remove + discounts). Falls back to the saved view if offline/expired.
  async function hydrateSavedCart() {
    var parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      parsed = null;
    }
    var cartId = parsed && !Array.isArray(parsed) ? parsed.cartId : '';
    if (!cartId) return;
    try {
      var cart = await fetchCart(cartId);
      if (cart && cart.lines && cart.lines.edges.length) {
        currentCart = cart;
        render(cart, currentConfig);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        renderSavedCart();
      }
    } catch (e) {
      // Network error or expired cart: keep the localStorage-rendered view as a graceful fallback.
    }
  }

  async function removeCartLine(lineId) {
    if (!currentCart || !lineId) return;
    showStatus('מסירים…');
    try {
      var data = await storefrontFetch([
        'mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {',
        '  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {',
        '    cart {',
        '      id checkoutUrl',
        '      lines(first: 20) { edges { node { ' + CART_LINE_FIELDS + ' } } }',
        '      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }',
        '      discountCodes { code applicable }',
        '    }',
        '    userErrors { field message }',
        '  }',
        '}'
      ].join('\n'), { cartId: currentCart.id, lineIds: [lineId] });

      var errors = data.cartLinesRemove.userErrors;
      if (errors.length) throw new Error(errors[0].message);
      var cartAfter = data.cartLinesRemove.cart;
      render(cartAfter, currentConfig);
      showStatus('');
    } catch (e) {
      showStatus(e.message || 'לא הצלחנו להסיר את הפריט. נסו שוב.');
    }
  }

  function open() {
    var drawer = ensureDrawer();
    if (currentCart) {
      render(currentCart, currentConfig);
    } else {
      renderSavedCart();
      hydrateSavedCart();
    }
    if (typeof drawer.showModal === 'function') {
      if (!drawer.open) drawer.showModal();
    } else {
      drawer.setAttribute('open', '');
    }
  }

  function close() {
    var drawer = document.getElementById('lavero-cart-dialog');
    if (!drawer) return;
    if (typeof drawer.close === 'function') drawer.close();
    else drawer.removeAttribute('open');
  }

  async function addConfiguredProduct(config, options) {
    var nextConfig;
    try {
      nextConfig = normalizeConfig(config);
      selectedLines(nextConfig);
    } catch (e) {
      showStatus(e.message, options && options.statusId);
      return null;
    }

    showStatus('מוסיפים לסל…', options && options.statusId);
    try {
      var cart = await buildShopifyCart(nextConfig);
      render(cart, nextConfig);
      fbTrack('AddToCart', cartEventParams(cart));
      showStatus('', options && options.statusId);
      open();
      return cart;
    } catch (e) {
      showStatus(e.message || 'Something went wrong. Please try again.', options && options.statusId);
      return null;
    }
  }

  async function addQuickProduct(options) {
    return addConfiguredProduct({
      sizes: [(options && options.size) || DEFAULT_SIZE],
      plan: 'one-time',
      quantity: 1
    }, { statusId: options && options.statusId });
  }

  async function buyConfiguredProductNow(config, options) {
    var nextConfig;
    try {
      nextConfig = normalizeConfig(config);
      selectedLines(nextConfig);
    } catch (e) {
      showStatus(e.message, options && options.statusId);
      return null;
    }

    showStatus('מעבדים את ההזמנה…', options && options.statusId);
    try {
      var cart = await buildShopifyCart(nextConfig);
      render(cart, nextConfig);
      fbTrack('AddToCart', cartEventParams(cart));
      window.location.href = normalizeCheckoutUrl(cart.checkoutUrl);
      return cart;
    } catch (e) {
      showStatus(e.message || 'Something went wrong. Please try again.', options && options.statusId);
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureDrawer();
    renderSavedCart();
  });

  window.LaveroCart = {
    sizes: ['S', 'M', 'L'],
    defaultSize: DEFAULT_SIZE,
    getVariantId: function (size) {
      return SIZE_VARIANTS[size] && SIZE_VARIANTS[size].variantId;
    },
    addQuickProduct: addQuickProduct,
    addConfiguredProduct: addConfiguredProduct,
    buyConfiguredProductNow: buyConfiguredProductNow,
    open: open,
    close: close,
    render: render,
    setBadge: setBadge,
    showStatus: showStatus,
    removeCartLine: removeCartLine
  };

  window.openLaveroCart = open;
  window.openProductCart = open;
})();
