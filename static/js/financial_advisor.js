// Financial Advisor Page JS

// --- Enhanced: Format Markdown and asterisks for professional display ---
function formatAdviceMarkdown(text) {
  if (!text) return '';
  let lines = text.split(/\n/).map(l => l.trim());
  let filtered = [];
  let stopWords = ['summary', 'note', 'advice', 'goal', 'other'];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (/^\*{1,}$/.test(l) || /^\*{2,}$/.test(l) || /^\*+\s*$/.test(l)) continue;
    if (/^\*\*[^*]+\*\*$/.test(l) && l.replace(/\*|\s/g, '').length < 20) continue;
    if (/^\*[^*]+\*$/.test(l) && l.replace(/\*|\s/g, '').length < 20) continue;
    if (stopWords.some(w => l.toLowerCase().includes(w))) {
      let next = lines.slice(i, i+10).filter(x => x.length > 0 && !/^\*+$/.test(x));
      let real = next.filter(x => x.replace(/\*|\s/g, '').length > 10);
      if (real.length < 3) break;
    }
    filtered.push(l);
  }
  let html = filtered.join('\n');
  html = html.replace(/\*{1,}/g, '');
  html = html.replace(/<strong>(.*?)<\/strong>/g, '$1');
  html = html.replace(/\b([A-Z][A-Za-z0-9 &()\-]+):/g, '<strong>$1:</strong>');
  html = html.replace(/^\s*[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mb-2">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-1">$1</h3>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, '<ul class="list-disc pl-6">$1</ul>');
  html = html.replace(/([^>])\n/g, '$1<br>');
  html = html.replace(/(<\/ul>|<\/table>)/g, '$1\n');
  html = html.replace(/^##+\s*/gm, '');
  html = html.replace(/(^|\s)\*\*([^*]+)\*\*(?=\s|$)/g, '$1$2');
  html = html.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, '$1$2');
  html = html.replace(/^(<div class='mb-4'>)?([A-Z][A-Z\s&]+):(<\/div>)?/gm, function(_, pre, title, post) {
    return (pre || '') + '<strong>' + title.trim() + ':</strong>' + (post || '');
  });
  html = html.replace(/(<\/ul>|<\/table>)/g, '$1\n');
  html = html.replace(/(<h2[^>]*>.*?<\/h2>|<h3[^>]*>.*?<\/h3>|<strong>[^<]+:<\/strong>)/g, '\n$1\n');
  html = html.split(/\n{2,}/).map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<ul') || block.startsWith('<table')) return block;
    if (/^<h[23][^>]*>.*<\/h[23]>$/.test(block)) return block;
    return `<div class='mb-4'>${block}</div>`;
  }).join('\n');
  html = html.replace(/^##+\s*/gm, '');
  html = html.replace(/(^|\s)\*\*([^*]+)\*\*(?=\s|$)/g, '$1$2');
  html = html.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, '$1$2');
  html = html.replace(/^(<div class='mb-4'>)?([A-Z][A-Z\s&]+):(<\/div>)?/gm, function(_, pre, title, post) {
    return (pre || '') + '<strong>' + title.trim() + ':</strong>' + (post || '');
  });
  html = html.replace(/(<\/ul>|<\/table>)/g, '$1\n');
  return html;
}

// --- Chat Functionality ---
async function sendChat(msg) {
  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const res = await fetch('/financial_advisor/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ user_id: window.USER_ID || '', message: msg })
    });
    if (!res.ok) {
      let errorMsg = 'An error occurred.';
      try {
        const errData = await res.json();
        errorMsg = errData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    const data = await res.json();
    return data.response;
  } catch (err) {
    return '[Error] ' + (err.message || 'Failed to contact assistant.');
  }
}

