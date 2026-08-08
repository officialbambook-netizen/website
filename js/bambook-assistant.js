(function () {
  'use strict';

  var knowledge = window.BambookAssistantKnowledge;
  if (!knowledge || document.getElementById('bambook-assistant')) return;

  var root;
  var launcher;
  var panel;
  var screenEl;
  var questionEl;
  var answerEl;
  var contextLinksEl;
  var followUpsEl;
  var followUpTitleEl;
  var choicesEl;
  var backButton;
  var menuButton;
  var productLink;
  var supportLink;
  var expandButton;
  var state = { nodeId: knowledge.rootId, history: [] };

  function createAssistant() {
    root = document.createElement('div');
    root.className = 'bambook-assistant';
    root.id = 'bambook-assistant';
    root.innerHTML = [
      '<button class="bambook-assistant__launcher" type="button" aria-label="פתיחת העוזר הדיגיטלי: קבלו עזרה מהצ׳אט" aria-expanded="false" aria-controls="bambook-assistant-panel">',
      '  <span class="bambook-assistant__launcher-mark" aria-hidden="true">',
      '    <svg viewBox="0 0 32 32" focusable="false">',
      '      <path d="M10 4v24"></path>',
      '      <path d="M10 5h7c3.8 0 6 2.1 6 5s-2.2 5-6 5h-7"></path>',
      '      <path d="M10 15h7.8c4.2 0 6.7 2.6 6.7 6s-2.5 6-6.7 6H10"></path>',
      '      <path d="M7.5 10h5M7.5 18h5M7.5 26h5"></path>',
      '      <path class="bambook-assistant__launcher-leaf" d="M8.8 6C6.3 6.1 4.4 4.7 3.6 2.5c2.6-.1 4.5 1.1 5.2 3.5Z"></path>',
      '    </svg>',
      '  </span>',
      '  <span class="bambook-assistant__launcher-label">קבלו עזרה מהצ׳אט</span>',
      '</button>',
      '<section class="bambook-assistant__panel" id="bambook-assistant-panel" role="dialog" aria-modal="false" aria-hidden="true" aria-labelledby="bambook-assistant-title">',
      '  <header class="bambook-assistant__header">',
      '    <div class="bambook-assistant__identity">',
      '      <strong class="bambook-assistant__brand" id="bambook-assistant-title"></strong>',
      '      <p class="bambook-assistant__status"></p>',
      '    </div>',
      '    <div class="bambook-assistant__header-actions">',
      '      <button class="bambook-assistant__reset" type="button" aria-label="חזרה לתפריט הראשי">',
      '        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path></svg>',
      '      </button>',
      '      <button class="bambook-assistant__expand" type="button" aria-label="הגדלת חלון העוזר" aria-pressed="false">',
      '        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
      '          <path class="bambook-assistant__expand-maximize" d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"></path>',
      '          <path class="bambook-assistant__expand-restore" d="M3 8h5V3M21 8h-5V3M21 16h-5v5M3 16h5v5"></path>',
      '        </svg>',
      '      </button>',
      '      <button class="bambook-assistant__close" type="button" aria-label="סגירת העוזר הדיגיטלי">',
      '        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>',
      '      </button>',
      '    </div>',
      '  </header>',
      '  <div class="bambook-assistant__screen" aria-live="polite" aria-atomic="true">',
      '    <section class="bambook-assistant__answer-card" aria-labelledby="bambook-assistant-question">',
      '      <h2 class="bambook-assistant__question" id="bambook-assistant-question"></h2>',
      '      <p class="bambook-assistant__answer"></p>',
      '      <div class="bambook-assistant__context-links"></div>',
      '    </section>',
      '    <section class="bambook-assistant__follow-ups" aria-label="שאלות המשך">',
      '      <p class="bambook-assistant__follow-up-title"></p>',
      '      <div class="bambook-assistant__choices"></div>',
      '    </section>',
      '  </div>',
      '  <nav class="bambook-assistant__navigation" aria-label="ניווט בעוזר הדיגיטלי">',
      '    <button class="bambook-assistant__back" type="button"></button>',
      '    <button class="bambook-assistant__menu" type="button"></button>',
      '    <a class="bambook-assistant__product" href="https://mybambook.com/product"></a>',
      '  </nav>',
      '  <a class="bambook-assistant__support" href="' + knowledge.urls.support + '"></a>',
      '</section>'
    ].join('');

    document.body.appendChild(root);
    launcher = root.querySelector('.bambook-assistant__launcher');
    panel = root.querySelector('.bambook-assistant__panel');
    screenEl = root.querySelector('.bambook-assistant__screen');
    questionEl = root.querySelector('.bambook-assistant__question');
    answerEl = root.querySelector('.bambook-assistant__answer');
    contextLinksEl = root.querySelector('.bambook-assistant__context-links');
    followUpsEl = root.querySelector('.bambook-assistant__follow-ups');
    followUpTitleEl = root.querySelector('.bambook-assistant__follow-up-title');
    choicesEl = root.querySelector('.bambook-assistant__choices');
    backButton = root.querySelector('.bambook-assistant__back');
    menuButton = root.querySelector('.bambook-assistant__menu');
    productLink = root.querySelector('.bambook-assistant__product');
    supportLink = root.querySelector('.bambook-assistant__support');
    expandButton = root.querySelector('.bambook-assistant__expand');

    root.querySelector('.bambook-assistant__brand').textContent = knowledge.brand;
    root.querySelector('.bambook-assistant__status').textContent = knowledge.status;
    followUpTitleEl.textContent = knowledge.labels.followUps;
    backButton.textContent = knowledge.labels.back;
    menuButton.textContent = knowledge.labels.menu;
    productLink.textContent = knowledge.labels.product;
    supportLink.textContent = knowledge.labels.support;

    bindEvents();
    renderNode();
    syncNegishotPosition();
    watchForNegishot();
  }

  function bindEvents() {
    launcher.addEventListener('click', togglePanel);
    root.querySelector('.bambook-assistant__close').addEventListener('click', closePanel);
    root.querySelector('.bambook-assistant__reset').addEventListener('click', goToMenu);
    expandButton.addEventListener('click', togglePanelSize);
    choicesEl.addEventListener('click', handleChoiceClick);
    backButton.addEventListener('click', goBack);
    menuButton.addEventListener('click', goToMenu);
    productLink.addEventListener('click', function () {
      track('link', productLink.href);
    });
    supportLink.addEventListener('click', function () {
      track('link', 'human_email');
    });
    contextLinksEl.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-assistant-link]');
      if (link) track('link', link.getAttribute('data-assistant-link'));
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && root.classList.contains('is-open')) closePanel();
    });

    window.addEventListener('resize', syncNegishotPosition, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncNegishotPosition, { passive: true });
      window.visualViewport.addEventListener('scroll', syncNegishotPosition, { passive: true });
    }
  }

  function togglePanel() {
    if (root.classList.contains('is-open')) closePanel();
    else openPanel();
  }

  function openPanel() {
    goToMenu(false);
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'סגירת העוזר הדיגיטלי');
    panel.setAttribute('aria-hidden', 'false');
    track('open', 'assistant');
  }

  function closePanel() {
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'פתיחת העוזר הדיגיטלי: קבלו עזרה מהצ׳אט');
    panel.setAttribute('aria-hidden', 'true');
    launcher.focus();
    track('close', 'assistant');
  }

  function togglePanelSize() {
    var isExpanded = root.classList.toggle('is-expanded');
    expandButton.setAttribute('aria-pressed', String(isExpanded));
    expandButton.setAttribute(
      'aria-label',
      isExpanded ? 'החזרת חלון העוזר לגודל רגיל' : 'הגדלת חלון העוזר'
    );
    track(isExpanded ? 'expand' : 'restore', 'assistant');
  }

  function handleChoiceClick(event) {
    var button = event.target.closest('button[data-assistant-node]');
    if (!button) return;
    navigateTo(button.getAttribute('data-assistant-node'));
  }

  function navigateTo(nodeId) {
    if (!knowledge.nodes[nodeId] || nodeId === state.nodeId) return;
    state.history.push(state.nodeId);
    state.nodeId = nodeId;
    renderNode();
    track('answer', nodeId);
  }

  function goBack() {
    if (!state.history.length) return;
    state.nodeId = state.history.pop();
    renderNode();
    track('back', state.nodeId);
  }

  function goToMenu(shouldTrack) {
    state.nodeId = knowledge.rootId;
    state.history = [];
    renderNode();
    if (shouldTrack !== false) track('menu', knowledge.rootId);
  }

  function renderNode() {
    var node = knowledge.nodes[state.nodeId];
    if (!node) return;

    questionEl.textContent = node.question;
    answerEl.textContent = node.answer;
    choicesEl.replaceChildren();

    node.children.forEach(function (childId) {
      var child = knowledge.nodes[childId];
      var button = document.createElement('button');
      button.className = 'bambook-assistant__choice';
      button.type = 'button';
      button.setAttribute('data-assistant-node', childId);
      button.textContent = child.question;
      choicesEl.appendChild(button);
    });

    followUpsEl.hidden = !node.children.length;
    backButton.disabled = !state.history.length;
    menuButton.disabled = state.nodeId === knowledge.rootId;
    productLink.href = node.productUrl || knowledge.urls.product;
    productLink.classList.toggle('is-emphasized', Boolean(node.emphasizeProduct));
    renderContextLinks(node.links || []);
    screenEl.scrollTop = 0;
  }

  function renderContextLinks(links) {
    contextLinksEl.replaceChildren();
    links.forEach(function (linkData) {
      var link = document.createElement('a');
      link.className = 'bambook-assistant__context-link';
      link.href = linkData.href;
      link.setAttribute(
        'data-assistant-link',
        linkData.href.indexOf('mailto:') === 0 ? 'human_email' : linkData.href
      );
      link.textContent = linkData.label;
      contextLinksEl.appendChild(link);
    });
    contextLinksEl.hidden = !links.length;
  }

  function getNegishotButton() {
    var host = document.getElementById('negishot-ui-host');
    if (!host || !host.shadowRoot) return null;
    var widget = host.shadowRoot.getElementById('negishot-widget');
    return widget && (widget.querySelector('.negishot-btn') || widget);
  }

  function syncNegishotPosition() {
    if (!root) return;
    var button = getNegishotButton();
    if (!button) return;
    var rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var tokenStyles = window.getComputedStyle(document.documentElement);
    var gap = parseFloat(tokenStyles.getPropertyValue('--assistant-stack-gap'));
    var edge = parseFloat(tokenStyles.getPropertyValue('--assistant-edge'));
    var bottom = Math.max(edge, window.innerHeight - rect.top + gap);
    var inlineStart = Math.max(edge, window.innerWidth - rect.right);
    root.style.setProperty('--assistant-bottom', bottom + 'px');
    root.style.setProperty('--assistant-inline-start', inlineStart + 'px');
  }

  function watchForNegishot() {
    if (getNegishotButton()) {
      syncNegishotPosition();
      return;
    }

    var observer = new MutationObserver(function () {
      if (!getNegishotButton()) return;
      syncNegishotPosition();
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function track(type, intent) {
    window.dispatchEvent(new CustomEvent('bambook:assistant', {
      detail: { type: type, intent: intent }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createAssistant);
  } else {
    createAssistant();
  }
})();
