const USER_ID_KEY = 'subscription_tracker_user_id';

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥'
};

function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id || id.length < 8) {
    id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function t() { return (window.__i18n && window.__i18n.t) || {}; }
function base() { return (window.__i18n && window.__i18n.base) || ''; }

function fmtCurrency(amount, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return sym + amount.toFixed(2);
}

async function loadSubscriptions() {
  const res = await fetch(base() + '/api/subscriptions/list?user_id=' + encodeURIComponent(getUserId()));
}

function renderList(subs) {
  const list = document.getElementById('list');
  const empty = document.getElementById('emptyState');
  const tr = t();

  // 计算总览
  let monthly = 0;
  let count = subs.length;
  for (const s of subs) {
    const amt = parseFloat(s.amount) || 0;
    if (s.cycle === 'yearly') monthly += amt / 12;
    else monthly += amt;
  }
  const yearly = monthly * 12;

  // 用主货币（第一个订阅的货币，或 USD）
  const mainCurrency = subs.length > 0 ? subs[0].currency : 'USD';

  document.getElementById('sumMonthly').textContent = fmtCurrency(monthly, mainCurrency);
  document.getElementById('sumYearly').textContent = fmtCurrency(yearly, mainCurrency);
  document.getElementById('sumCount').textContent = count;

  if (subs.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = subs.map(s => {
    const amt = parseFloat(s.amount) || 0;
    const cycleLabel = s.cycle === 'yearly' ? (tr.cycleYearly || 'Yearly') : (tr.cycleMonthly || 'Monthly');
    const monthlyEquiv = s.cycle === 'yearly' ? (amt / 12).toFixed(2) : amt.toFixed(2);
    const catLabel = tr['cat' + s.category.charAt(0).toUpperCase() + s.category.slice(1)] || s.category;
    const dueInfo = s.next_due ? ' · ' + (tr.nextDue || 'Next:') + ' ' + s.next_due : '';
    return '<div class="sub-item" data-id="' + s.id + '">' +
      '<div class="info">' +
        '<div class="name">' + escapeHtml(s.name) + ' <span class="cat-badge">' + escapeHtml(catLabel) + '</span></div>' +
        '<div class="meta">' + (tr.monthlyEquiv || 'Monthly:') + ' ' + fmtCurrency(parseFloat(monthlyEquiv), s.currency) + dueInfo + '</div>' +
      '</div>' +
      '<div class="right">' +
        '<div class="amount">' + fmtCurrency(amt, s.currency) + '</div>' +
        '<div class="cycle">' + cycleLabel + '</div>' +
      '</div>' +
      '<button class="del-btn" onclick="deleteSub(' + s.id + ')" title="' + (tr.delBtn || 'Delete') + '">✕</button>' +
    '</div>';
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function addSubscription() {
  const res = await fetch(base() + '/api/subscriptions/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: getUserId(),
      name, amount, currency, cycle, category, next_due
    })
  });
}

async function deleteSub(id) {
  const res = await fetch(base() + '/api/subscriptions/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: getUserId(), id: id })
  });
}

async function clearAll() {
  for (const s of subs) {
    await fetch(base() + '/api/subscriptions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: getUserId(), id: s.id })
    });
  }
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
}

window.addSubscription = addSubscription;
window.deleteSub = deleteSub;
window.clearAll = clearAll;
window.loadSubscriptions = loadSubscriptions;