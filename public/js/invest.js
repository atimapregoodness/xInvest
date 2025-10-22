
  document.addEventListener("DOMContentLoaded", function () {
    // Initialize variables
    let selectedPair = null;
    let selectedPlan = null;
    let currentPrice = 0;
    let walletBalance = <%= wallet?.totalBalance || 10000 %>;
    let activeInvestments = [];
    let userPlans = [];
    let priceUpdateInterval;
    let profitUpdateIntervals = {};
    let currentChart = null;

    // Load user's purchased plans
    function loadUserPlans() {
      // In a real app, this would come from your backend
      const savedPlans = localStorage.getItem('xinvest_user_plans');
      if (savedPlans) {
        userPlans = JSON.parse(savedPlans);
      }

      updatePlansDisplay();
      updatePlanSelect();
    }

    // Update plans display grid
    function updatePlansDisplay() {
      const plansGrid = document.getElementById('userPlansGrid');
      const noPlansMessage = document.getElementById('noPlansMessage');

      if (userPlans.length === 0) {
        noPlansMessage.style.display = 'block';
        plansGrid.innerHTML = '';
        plansGrid.appendChild(noPlansMessage);
      } else {
        noPlansMessage.style.display = 'none';
        plansGrid.innerHTML = '';

        userPlans.forEach(plan => {
          const planCard = createPlanCard(plan);
          plansGrid.appendChild(planCard);
        });
      }
    }

    // Create plan card element
    function createPlanCard(plan) {
      const card = document.createElement('div');
      card.className = `bot-card glass-card ${plan.status === 'active' ? '' : 'inactive'}`;
      card.dataset.planId = plan.id;

      let badgeIcon, tagClass;
      switch(plan.type) {
        case 'welbuilder':
          badgeIcon = 'fas fa-bolt';
          tagClass = 'tag-welbuilder';
          break;
        case 'premium':
          badgeIcon = 'fas fa-chart-line';
          tagClass = 'tag-premium';
          break;
        case 'elite':
          badgeIcon = 'fas fa-infinity';
          tagClass = 'tag-elite';
          break;
      }

      card.innerHTML = `
        <div class="bot-header">
          <div class="bot-info">
            <span class="bot-tag ${tagClass}">${plan.name}</span>
            <h3>${plan.strategy}</h3>
            <p class="bot-description">${plan.description}</p>
            <div class="profit-range">Profit Range: ${plan.profitMin}% - ${plan.profitMax}%</div>
            <div class="plan-status ${plan.status === 'active' ? 'status-active' : 'status-inactive'}">
              ${plan.status === 'active' ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div class="bot-badge">
            <i class="${badgeIcon}"></i>
          </div>
        </div>
        <div class="bot-stats">
          <div class="stat-item">
            <div class="stat-value">${plan.avgReturn}%</div>
            <div class="stat-label">Avg. Return</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${plan.periodMin}-${plan.periodMax}</div>
            <div class="stat-label">Days</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${plan.winRate}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
        </div>
        <div class="bot-features">
          ${plan.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
        </div>
      `;

      if (plan.status === 'active') {
        card.addEventListener('click', () => selectPlan(plan));
      }

      return card;
    }

    // Update plan select dropdown
    function updatePlanSelect() {
      const planSelect = document.getElementById('planSelect');
      const planHint = document.getElementById('planHint');

      planSelect.innerHTML = '<option value="">Select a plan</option>';

      if (userPlans.length === 0) {
        planSelect.disabled = true;
        planHint.style.display = 'block';
      } else {
        planSelect.disabled = false;
        planHint.style.display = 'none';

        userPlans.filter(plan => plan.status === 'active').forEach(plan => {
          const option = document.createElement('option');
          option.value = plan.id;
          option.textContent = `${plan.name} (${plan.profitMin}%-${plan.profitMax}%)`;
          planSelect.appendChild(option);
        });
      }

      updateFormState();
    }

    // Select a plan
    function selectPlan(plan) {
      // Remove selected class from all cards
      document.querySelectorAll('.bot-card').forEach(card => card.classList.remove('selected'));
      // Add selected class to clicked card
      document.querySelector(`.bot-card[data-plan-id="${plan.id}"]`).classList.add('selected');

      selectedPlan = plan;

      // Update select dropdown
      document.getElementById('planSelect').value = plan.id;

      // Update investment period options
      updateInvestmentPeriods(plan);

      // Update estimated returns
      updateEstimatedReturns();

      // Enable form inputs
      updateFormState();

      // Update start button
      updateStartButton();
    }

    // Update form state based on selections
    function updateFormState() {
      const hasActivePlans = userPlans.some(plan => plan.status === 'active');
      const formInputs = document.querySelectorAll('#investmentForm input, #investmentForm select');

      if (hasActivePlans && selectedPlan) {
        formInputs.forEach(input => {
          if (input.id !== 'selectedPair') {
            input.disabled = false;
          }
        });
      } else {
        formInputs.forEach(input => {
          if (input.id !== 'selectedPair') {
            input.disabled = true;
          }
        });
      }
    }

    // Market Tab Switching
    const marketTabs = document.querySelectorAll(".market-tab");
    const forexPairs = document.getElementById("forexPairs");
    const cryptoPairs = document.getElementById("cryptoPairs");

    marketTabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        // Remove active class from all tabs
        marketTabs.forEach((t) => t.classList.remove("active"));
        // Add active class to clicked tab
        this.classList.add("active");

        const market = this.dataset.market;

        // Show/hide appropriate pairs
        if (market === "forex") {
          forexPairs.style.display = "grid";
          cryptoPairs.style.display = "none";
        } else if (market === "crypto") {
          forexPairs.style.display = "none";
          cryptoPairs.style.display = "grid";
        } else if (market === "indices") {
          forexPairs.style.display = "none";
          cryptoPairs.style.display = "none";
          // In a real app, you would show indices pairs here
        }
      });
    });

    // Pair Selection
    const pairCards = document.querySelectorAll(".pair-card");
    pairCards.forEach((card) => {
      card.addEventListener("click", function () {
        // Remove selected class from all cards
        pairCards.forEach((c) => c.classList.remove("selected"));
        // Add selected class to clicked card
        this.classList.add("selected");

        selectedPair = {
          symbol: this.dataset.symbol,
          type: this.dataset.type,
          name: this.querySelector(".pair-symbol").textContent,
          price: parseFloat(
            this.querySelector(".pair-price").textContent.replace(/[$,]/g, "")
          ),
        };

        // Update form
        document.getElementById("selectedPair").value = selectedPair.symbol;

        // Show live ticker
        document.getElementById("liveTicker").classList.add("active");
        document.getElementById("selectedPairDisplay").textContent =
          selectedPair.symbol;

        // Update TradingView chart
        updateTradingViewChart(selectedPair.symbol);

        // Start live price updates
        startLivePriceUpdates(selectedPair.symbol);

        // Enable start button if plan is selected
        updateStartButton();
      });
    });

    // Plan select dropdown change
    document.getElementById('planSelect').addEventListener('change', function() {
      const planId = this.value;
      if (planId) {
        const plan = userPlans.find(p => p.id === planId);
        if (plan) {
          selectPlan(plan);
        }
      } else {
        // Deselect all plan cards if no option selected
        document.querySelectorAll('.bot-card').forEach(card => card.classList.remove('selected'));
        selectedPlan = null;
        updateStartButton();
        updateFormState();
      }
    });

    // Amount slider synchronization
    const amountInput = document.getElementById("investmentAmount");
    const amountSlider = document.getElementById("amountSlider");

    amountInput.addEventListener("input", function () {
      amountSlider.value = this.value;
      updateEstimatedReturns();
    });

    amountSlider.addEventListener("input", function () {
      amountInput.value = this.value;
      updateEstimatedReturns();
    });

    // Update investment periods based on plan selection
    function updateInvestmentPeriods(plan) {
      const periodSelect = document.getElementById("investmentPeriod");
      periodSelect.innerHTML = '<option value="">Select period</option>';

      for (let i = plan.periodMin; i <= plan.periodMax; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = `${i} days`;
        periodSelect.appendChild(option);
      }
    }

    // Update estimated returns
    function updateEstimatedReturns() {
      if (!selectedPlan || !amountInput.value) return;

      const amount = parseFloat(amountInput.value);
      const platformFee = amount * 0.02; // 2% platform fee
      const profitMin = (amount * selectedPlan.profitMin) / 100;
      const profitMax = (amount * selectedPlan.profitMax) / 100;

      document.getElementById(
        "estimatedProfitRange"
      ).textContent = `${selectedPlan.profitMin}% - ${selectedPlan.profitMax}%`;
      document.getElementById(
        "platformFee"
      ).textContent = `$${platformFee.toFixed(2)}`;
      document.getElementById("potentialReturn").textContent = `$${(
        amount + profitMax - platformFee
      ).toFixed(2)}`;
    }

    // Update start button state
    function updateStartButton() {
      const startBtn = document.getElementById("startInvestBtn");
      const submitBtn = document.getElementById("submitBtn");
      const isReady = selectedPair && selectedPlan;

      startBtn.disabled = !isReady;
      submitBtn.disabled = !isReady;
    }

    // Update TradingView chart - FIXED VERSION
    function updateTradingViewChart(symbol) {
      const chartContainer = document.getElementById("tradingview-chart");

      // Clear previous chart
      chartContainer.innerHTML = "";

      // Create canvas for Chart.js
      const canvas = document.createElement("canvas");
      chartContainer.appendChild(canvas);

      // Destroy previous chart if exists
      if (currentChart) {
        currentChart.destroy();
      }

      // Generate realistic price data based on symbol type
      const data = [];
      const isForex = selectedPair.type === "forex";
      let baseValue = isForex ? selectedPair.price :
                     symbol.includes('BTC') ? 42189 :
                     symbol.includes('ETH') ? 2534 :
                     symbol.includes('XRP') ? 0.62 : 98.76;

      let currentValue = baseValue;
      for (let i = 0; i < 100; i++) {
        // More realistic price movement
        const volatility = isForex ? 0.0002 : 0.02;
        const change = (Math.random() - 0.5) * volatility * currentValue;
        currentValue += change;
        data.push(currentValue);
      }

      // Create chart with improved styling
      const ctx = canvas.getContext("2d");
      currentChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: Array.from({ length: 100 }, (_, i) => ""),
          datasets: [
            {
              label: symbol,
              data: data,
              borderColor: "#6366f1",
              backgroundColor: "rgba(99, 102, 241, 0.1)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              titleColor: "#f8fafc",
              bodyColor: "#cbd5e1",
              borderColor: "rgba(99, 102, 241, 0.3)",
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  const value = context.parsed.y;
                  return isForex ? value.toFixed(5) : `$${value.toLocaleString()}`;
                }
              }
            },
          },
          scales: {
            x: {
              display: false,
            },
            y: {
              display: false,
            },
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
          elements: {
            line: {
              tension: 0.4,
            },
          },
        },
      });
    }

    // Start live price updates
    function startLivePriceUpdates(symbol) {
      // Clear previous interval
      if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
      }

      // Simulate live price updates
      priceUpdateInterval = setInterval(() => {
        if (selectedPair) {
          // Simulate price movement
          const change = (Math.random() - 0.5) * 0.1;
          currentPrice = selectedPair.price * (1 + change / 100);
          const changePercent = change.toFixed(2);

          // Update display
          document.getElementById("currentPrice").textContent =
            selectedPair.type === "forex"
              ? currentPrice.toFixed(5)
              : `$${currentPrice.toLocaleString()}`;
          document.getElementById("changePercent").textContent = `${
            changePercent >= 0 ? "+" : ""
          }${changePercent}%`;

          // Update change color
          const changeElement = document.getElementById("priceChange");
          changeElement.className = `price-change ${
            change >= 0 ? "change-up" : "change-down"
          }`;
        }
      }, 2000);
    }

    // Start investment
    function startInvestment() {
      if (!selectedPair || !selectedPlan) return;

      const amount = parseFloat(
        document.getElementById("investmentAmount").value
      );
      const period = parseInt(
        document.getElementById("investmentPeriod").value
      );
      const riskLevel = document.getElementById("riskLevel").value;

      if (amount > walletBalance) {
        showNotification(
          "Insufficient balance! Please reduce your investment amount.",
          "error"
        );
        return;
      }

      if (!period) {
        showNotification("Please select an investment period.", "error");
        return;
      }

      // Create investment object
      const investment = {
        id: "INV_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        pair: selectedPair.symbol,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: amount,
        period: period,
        riskLevel: riskLevel,
        startTime: new Date(),
        endTime: new Date(Date.now() + period * 24 * 60 * 60 * 1000),
        currentProfit: 0,
        profitHistory: [],
        status: "active",
      };

      // Add to active investments
      activeInvestments.push(investment);

      // Update wallet balance
      walletBalance -= amount;
      document.getElementById(
        "availableBalance"
      ).textContent = `$${walletBalance.toLocaleString()}`;

      // Show active investments section
      document.getElementById("activeInvestmentsSection").style.display =
        "block";

      // Update active investments list
      updateActiveInvestmentsList();

      // Start profit simulation
      startProfitSimulation(investment.id);

      // Show success message
      showNotification(
        "Investment started successfully! Tracking real-time profits...",
        "success"
      );

      // Reset form
      resetForm();
    }

    // Update active investments list
    function updateActiveInvestmentsList() {
      const container = document.getElementById("activeInvestmentsList");
      container.innerHTML = "";

      activeInvestments.forEach((investment) => {
        const investmentCard = document.createElement("div");
        investmentCard.className = "investment-card glass-card";
        investmentCard.innerHTML = `
          <div class="investment-header">
            <div class="investment-pair">${investment.pair}</div>
            <div class="investment-bot ${
              investment.planName.includes('WelBuilder') ? 'tag-welbuilder' :
              investment.planName.includes('Premium') ? 'tag-premium' : 'tag-elite'
            }">
              ${investment.planName}
            </div>
          </div>

          <div class="investment-details">
            <div class="detail-item">
              <div class="detail-value">$${investment.amount.toLocaleString()}</div>
              <div class="detail-label">Investment</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">${investment.period}</div>
              <div class="detail-label">Days</div>
            </div>
            <div class="detail-item">
              <div class="detail-value">${investment.riskLevel}</div>
              <div class="detail-label">Risk</div>
            </div>
            <div class="detail-item">
              <div class="detail-value" id="timeLeft_${investment.id}">${investment.period}d</div>
              <div class="detail-label">Remaining</div>
            </div>
          </div>

          <div class="profit-display">
            <div class="current-profit" id="currentProfit_${investment.id}">+0.00%</div>
            <div class="profit-change" id="profitValue_${investment.id}">$0.00</div>
          </div>
        `;

        container.appendChild(investmentCard);
      });
    }

    // Start profit simulation for an investment
    function startProfitSimulation(investmentId) {
      const investment = activeInvestments.find(
        (inv) => inv.id === investmentId
      );
      if (!investment) return;

      // Get profit range based on plan type
      let minProfit, maxProfit;
      const plan = userPlans.find(p => p.id === investment.planId);
      if (plan) {
        minProfit = plan.profitMin;
        maxProfit = plan.profitMax;
      } else {
        // Fallback values
        minProfit = 150;
        maxProfit = 200;
      }

      // Start profit updates
      profitUpdateIntervals[investmentId] = setInterval(() => {
        const investmentIndex = activeInvestments.findIndex(
          (inv) => inv.id === investmentId
        );
        if (investmentIndex === -1) {
          clearInterval(profitUpdateIntervals[investmentId]);
          delete profitUpdateIntervals[investmentId];
          return;
        }

        const currentInvestment = activeInvestments[investmentIndex];
        const progress =
          (Date.now() - currentInvestment.startTime.getTime()) /
          (currentInvestment.endTime.getTime() -
            currentInvestment.startTime.getTime());

        if (progress >= 1) {
          // Investment completed
          clearInterval(profitUpdateIntervals[investmentId]);
          delete profitUpdateIntervals[investmentId];
          currentInvestment.status = "completed";
          showNotification(
            `Investment ${investmentId} completed! Final profit: ${currentInvestment.currentProfit.toFixed(
              2
            )}%`,
            "success"
          );
          return;
        }

        // Calculate current profit (random within range, increasing with progress)
        const targetProfit =
          minProfit + Math.random() * (maxProfit - minProfit);
        const currentProfit = targetProfit * progress;

        // Add some random fluctuation
        const fluctuation = (Math.random() - 0.5) * 20;
        const finalProfit = Math.max(0, currentProfit + fluctuation);

        // Update investment
        currentInvestment.currentProfit = finalProfit;
        currentInvestment.profitHistory.push({
          time: new Date(),
          profit: finalProfit,
        }); 

        // Update display
        const profitElement = document.getElementById(
          `currentProfit_${investmentId}`
        );
        const profitValueElement = document.getElementById(
          `profitValue_${investmentId}`
        );
        const timeLeftElement = document.getElementById(
          `timeLeft_${investmentId}`
        );

        if (profitElement) {
          profitElement.textContent = `+${finalProfit.toFixed(2)}%`;
          profitElement.style.color =
            finalProfit >= 0 ? "var(--success)" : "var(--danger)";
        }

        if (profitValueElement) {
          const profitValue = (currentInvestment.amount * finalProfit) / 100;
          profitValueElement.textContent = `$${profitValue.toFixed(2)}`;
          profitValueElement.style.color =
            finalProfit >= 0 ? "var(--success)" : "var(--danger)";
        }

        if (timeLeftElement) {
          const daysLeft = Math.ceil(
            (currentInvestment.endTime.getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          );
          timeLeftElement.textContent = `${daysLeft}d`;
        }
      }, 3000); // Update every 3 seconds
    }

    // Show notification
    function showNotification(message, type = "info") {
      // Create notification element
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${
          type === "success"
            ? "rgba(16, 185, 129, 0.9)"
            : type === "error"
            ? "rgba(239, 68, 68, 0.9)"
            : "rgba(15, 23, 42, 0.95)"
        };
        backdrop-filter: blur(20px);
        border: 1px solid ${
          type === "success"
            ? "rgba(16, 185, 129, 0.3)"
            : type === "error"
            ? "rgba(239, 68, 68, 0.3)"
            : "var(--glass-border)"
        };
        border-left: 4px solid ${
          type === "success"
            ? "var(--success)"
            : type === "error"
            ? "var(--danger)"
            : "var(--accent)"
        };
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
        font-size: 0.9rem;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);

      // Add animation styles if not already present
      if (!document.querySelector("#notification-styles")) {
        const style = document.createElement("style");
        style.id = "notification-styles";
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      // Remove notification after 5 seconds
      setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 5000);
    }

    // Reset form after investment
    function resetForm() {
      document.getElementById("investmentForm").reset();
      document.getElementById("amountSlider").value = 1000;

      // Deselect all cards
      pairCards.forEach((card) => card.classList.remove("selected"));
      document.querySelectorAll('.bot-card').forEach(card => card.classList.remove("selected"));

      // Reset variables
      selectedPair = null;
      selectedPlan = null;

      // Hide live ticker
      document.getElementById("liveTicker").classList.remove("active");

      // Reset chart
      const chartContainer = document.getElementById("tradingview-chart");
      chartContainer.innerHTML =
        '<div class="chart-placeholder"><i class="fas fa-chart-line"></i><p>Select a trading pair to view live chart</p></div>';

      // Clear price update interval
      if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
      }

      // Update buttons and form state
      updateStartButton();
      updateFormState();
    }

    // Form submission
    document
      .getElementById("investmentForm")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        startInvestment();
      });

    // Start investment button
    document
      .getElementById("startInvestBtn")
      .addEventListener("click", function () {
        startInvestment();
      });

    // Load active investments from localStorage
    function loadActiveInvestments() {
      const savedInvestments = localStorage.getItem(
        "xinvest_active_investments"
      );
      if (savedInvestments) {
        activeInvestments = JSON.parse(savedInvestments);

        // Filter only active investments
        activeInvestments = activeInvestments.filter(
          (inv) => inv.status === "active"
        );

        if (activeInvestments.length > 0) {
          document.getElementById("activeInvestmentsSection").style.display =
            "block";
          updateActiveInvestmentsList();

          // Start profit simulation for each active investment
          activeInvestments.forEach((investment) => {
            if (investment.status === "active") {
              startProfitSimulation(investment.id);
            }
          });
        }
      }
    }

    // Save active investments to localStorage
    function saveActiveInvestments() {
      localStorage.setItem(
        "xinvest_active_investments",
        JSON.stringify(activeInvestments)
      );
    }

    // Initialize
    loadUserPlans();
    loadActiveInvestments();

    // Save investments periodically
    setInterval(saveActiveInvestments, 5000);
  });
