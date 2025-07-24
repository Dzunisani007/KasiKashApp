// Auto-close alerts after 3 seconds
setTimeout(function() {
    $('.alert').alert('close');
}, 3000);

// Function to safely parse JSON
function safeJSONParse(jsonString) {
    try {
        return jsonString === 'null' ? null : JSON.parse(jsonString);
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
    }
}

// Function to initialize charts
function initializeCharts(chartData) {
    // Initialize bar chart
    if (chartData.bar) {
        Plotly.plot('bar', chartData.bar, {});
    }

    // Initialize stack bar chart
    if (chartData.stack_bar) {
        Plotly.plot('stack', chartData.stack_bar, {});
    }

    // Initialize pie charts
    if (chartData.pie1) {
        Plotly.plot('pie11', chartData.pie1, {});
    }
    if (chartData.pie2) {
        Plotly.plot('pie22', chartData.pie2, {});
    }
    if (chartData.pie3) {
        Plotly.plot('pie33', chartData.pie3, {});
    }
    if (chartData.pie4) {
        Plotly.plot('pie44', chartData.pie4, {});
    }
}

// Function to parse chart data from JSON string
function parseChartData(dataString) {
    try {
        return JSON.parse(dataString);
    } catch (e) {
        console.error('Error parsing chart data:', e);
        return null;
    }
}

// --- Advisor Overview Charts (Chart.js) ---
let advisorPieChartInstance = null;
let advisorLineChartInstance = null;

function renderAdvisorCharts(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) return;
    // Aggregate by category
    const categoryTotals = {};
    const dateTotals = {};
    transactions.forEach(tx => {
        // Pie: by category
        const cat = tx.category || tx.Category || 'Other';
        const amt = Math.abs(Number(tx.amount || tx.Amount || 0));
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += amt;
        // Line: by date
        let date = tx.date || tx.Date;
        if (date && date.length >= 10) date = date.slice(0, 10); // YYYY-MM-DD or DD/MM/YYYY
        if (!dateTotals[date]) dateTotals[date] = 0;
        dateTotals[date] += amt;
    });
    // Pie chart data
    const pieLabels = Object.keys(categoryTotals);
    const pieData = Object.values(categoryTotals);
    // Line chart data
    const sortedDates = Object.keys(dateTotals).sort();
    const lineLabels = sortedDates;
    const lineData = sortedDates.map(d => dateTotals[d]);
    // Pie Chart
    const pieCtx = document.getElementById('advisor-pie-chart').getContext('2d');
    if (advisorPieChartInstance) advisorPieChartInstance.destroy();
    advisorPieChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieData,
                backgroundColor: [
                    '#60efff', '#38bdf8', '#7B61FF', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#facc15', '#818cf8'
                ],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#c0eaff',
                        font: { family: 'Inter, Montserrat, sans-serif', size: 16 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: R${value.toLocaleString()}`;
                        }
                    },
                    backgroundColor: '#222e3a',
                    titleColor: '#60efff',
                    bodyColor: '#fff',
                    borderColor: '#60efff',
                    borderWidth: 1,
                    padding: 12
                },
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
    // Line Chart
    const lineCtx = document.getElementById('advisor-bar-chart').getContext('2d');
    if (advisorLineChartInstance) advisorLineChartInstance.destroy();
    advisorLineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: lineLabels,
            datasets: [{
                label: 'Spending Over Time',
                data: lineData,
                borderColor: '#60efff',
                backgroundColor: 'rgba(96,239,255,0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#7B61FF',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#c0eaff',
                        font: { family: 'Inter, Montserrat, sans-serif', size: 16 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `R${context.parsed.y.toLocaleString()}`;
                        }
                    },
                    backgroundColor: '#222e3a',
                    titleColor: '#60efff',
                    bodyColor: '#fff',
                    borderColor: '#60efff',
                    borderWidth: 1,
                    padding: 12
                },
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#c0eaff',
                        font: { family: 'Inter, Montserrat, sans-serif', size: 14 },
                        callback: function(value) { return 'R' + value; }
                    },
                    grid: { color: 'rgba(96,239,255,0.08)' }
                },
                x: {
                    ticks: {
                        color: '#c0eaff',
                        font: { family: 'Inter, Montserrat, sans-serif', size: 14 }
                    },
                    grid: { color: 'rgba(96,239,255,0.04)' }
                }
            }
        }
    });
}

// --- Metrics Bar ---
function renderAdvisorMetrics(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) return;
    let totalIncome = 0, totalExpenses = 0, net = 0;
    const categoryTotals = {};
    transactions.forEach(tx => {
        const amt = Number(tx.amount || 0);
        if (amt > 0) totalIncome += amt;
        if (amt < 0) totalExpenses += Math.abs(amt);
        net += amt;
        const cat = tx.category || 'Other';
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += Math.abs(amt);
    });
    let largestCat = 'N/A', largestVal = 0;
    for (const [cat, val] of Object.entries(categoryTotals)) {
        if (val > largestVal) { largestCat = cat; largestVal = val; }
    }
    const bar = document.getElementById('advisor-metrics-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="metric-card bg-blue-900 text-cyan-200 rounded-lg p-4 min-w-[180px]">
        <div class="text-xs uppercase mb-1">Total Income</div>
        <div class="text-2xl font-bold">R${totalIncome.toLocaleString()}</div>
      </div>
      <div class="metric-card bg-blue-900 text-cyan-200 rounded-lg p-4 min-w-[180px]">
        <div class="text-xs uppercase mb-1">Total Expenses</div>
        <div class="text-2xl font-bold">R${totalExpenses.toLocaleString()}</div>
      </div>
      <div class="metric-card bg-blue-900 text-cyan-200 rounded-lg p-4 min-w-[180px]">
        <div class="text-xs uppercase mb-1">Net Savings</div>
        <div class="text-2xl font-bold">R${net.toLocaleString()}</div>
      </div>
      <div class="metric-card bg-blue-900 text-cyan-200 rounded-lg p-4 min-w-[180px]">
        <div class="text-xs uppercase mb-1">Largest Category</div>
        <div class="text-2xl font-bold">${largestCat}</div>
      </div>
    `;
}
// --- Recent Transactions ---
function renderAdvisorRecent(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) return;
    const recent = transactions.slice(-5).reverse();
    const container = document.getElementById('advisor-recent-activity');
    if (!container) return;
    container.innerHTML = `<h3 class="text-lg font-semibold text-cyan-200 mb-2">Recent Transactions</h3>
      <div class="space-y-2">
        ${recent.map(tx => `
          <div class="flex justify-between items-center bg-blue-950 bg-opacity-60 rounded p-2">
            <div>
              <div class="font-bold text-cyan-100">${tx.description}</div>
              <div class="text-xs text-cyan-400">${tx.date}</div>
            </div>
            <div class="text-right">
              <div class="font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}">
                ${tx.amount >= 0 ? '+' : '-'}R${Math.abs(tx.amount).toLocaleString()}
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
}

// Export for use in other scripts
window.renderAdvisorCharts = renderAdvisorCharts;
window.renderAdvisorMetrics = renderAdvisorMetrics;
window.renderAdvisorRecent = renderAdvisorRecent; 