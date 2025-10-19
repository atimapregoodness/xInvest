async function loadPlans(){
  const res = await fetch('/invest/plans');
  const plans = await res.json();
  const grid = document.getElementById('plans-grid');
  grid.innerHTML = plans.map(p => `
    <div class="col-md-4">
      <div class="plan-card p-4 glass-card h-100">
        <div class="d-flex justify-content-between align-items-start">
          <h5>${p.title}</h5>
          <div class="text-accent fw-bold">${p.apy}% APY</div>
        </div>
        <p class="text-muted mt-2">${p.description || ''}</p>
        <ul class="list-unstyled text-muted">
          <li>Min: $${p.minAmount}</li>
          <li>Duration: ${p.durationDays} days</li>
          <li>Payout: ${p.payoutInterval}</li>
        </ul>
        <div class="mt-3">
          <button class="btn btn-outline-accent w-100" onclick="openInvestModal('${p._id}', '${p.title}', ${p.minAmount})">Invest</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openInvestModal(id, title, minAmount){
  document.getElementById('modal-plan-id').value = id;
  document.getElementById('modal-plan-title').textContent = title;
  document.getElementById('min-amount-hint').textContent = `Minimum ${minAmount} USDT`;
  const investModal = new bootstrap.Modal(document.getElementById('investModal'));
  investModal.show();
}

document.getElementById('invest-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const planId = document.getElementById('modal-plan-id').value;
  const amount = document.getElementById('modal-amount').value;
  const res = await fetch('/invest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content },
    body: JSON.stringify({ planId, amount })
  });
  const data = await res.json();
  if (data.success) {
    bootstrap.Modal.getInstance(document.getElementById('investModal')).hide();
    // show success and refresh dashboard etc
    alert('Investment created — ID: ' + data.investmentId);
  } else {
    alert(data.error || 'Failed');
  }
});

// initialize
loadPlans();
