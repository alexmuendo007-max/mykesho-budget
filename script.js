const $ = (id) => document.getElementById(id);
let state = { income: 0, categories: [], month: new Date().toISOString().slice(0, 7) };

const quotes = [
  { text: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
  { text: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock" },
  { text: "The goal isn’t more money. The goal is living life on your terms.", author: "Chris Guillebeau" },
  { text: "Every shilling saved is a shilling earned.", author: "Kenyan Proverb" },
  { text: "Do not save what is left after spending; spend what is left after saving.", author: "Warren Buffett" }
];

let currentQuote = 0;

// Load & Save
function loadData() {
  const saved = localStorage.getItem('mykesho');
  if (saved) {
    state = JSON.parse(saved);
  } else {
    initCategories();
  }
  render();
  showQuote();
}

function saveData() {
  localStorage.setItem('mykesho', JSON.stringify(state));
}

function initCategories() {
  state.categories = [
    { name: "Rent/Housing", group: "needs", budget: 0, spent: 0, transactions: [] },
    { name: "Utilities", group: "needs", budget: 0, spent: 0, transactions: [] },
    { name: "Transport", group: "needs", budget: 0, spent: 0, transactions: [] },
    { name: "Food & Groceries", group: "wants", budget: 0, spent: 0, transactions: [] },
    { name: "Entertainment", group: "wants", budget: 0, spent: 0, transactions: [] },
    { name: "Emergency Fund", group: "savings", budget: 0, spent: 0, transactions: [] },
    { name: "Loans/Debt", group: "buffer", budget: 0, spent: 0, transactions: [] }
  ];
}

// Render
function render() {
  if (!state.income) {
    showOnboarding();
  } else {
    showDashboard();
  }
}

// === ONBOARDING ===
function showOnboarding() {
  $('onboarding').classList.remove('hidden');
  $('dashboard').classList.add('hidden');

  const startBtn = $('startBtn');
  if (startBtn) {
    startBtn.onclick = () => {
      const income = parseFloat($('incomeInput').value);
      if (income > 0) {
        state.income = income;
        applyBudgetRules();
        saveData();
        render();
        showQuote();
      }
    };
  }
}

// === DASHBOARD ===
function showDashboard() {
  $('onboarding').classList.add('hidden');
  $('dashboard').classList.remove('hidden');

  const totalSpent = state.categories.reduce((s, c) => s + c.spent, 0);
  const remaining = state.income - totalSpent;
  const percent = Math.min(100, (totalSpent / state.income) * 100);

  $('income').textContent = formatKSh(state.income);
  $('spent').textContent = formatKSh(totalSpent);
  $('remaining').textContent = formatKSh(remaining);
  $('progressBar').style.width = percent + '%';
  $('progressLabel').textContent = Math.round(percent) + '%';

  const list = $('categoryList');
  list.innerHTML = '';
  state.categories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'category-card';
    if (cat.spent > cat.budget) card.classList.add('over-budget');

    const catPercent = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;

    card.innerHTML = `
      <h3>
        <span>${getIcon(cat.name)} ${cat.name}</span>
        <span class="amount">${formatKSh(cat.spent)} / ${formatKSh(cat.budget)}</span>
      </h3>
      <div class="progress">
        <div class="progress-fill" style="width: ${catPercent}%"></div>
      </div>
    `;
    list.appendChild(card);
  });

  setupDashboardButtons();
}

// === DASHBOARD BUTTONS ===
function setupDashboardButtons() {
  const addBtn = $('addExpenseBtn');
  const editBtn = $('editBudgetBtn');
  const mpesaBtn = $('mpesaBtn');
  const pdfBtn = $('exportPdfBtn');

  if (addBtn) addBtn.onclick = openAddModal;
  if (editBtn) editBtn.onclick = openEditModal;
  if (mpesaBtn) mpesaBtn.onclick = openMpesaModal;
  if (pdfBtn) pdfBtn.onclick = exportToPDF;
}