function appendMessage(who, text) {
  const box = document.getElementById('messages');
  const el = document.createElement('div');
  el.className = (who === 'You') ? 'text-right text-green-600' : 'text-left text-gray-100 bg-blue-900 p-4 rounded mb-2';
  if (who === 'Advisor') {
    el.innerHTML = formatAdviceMarkdown(text);
  } else {
    el.textContent = who + ': ' + text;
  }
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function initChat() {
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  if (!sendBtn || !input) return;
  sendBtn.onclick = async function() {
    const txt = input.value.trim();
    if (!txt) return;
    appendMessage('You', txt);
    input.value = '';
    sendBtn.disabled = true;
    const box = document.getElementById('messages');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'text-left text-gray-400';
    loadingEl.textContent = 'Advisor is typing...';
    box.appendChild(loadingEl);
    box.scrollTop = box.scrollHeight;
    const reply = await sendChat(txt);
    box.removeChild(loadingEl);
    appendMessage('Advisor', reply);
    sendBtn.disabled = false;
  };
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendBtn.click();
  });
}

// --- Upload Functionality ---
function initUpload() {
  const form = document.getElementById('upload-form');
  if (!form) return;
  form.onsubmit = async function(e) {
    e.preventDefault();
    const container = document.getElementById('upload-results');
    container.innerHTML = '<div class="text-blue-600">Analyzing your statement...</div>';
    const data = new FormData(form);
    try {
      const res = await fetch(form.action || '/financial_advisor/upload', { method: 'POST', body: data });
      const json = await res.json();
      container.innerHTML = '';
      if (json.error) {
        container.innerHTML = '<div class="text-red-600">' + json.error + '</div>';
        return;
      }
      if (json.success && json.pdf_url && json.analysis) {
        const container = document.getElementById('upload-results');
        container.innerHTML = `
          <div class="mt-8 p-4 rounded-xl bg-gray-900">
            <iframe src="${json.pdf_url}" width="100%" height="800px" style="border:none; background:#18181b;"></iframe>
            <div class="mt-2 text-right">
              <a href="${json.pdf_url}" download class="text-blue-400 underline">Download PDF</a>
            </div>
          </div>
        `;
        // Show analysis/advice below the PDF
        const analysisCard = document.createElement('div');
        analysisCard.className = 'mt-6 p-4 rounded-lg border border-cyan-400 bg-blue-900 text-cyan-100 shadow-lg';
        analysisCard.innerHTML = '<h3 class="font-semibold text-cyan-300 mb-2">AI Financial Analysis & Advice</h3>' +
          '<div style="white-space: normal;">' + formatAdviceMarkdown(json.analysis) + '</div>';
        container.appendChild(analysisCard);
        // --- Update overview tab with latest analysis ---
        const overviewDiv = document.getElementById('overview-advice-analysis');
        if (overviewDiv) {
          overviewDiv.innerHTML = `
            <div class="mt-8">
              <h2 class="text-lg font-bold mb-2 text-cyan-200">AI Financial Analysis & Advice</h2>
              <div class="p-4 border rounded bg-blue-900 text-cyan-100">${formatAdviceMarkdown(json.analysis)}</div>
            </div>
          `;
        }
        // --- Update overview graphs with new transactions ---
        if (json.transactions && Array.isArray(json.transactions) && json.transactions.length > 0) {
          updateOverviewCharts(json.transactions);
        }
        return;
      }
      // Fallback: if only PDF or only analysis
      if (json.success && json.pdf_url) {
        const container = document.getElementById('upload-results');
        container.innerHTML = `
          <div class="mt-8 p-4 rounded-xl bg-gray-900">
            <iframe src="${json.pdf_url}" width="100%" height="800px" style="border:none; background:#18181b;"></iframe>
            <div class="mt-2 text-right">
              <a href="${json.pdf_url}" download class="text-blue-400 underline">Download PDF</a>
            </div>
          </div>
        `;
        return;
      }
      if (json.success && json.analysis) {
        const container = document.getElementById('upload-results');
        const analysisCard = document.createElement('div');
        analysisCard.className = 'mt-6 p-4 rounded-lg border border-cyan-400 bg-blue-900 text-cyan-100 shadow-lg';
        analysisCard.innerHTML = '<h3 class="font-semibold text-cyan-300 mb-2">AI Financial Analysis & Advice</h3>' +
          '<div style="white-space: normal;">' + formatAdviceMarkdown(json.analysis) + '</div>';
        container.appendChild(analysisCard);
      }
      if (json.alerts) {
        json.alerts.forEach(function(a) {
          const div = document.createElement('div');
          div.className = 'text-red-600';
          div.textContent = a;
          container.appendChild(div);
        });
      }
      if (json.transactions) {
        // Simple table of txns
        const tbl = document.createElement('table');
        tbl.className = 'min-w-full text-left mt-2';
        tbl.innerHTML = '<thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>';
        const body = document.createElement('tbody');
        json.transactions.forEach(function(t) {
          const row = document.createElement('tr');
          row.innerHTML = '<td>' + t.date + '</td><td>' + t.description + '</td><td>R' + Number(t.amount).toFixed(2) + '</td>';
          body.appendChild(row);
        });
        tbl.appendChild(body);
        container.appendChild(tbl);
      }
      if (json.analysis) {
        if (json.statement_text) {
          const statementCard = document.createElement('div');
          statementCard.className = 'mt-8 p-6 rounded-xl shadow-lg border border-gray-800 bg-gray-900 text-gray-100 max-w-3xl mx-auto';
          // Display only the raw statement text as-is
          statementCard.innerHTML = `<pre style="white-space: pre-wrap; background: #18181b; color: #f3f4f6; padding: 1.5rem; border-radius: 1rem; font-size: 1rem;">${json.statement_text}</pre>`;
          container.appendChild(statementCard);
        }
        const analysisCard = document.createElement('div');
        analysisCard.className = 'mt-6 p-4 rounded-lg border border-cyan-400 bg-blue-900 text-cyan-100 shadow-lg';
        // Use the global formatAdviceMarkdown function
        analysisCard.innerHTML = '<h3 class="font-semibold text-cyan-300 mb-2">AI Financial Analysis & Advice</h3>' +
          '<div style="white-space: normal;">' + formatAdviceMarkdown(json.analysis) + '</div>';
        container.appendChild(analysisCard);
      }
    } catch (err) {
      container.innerHTML = '<div class="text-red-600">An error occurred. Please try again.</div>';
    }
  };
}

