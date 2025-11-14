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
  if (saved) state = JSON.parse(saved);
  else initCategories();
  render(); showQuote();
}
function saveData() { localStorage.setItem('mykesho', JSON.stringify(state)); }

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
function render() { state.income ? showDashboard() : showOnboarding(); }

// === ONBOARDING ===
function showOnboarding() {
  $('onboarding').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
  $('startBtn').onclick = () => {
    const inc = parseFloat($('incomeInput').value);
    if (inc > 0) { state.income = inc; applyBudgetRules(); saveData(); render(); showQuote(); }
  };
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

  renderCategorySummary();
  renderExpensesList();

  setupDashboardButtons();
}

function renderCategorySummary() {
  const list = $('categoryList');
  list.innerHTML = '';
  state.categories.forEach((cat, catIdx) => {
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
      <div class="card-actions">
        <button class="edit-btn" data-cat="${catIdx}" title="Edit Category">
          <svg><use href="#edit"></use></svg>
        </button>
        <button class="delete-btn" data-cat="${catIdx}" title="Delete Category">
          <svg><use href="#delete"></use></svg>
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.cat);
      editCategory(idx);
    };
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.cat);
      deleteCategory(idx);
    };
  });
}

function editCategory(catIdx) {
  const cat = state.categories[catIdx];
  if (!confirm(`Edit budget for "${cat.name}"?\nCurrent: ${formatKSh(cat.budget)}`)) return;

  const newBudget = prompt(`Enter new budget for "${cat.name}":`, cat.budget);
  if (newBudget !== null && !isNaN(newBudget) && parseFloat(newBudget) >= 0) {
    cat.budget = Math.round(parseFloat(newBudget));
    saveData();
    render();
  }
}

function deleteCategory(catIdx) {
  const cat = state.categories[catIdx];
  if (!confirm(`Delete category "${cat.name}"?\nThis will remove all expenses in it.`)) return;

  if (cat.spent > 0) {
    if (!confirm(`Warning: KSh ${cat.spent.toLocaleString()} spent will be lost. Continue?`)) return;
  }

  state.categories.splice(catIdx, 1);
  saveData();
  render();
}