// === ADD EXPENSE MODAL ===
function openAddModal() {
  const modal = $('addModal');
  modal.classList.remove('hidden');
  $('amountInput').focus();
  $('amountInput').value = '';
  $('noteInput').value = '';
  $('dateInput').value = new Date().toISOString().split('T')[0];

  const select = $('categorySelect');
  select.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = new Option(cat.name, cat.name);
    select.add(opt);
  });

  const cancelBtn = $('cancelBtn');
  const saveBtn = $('saveBtn');

  const closeModal = () => modal.classList.add('hidden');

  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (saveBtn) {
    saveBtn.onclick = () => {
      const amount = parseFloat($('amountInput').value);
      const category = $('categorySelect').value;
      const date = $('dateInput').value;
      const note = $('noteInput').value;

      if (amount > 0 && category) {
        const cat = state.categories.find(c => c.name === category);
        if (cat) {
          cat.spent += amount;
          cat.transactions.push({ amount, date, note });
          saveData();
          render();
          closeModal();
          showQuote();
        }
      }
    };
  }
}

// === EDIT BUDGET MODAL ===
function openEditModal() {
  const modal = $('editModal');
  modal.classList.remove('hidden');
  $('editIncome').value = state.income;

  const container = $('budgetInputs');
  container.innerHTML = '';
  state.categories.forEach(cat => {
    const div = document.createElement('div');
    div.style.marginBottom = '1rem';
    div.innerHTML = `
      <label style="display:block; font-size:0.9rem; color:#666;">${cat.name}</label>
      <input type="number" data-name="${cat.name}" value="${cat.budget}" placeholder="0" style="width:100%;padding:0.8rem;border:1px solid #ddd;border-radius:8px;"/>
    `;
    container.appendChild(div);
  });

  const saveBtn = $('saveBudget');
  const resetBtn = $('resetDefault');

  const closeModal = () => modal.classList.add('hidden');

  if (saveBtn) {
    saveBtn.onclick = () => {
      const newIncome = parseFloat($('editIncome').value);
      if (newIncome > 0) {
        state.income = newIncome;
        container.querySelectorAll('input').forEach(inp => {
          const name = inp.dataset.name;
          const budget = parseFloat(inp.value) || 0;
          const cat = state.categories.find(c => c.name === name);
          if (cat) cat.budget = budget;
        });
        saveData();
        render();
        closeModal();
      }
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      state.income = parseFloat($('editIncome').value) || state.income;
      applyBudgetRules();
      saveData();
      openEditModal();
    };
  }
}