// --- Update Overview Charts Function ---
function updateOverviewCharts(transactions) {
  // Show the chart containers
  const chartDiv = document.getElementById('overview-charts');
  if (chartDiv) chartDiv.style.display = 'flex';

  // Use the new pieChart and barChart canvas elements
  const pieCanvas = document.getElementById('pieChart');
  const barCanvas = document.getElementById('barChart');
  if (!pieCanvas || !barCanvas) {
    alert('Chart elements not found. Please check your dashboard layout.');
    return;
  }
  if (typeof Chart === 'undefined') {
    alert('Chart.js library is not loaded.');
    return;
  }
  const pieCtx = pieCanvas.getContext('2d');
  const barCtx = barCanvas.getContext('2d');

  // Aggregate by category/description for pie
  const categoryTotals = {};
  transactions.forEach(txn => {
    const cat = (txn.Description || txn['Description'] || txn['Category'] || 'Other').trim();
    let amt = 0;
    if (txn['Debit (R)']) amt = parseFloat(txn['Debit (R)'].replace(/[^\d.-]/g, ''));
    else if (txn['Amount']) amt = parseFloat(txn['Amount'].replace(/[^\d.-]/g, ''));
    else if (txn['Debit']) amt = parseFloat(txn['Debit'].replace(/[^\d.-]/g, ''));
    else if (txn['Credit']) amt = -parseFloat(txn['Credit'].replace(/[^\d.-]/g, ''));
    if (!isNaN(amt) && amt > 0) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }
  });
  const pieLabels = Object.keys(categoryTotals);
  const pieData = Object.values(categoryTotals);

  // --- Bar Chart: Income vs Expenses by date ---
  const dateMap = {};
  transactions.forEach(txn => {
    const date = (txn.Date || txn['Date'] || '').trim();
    let income = 0, expense = 0;
    if (txn['Credit (R)']) income = parseFloat(txn['Credit (R)'].replace(/[^\d.-]/g, ''));
    else if (txn['Credit']) income = parseFloat(txn['Credit'].replace(/[^\d.-]/g, ''));
    if (txn['Debit (R)']) expense = parseFloat(txn['Debit (R)'].replace(/[^\d.-]/g, ''));
    else if (txn['Debit']) expense = parseFloat(txn['Debit'].replace(/[^\d.-]/g, ''));
    if (!date) return;
    if (!dateMap[date]) dateMap[date] = { income: 0, expense: 0 };
    if (!isNaN(income) && income > 0) dateMap[date].income += income;
    if (!isNaN(expense) && expense > 0) dateMap[date].expense += expense;
  });
  const barLabels = Object.keys(dateMap);
  const barIncome = barLabels.map(d => dateMap[d].income);
  const barExpense = barLabels.map(d => dateMap[d].expense);

  // Defensive: If no data, do not attempt to update/create charts
  if (!pieLabels.length || !pieData.length || !barLabels.length) {
    // Optionally, show a message in the chart area
    if (chartDiv) chartDiv.innerHTML = '<div style="color:#fff;padding:2em;">No chart data available for this statement.</div>';
    return;
  }

  // Update or create the pie chart
  if (window.pieChart) {
    window.pieChart.data.labels = pieLabels;
    window.pieChart.data.datasets[0].data = pieData;
    window.pieChart.update();
  } else {
    window.pieChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: pieLabels,
        datasets: [{ data: pieData, backgroundColor: pieLabels.map((_,i)=>`hsl(${i*40},70%,60%)`)}]
      },
      options: { responsive: true }
    });
  }
  // Update or create the bar chart
  if (window.barChart) {
    window.barChart.data.labels = barLabels;
    window.barChart.data.datasets[0].data = barIncome;
    window.barChart.data.datasets[1].data = barExpense;
    window.barChart.update();
  } else {
    window.barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: barLabels,
        datasets: [
          { label: 'Income', data: barIncome, backgroundColor: 'rgba(59,130,246,0.7)' },
          { label: 'Expenses', data: barExpense, backgroundColor: 'rgba(139,92,246,0.7)' }
        ]
      },
      options: { responsive: true, scales: { x: { stacked: false }, y: { beginAtZero: true } } }
    });
  }
}