function renderExpensesList() {
  const list = $('expensesList');
  list.innerHTML = '<div style="padding:0.8rem 1rem; font-weight:600; color:#006400;">Recent Expenses</div>';
  const allTx = [];
  state.categories.forEach(cat => {
    cat.transactions.forEach(tx => {
      allTx.push({ ...tx, category: cat.name });
    });
  });
  allTx.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allTx.length === 0) {
    list.innerHTML += '<div style="padding:1rem; text-align:center; color:#888;">No expenses yet.</div>';
    return;
  }

  allTx.forEach((tx, idx) => {
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.innerHTML = `
      <div class="expense-details">
        <div>${tx.category} • ${new Date(tx.date).toLocaleDateString('en-GB')}</div>
        <div class="expense-amount">${formatKSh(tx.amount)}</div>
        ${tx.note ? `<div class="expense-note">${tx.note}</div>` : ''}
      </div>
      <div class="expense-actions">
        <button class="edit-expense" data-idx="${idx}" title="Edit">
          <svg><use href="#edit"></use></svg>
        </button>
        <button class="delete-btn" data-idx="${idx}" title="Delete">
          <svg><use href="#delete"></use></svg>
        </button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.edit-expense').forEach(btn => {
    btn.onclick = () => editExpense(parseInt(btn.dataset.idx), allTx);
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => deleteExpense(parseInt(btn.dataset.idx), allTx);
  });
}

let editingExpense = null;
function editExpense(globalIdx, allTx) {
  const tx = allTx[globalIdx];
  if (!confirm(`Edit expense of ${formatKSh(tx.amount)} on ${tx.date}?`)) return;
  openAddModal(tx, globalIdx);
}

function deleteExpense(globalIdx, allTx) {
  const tx = allTx[globalIdx];
  if (!confirm(`Delete expense of ${formatKSh(tx.amount)} from ${tx.category}?`)) return;

  const cat = state.categories.find(c => c.name === tx.category);
  if (cat) {
    cat.transactions = cat.transactions.filter(t => 
      !(t.amount === tx.amount && t.date === tx.date && t.note === tx.note)
    );
    cat.spent -= tx.amount;
    saveData();
    render();
    showQuote();
  }
}

function openAddModal(expense = null, globalIdx = null) {
  editingExpense = expense ? { ...expense, globalIdx } : null;
  const modal = $('addModal');
  const title = $('modalTitle');
  title.textContent = editingExpense ? 'Edit Expense' : 'Add Expense';

  modal.classList.remove('hidden');
  $('amountInput').value = editingExpense?.amount || '';
  $('noteInput').value = editingExpense?.note || '';
  $('dateInput').value = editingExpense?.date || new Date().toISOString().split('T')[0];

  const select = $('categorySelect');
  select.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = new Option(cat.name, cat.name);
    if (editingExpense && cat.name === editingExpense.category) opt.selected = true;
    select.add(opt);
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    editingExpense = null;
  };

  $('cancelBtn').onclick = closeModal;
  $('saveBtn').onclick = () => {
    const amount = parseFloat($('amountInput').value);
    const category = $('categorySelect').value;
    const date = $('dateInput').value;
    const note = $('noteInput').value;

    if (amount > 0 && category) {
      if (editingExpense) {
        const oldCat = state.categories.find(c => c.name === editingExpense.category);
        if (oldCat) {
          oldCat.spent -= editingExpense.amount;
          oldCat.transactions = oldCat.transactions.filter(t =>
            !(t.amount === editingExpense.amount && t.date === editingExpense.date && t.note === editingExpense.note)
          );
        }
      }

      const cat = state.categories.find(c => c.name === category);
      if (cat) {
        cat.spent += amount;
        cat.transactions.push({ amount, date, note });
      }

      saveData();
      render();
      closeModal();
      showQuote();
    }
  };
}

// === REST OF FUNCTIONS (unchanged) ===
function setupDashboardButtons() {
  $('addExpenseBtn').onclick = () => openAddModal();
  $('editBudgetBtn').onclick = openEditModal;
  $('mpesaBtn').onclick = openMpesaModal;
  $('exportPdfBtn').onclick = exportToPDF;
}

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
      <input type="number" data-name="${cat.name}" value="${cat.budget}" placeholder="0" style="width:100%;padding:.8rem;border:1px solid #ddd;border-radius:8px;"/>
    `;
    container.appendChild(div);
  });

  const closeModal = () => modal.classList.add('hidden');

  $('saveBudget').onclick = () => {
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

  $('resetDefault').onclick = () => {
    state.income = parseFloat($('editIncome').value) || state.income;
    applyBudgetRules();
    saveData();
    openEditModal();
  };
}

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

  const closeModal = () => modal.classList.add('hidden');
  $('mpesaCancel').onclick = closeModal;

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

      $('mpesaSave').onclick = () => {
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
    } else {
      preview.classList.add('hidden');
      $('mpesaSave').classList.add('hidden');
    }
  };
}

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

function applyBudgetRules() {
  const needs = state.income * 0.5;
  const wants = state.income * 0.3;
  const savings = state.income * 0.1;
  const buffer = state.income * 0.1;

  const needsCats = state.categories.filter(c => c.group === 'needs');
  const wantsCats = state.categories.filter(c => c.group === 'wants');
  const savingsCats = state.categories.filter(c => c.group === 'savings');
  const bufferCats = state.categories.filter(c => c.group === 'buffer');

  needsCats.forEach(c => c.budget = Math.round(needs / needsCats.length));
  wantsCats.forEach(c => c.budget = Math.round(wants / wantsCats.length));
  savingsCats.forEach(c => c.budget = Math.round(savings / savingsCats.length));
  bufferCats.forEach(c => c.budget = Math.round(buffer / bufferCats.length));
}

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

function showQuote() {
  const quote = quotes[currentQuote];
  $('quoteText').textContent = quote.text;
  $('quoteAuthor').textContent = `— ${quote.author}`;
  currentQuote = (currentQuote + 1) % quotes.length;
}

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

// Init
loadData();