// === M-PESA IMPORT ===
function parseMpesaSMS(text) {
  const patterns = {
    amount: /Ksh([\d,]+\.?\d*)/i,
    payee: /to\s+([A-Z][\w\s]+?)(?=\s+on|\s+at|$)/i,
    date: /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    confirmed: /Confirmed/i
  };

  if (!patterns.confirmed.test(text)) return null;

  const amountMatch = text.match(patterns.amount);
  const payeeMatch = text.match(patterns.payee);
  const dateMatch = text.match(patterns.date);

  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const payee = payeeMatch ? payeeMatch[1].trim() : 'Unknown';
  const rawDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-GB');
  const [d, m, y] = rawDate.split('/');
  const date = `${y.length === 2 ? '20' + y : y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;

  const categoryMap = {
    'NAIVAS': 'Food & Groceries', 'JAVAHouse': 'Food & Groceries', 'CARREFOUR': 'Food & Groceries',
    'KPLC': 'Utilities', 'SAFARICOM': 'Utilities', 'AIRTEL': 'Utilities',
    'LANDLORD': 'Rent/Housing', 'RENT': 'Rent/Housing',
    'MATATU': 'Transport', 'BODA': 'Transport', 'UBER': 'Transport', 'BOLT': 'Transport'
  };

  let category = 'Food & Groceries';
  for (const [key, cat] of Object.entries(categoryMap)) {
    if (payee.toUpperCase().includes(key)) {
      category = cat;
      break;
    }
  }

  return { amount, payee, date, category };
}

function openMpesaModal() {
  const modal = $('mpesaModal');
  modal.classList.remove('hidden');
  $('smsInput').value = '';
  $('parsedPreview').classList.add('hidden');
  $('mpesaSave').classList.add('hidden');

  const cancelBtn = $('mpesaCancel');
  const saveBtn = $('mpesaSave');

  const closeModal = () => modal.classList.add('hidden');

  if (cancelBtn) cancelBtn.onclick = closeModal;

  $('smsInput').oninput = () => {
    const sms = $('smsInput').value.trim();
    const parsed = parseMpesaSMS(sms);
    const preview = $('parsedPreview');

    if (parsed) {
      $('pAmount').textContent = formatKSh(parsed.amount);
      $('pPayee').textContent = parsed.payee;
      $('pDate').textContent = new Date(parsed.date).toLocaleDateString('en-GB');
      $('pCategory').textContent = parsed.category;
      preview.classList.remove('hidden');
      $('mpesaSave').classList.remove('hidden');

      if (saveBtn) {
        saveBtn.onclick = () => {
          const cat = state.categories.find(c => c.name === parsed.category);
          if (cat) {
            cat.spent += parsed.amount;
            cat.transactions.push({ amount: parsed.amount, date: parsed.date, note: `M-Pesa to ${parsed.payee}` });
            saveData();
            render();
            closeModal();
            showQuote();
          }
        };
      }
    } else {
      preview.classList.add('hidden');
      $('mpesaSave').classList.add('hidden');
    }
  };
}

// === PDF EXPORT ===
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const totalSpent = state.categories.reduce((s, c) => s + c.spent, 0);
  const remaining = state.income - totalSpent;

  doc.setFontSize(20);
  doc.setTextColor(0, 100, 0);
  doc.text("MyKesho Budget Report", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(monthName, 105, 28, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Income: KSh ${state.income.toLocaleString()}`, 20, 40);
  doc.text(`Spent: KSh ${totalSpent.toLocaleString()}`, 20, 48);
  doc.text(`Remaining: KSh ${remaining.toLocaleString()}`, 20, 56);

  const percent = Math.min(100, (totalSpent / state.income) * 100);
  doc.setFillColor(220, 53, 69);
  doc.rect(20, 62, 170 * (percent / 100), 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, 62, 170, 8, 'S');
  doc.setFontSize(9);
  doc.text(`${Math.round(percent)}% used`, 195, 67, { align: "right" });

  let y = 80;
  doc.setFontSize(12);
  doc.setTextColor(0, 100, 0);
  doc.text("Category Breakdown", 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  state.categories.forEach(cat => {
    const spent = cat.spent;
    const budget = cat.budget || 1;
    const catPercent = Math.min(100, (spent / budget) * 100);

    doc.text(cat.name, 20, y);
    doc.text(`KSh ${spent.toLocaleString()} / ${budget.toLocaleString()}`, 130, y, { align: "right" });

    const barWidth = 60;
    doc.setFillColor(catPercent > 100 ? 220 : 40, catPercent > 100 ? 53 : 167, catPercent > 100 ? 69 : 71);
    doc.rect(130, y + 2, barWidth * (catPercent / 100), 4, 'F');
    doc.setDrawColor(200);
    doc.rect(130, y + 2, barWidth, 4, 'S');

    y += 12;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleDateString()} • MyKesho Budget Tracker`, 105, 290, { align: "center" });

  doc.save(`MyKesho-${monthName.replace(" ", "-")}.pdf`);
}

// === BUDGET RULES === (FIXED)
function applyBudgetRules() {
  const needs = state.income * 0.5;
  const wants = state.income * 0.3;
  const savings = state.income * 0.1;
  const buffer = state.income * 0.1;

  const needsCats = state.categories.filter(c => c.group === 'needs');
  const wantsCats = state.categories.filter(c => c.group === 'wants');
  const savingsCats = state.categories.filter(c => c.group === 'savings');  // FIXED
  const bufferCats = state.categories.filter(c => c.group === 'buffer');

  needsCats.forEach((c, i) => c.budget = Math.round(needs / needsCats.length));
  wantsCats.forEach((c, i) => c.budget = Math.round(wants / wantsCats.length));
  savingsCats.forEach((c, i) => c.budget = Math.round(savings / savingsCats.length));  // FIXED
  bufferCats.forEach((c, i) => c.budget = Math.round(buffer / bufferCats.length));
}

// === UTILS ===
function formatKSh(amount) {
  return 'KSh ' + Math.round(amount).toLocaleString();
}

function getIcon(name) {
  const icons = {
    'Rent': 'House', 'Utilities': 'Light', 'Transport': 'Bus',
    'Food': 'Plate', 'Entertainment': 'Movie', 'Emergency': 'Shield', 'Loans': 'Credit Card'
  };
  return icons[name.split(' ')[0]] || 'Money';
}

// === QUOTE SYSTEM ===
function showQuote() {
  const quote = quotes[currentQuote];
  $('quoteText').textContent = quote.text;
  $('quoteAuthor').textContent = `— ${quote.author}`;
  const el = $('quote');
  el.classList.remove('show');
  setTimeout(() => el.classList.add('show'), 100);
  currentQuote = (currentQuote + 1) % quotes.length;
}

// === PWA ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

// === INIT ===
loadData();