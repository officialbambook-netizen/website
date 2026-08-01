(function () {
  'use strict';

  var knowledge = window.BambookAssistantKnowledge;
  if (!knowledge || document.getElementById('bambook-assistant')) return;

  var SESSION_KEY = 'bambookAssistantSessionV1';
  var MAX_MESSAGES = 16;
  var root;
  var launcher;
  var panel;
  var bodyEl;
  var messagesEl;
  var suggestionsGroup;
  var suggestionsTitle;
  var suggestionsEl;
  var input;
  var sendButton;
  var expandButton;
  var state = { messages: [], purchaseScore: 0, seenIntents: [] };

  function createAssistant() {
    root = document.createElement('div');
    root.className = 'bambook-assistant';
    root.id = 'bambook-assistant';
    root.innerHTML = [
      '<button class="bambook-assistant__launcher" type="button" aria-label="פתיחת הצ׳אט: קבלו עזרה מהצ׳אט" aria-expanded="false" aria-controls="bambook-assistant-panel">',
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
      '      <button class="bambook-assistant__reset" type="button" aria-label="פתיחת שיחה חדשה">',
      '        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path></svg>',
      '      </button>',
      '      <button class="bambook-assistant__expand" type="button" aria-label="הגדלת חלון הצ׳אט" aria-pressed="false">',
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
      '  <div class="bambook-assistant__body">',
      '    <div class="bambook-assistant__messages" role="log" aria-live="polite" aria-relevant="additions text"></div>',
      '    <section class="bambook-assistant__suggestion-group" aria-label="שאלות מוצעות">',
      '      <p class="bambook-assistant__suggestion-title"></p>',
      '      <div class="bambook-assistant__suggestions"></div>',
      '    </section>',
      '  </div>',
      '  <form class="bambook-assistant__composer">',
      '    <label class="bambook-assistant__sr-only" for="bambook-assistant-input">כתבו שאלה</label>',
      '    <input class="bambook-assistant__input" id="bambook-assistant-input" type="text" inputmode="text" dir="auto" autocomplete="off" maxlength="300" placeholder="כתבו שאלה...">',
      '    <button class="bambook-assistant__send" type="submit" aria-label="שליחת השאלה" disabled>',
      '      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>',
      '    </button>',
      '  </form>',
      '  <p class="bambook-assistant__privacy"></p>',
      '</section>'
    ].join('');

    document.body.appendChild(root);
    launcher = root.querySelector('.bambook-assistant__launcher');
    panel = root.querySelector('.bambook-assistant__panel');
    bodyEl = root.querySelector('.bambook-assistant__body');
    messagesEl = root.querySelector('.bambook-assistant__messages');
    suggestionsGroup = root.querySelector('.bambook-assistant__suggestion-group');
    suggestionsTitle = root.querySelector('.bambook-assistant__suggestion-title');
    suggestionsEl = root.querySelector('.bambook-assistant__suggestions');
    input = root.querySelector('.bambook-assistant__input');
    sendButton = root.querySelector('.bambook-assistant__send');
    expandButton = root.querySelector('.bambook-assistant__expand');

    root.querySelector('.bambook-assistant__brand').textContent = knowledge.brand;
    root.querySelector('.bambook-assistant__status').textContent = knowledge.status;
    root.querySelector('.bambook-assistant__privacy').textContent = knowledge.privacy;
    suggestionsTitle.textContent = knowledge.suggestionsLabel;

    bindEvents();
    restoreConversation();
    syncNegishotPosition();
    watchForNegishot();
  }

  function bindEvents() {
    launcher.addEventListener('click', togglePanel);
    root.querySelector('.bambook-assistant__close').addEventListener('click', closePanel);
    expandButton.addEventListener('click', togglePanelSize);
    root.querySelector('.bambook-assistant__reset').addEventListener('click', resetConversation);
    root.querySelector('.bambook-assistant__composer').addEventListener('submit', submitQuestion);
    suggestionsEl.addEventListener('click', handleSuggestionClick);
    input.addEventListener('input', updateComposerState);

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
    if (root.classList.contains('is-open')) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'סגירת הצ׳אט');
    panel.setAttribute('aria-hidden', 'false');
    track('open', 'assistant');
  }

  function closePanel() {
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'פתיחת הצ׳אט: קבלו עזרה מהצ׳אט');
    panel.setAttribute('aria-hidden', 'true');
    launcher.focus();
    track('close', 'assistant');
  }

  function togglePanelSize() {
    var isExpanded = root.classList.toggle('is-expanded');
    expandButton.setAttribute('aria-pressed', String(isExpanded));
    expandButton.setAttribute(
      'aria-label',
      isExpanded ? 'החזרת חלון הצ׳אט לגודל רגיל' : 'הגדלת חלון הצ׳אט'
    );
    track(isExpanded ? 'expand' : 'restore', 'assistant');
  }

  function resetConversation() {
    state.messages = [];
    state.purchaseScore = 0;
    state.seenIntents = [];
    clearSavedConversation();
    messagesEl.replaceChildren();
    addMessage('assistant', knowledge.welcome, false);
    renderSuggestions(knowledge.quickActions);
    scrollConversationStart();
    input.focus();
    track('reset', 'assistant');
  }

  function submitQuestion(event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    updateComposerState();
    addMessage('user', text, !containsSensitiveData(text));
    respond(resolveIntent(text));
  }

  function handleSuggestionClick(event) {
    var link = event.target.closest('a[data-assistant-link]');
    if (link) {
      track('link', link.getAttribute('data-assistant-link'));
      return;
    }

    var button = event.target.closest('button[data-assistant-intent]');
    if (!button) return;
    var intent = button.getAttribute('data-assistant-intent');
    addMessage('user', button.textContent.trim(), true);
    respond(intent);
  }

  function respond(intent) {
    var response = knowledge.responses[intent] || knowledge.responses.fallback;
    recordIntent(intent);
    addMessage('assistant', response.text, intent !== 'sensitive');
    renderSuggestions(actionsForResponse(intent, response));
    track('answer', intent || 'fallback');
  }

  function recordIntent(intent) {
    var purchaseIntent = knowledge.purchaseIntent;
    if (!purchaseIntent || state.seenIntents.indexOf(intent) !== -1) return;
    var weight = purchaseIntent.weights[intent] || 0;
    if (!weight) return;
    state.seenIntents.push(intent);
    state.purchaseScore += weight;
  }

  function actionsForResponse(intent, response) {
    var actions = (response.actions || knowledge.quickActions).slice();
    var purchaseIntent = knowledge.purchaseIntent;
    if (!purchaseIntent) return actions;
    var isEligible = purchaseIntent.eligibleIntents.indexOf(intent) !== -1;
    var isWarm = state.purchaseScore >= purchaseIntent.threshold;
    var alreadyLinked = actions.some(function (action) {
      return action.href === purchaseIntent.action.href;
    });
    if (isEligible && isWarm && !alreadyLinked) actions.push(purchaseIntent.action);
    return actions;
  }

  function addMessage(role, text, persist) {
    var message = { role: role, text: text, persist: persist !== false };
    state.messages.push(message);
    if (state.messages.length > MAX_MESSAGES) state.messages.shift();

    var row = document.createElement('div');
    row.className = 'bambook-assistant__message ' + (role === 'user' ? 'is-user' : 'is-assistant');
    var bubble = document.createElement('p');
    bubble.className = 'bambook-assistant__bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollConversation();
    saveConversation();
  }

  function renderSuggestions(actions) {
    suggestionsEl.replaceChildren();
    var availableActions = actions || [];
    suggestionsGroup.hidden = !availableActions.length;
    availableActions.forEach(function (action) {
      var element;
      if (action.href) {
        element = document.createElement('a');
        element.href = action.href;
        element.setAttribute('data-assistant-link', action.href.indexOf('mailto:') === 0 ? 'human_email' : action.href);
      } else {
        element = document.createElement('button');
        element.type = 'button';
        element.setAttribute('data-assistant-intent', action.intent);
      }
      element.className = 'bambook-assistant__suggestion';
      element.textContent = action.label;
      suggestionsEl.appendChild(element);
    });
    scrollConversation();
  }

  function updateComposerState() {
    sendButton.disabled = !input.value.trim();
  }

  function scrollConversation() {
    window.requestAnimationFrame(function () {
      bodyEl.scrollTop = bodyEl.scrollHeight;
    });
  }

  function scrollConversationStart() {
    window.requestAnimationFrame(function () {
      bodyEl.scrollTop = 0;
    });
  }

  function restoreConversation() {
    var saved = readSavedConversation();
    if (!saved.length) {
      addMessage('assistant', knowledge.welcome, false);
      renderSuggestions(knowledge.quickActions);
      scrollConversationStart();
      return;
    }

    saved.forEach(function (message) {
      addMessage(message.role, message.text, true);
    });
    renderSuggestions(knowledge.quickActions);
  }

  function readSavedConversation() {
    try {
      var parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (message) {
        return message && (message.role === 'user' || message.role === 'assistant') && typeof message.text === 'string';
      }).slice(-MAX_MESSAGES);
    } catch (error) {
      return [];
    }
  }

  function saveConversation() {
    try {
      var safeMessages = state.messages.filter(function (message) {
        return message.persist;
      }).map(function (message) {
        return { role: message.role, text: message.text };
      }).slice(-MAX_MESSAGES);
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeMessages));
    } catch (error) {}
  }

  function clearSavedConversation() {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {}
  }

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[.,!?"'״׳()]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function resolveIntent(text) {
    if (containsSensitiveData(text)) return 'sensitive';
    var normalized = normalize(text);
    var bestIntent = 'fallback';
    var bestScore = 0;

    knowledge.routes.forEach(function (route) {
      var score = route.keywords.reduce(function (total, keyword) {
        return total + (normalized.indexOf(normalize(keyword)) !== -1 ? 1 : 0);
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = route.intent;
      }
    });

    return bestIntent;
  }

  function containsSensitiveData(text) {
    var normalized = normalize(text);
    var longNumber = /(?:\d[\s-]?){8,}/.test(text);
    var email = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text);
    var sensitiveWords = ['סיסמה', 'תעודת זהות', 'מספר כרטיס', 'קוד אבטחה', 'cvv'];
    return longNumber || email || sensitiveWords.some(function (word) {
      return normalized.indexOf(normalize(word)) !== -1;
    });
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