function analyzeStatement(formData) {
  fetch('/financial_advisor/upload', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(response => {
    const txns = response.transactions || [];
    if (!txns.length) {
      document.getElementById('overview-charts').innerHTML = '<div style="color:#fff;padding:2em;">No chart data available for this statement.</div>';
      return;
    }
    renderOverviewCharts(txns);
  })
  .catch(err => {
    console.error('Analyze failed', err);
  });
}

function renderOverviewCharts(transactions) {
  // 1) Aggregate spending by category
  const byCategory = transactions.reduce((acc, { category, amount }) => {
    acc[category] = (acc[category] || 0) + Math.abs(amount);
    return acc;
  }, {});
  const pieLabels = Object.keys(byCategory);
  const pieData   = pieLabels.map(cat => byCategory[cat]);

  // 2) Aggregate spending by month (YYYY‑MM)
  const byMonth = transactions.reduce((acc, { date, amount }) => {
    const m = date.slice(0,7); // assumes ISO date
    acc[m] = (acc[m] || 0) + Math.abs(amount);
    return acc;
  }, {});
  const barLabels = Object.keys(byMonth).sort();
  const barData   = barLabels.map(m => byMonth[m]);

  // 3) Get contexts
  const pieCtx = document.getElementById('spendingPieChart').getContext('2d');
  const barCtx = document.getElementById('spendingBarChart').getContext('2d');

  // 4) Destroy old charts if present
  if (window._overviewPie)  window._overviewPie.destroy();
  if (window._overviewBar)  window._overviewBar.destroy();

  // 5) Draw Pie
  window._overviewPie = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: pieLabels,
      datasets: [{
        data: pieData,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // 6) Draw Bar
  window._overviewBar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'Total Spent',
        data: barData,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Month' } },
        y: { title: { display: true, text: 'Amount' } }
      }
    }
  });
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', function() {
  initChat();
  initUpload();
}); 