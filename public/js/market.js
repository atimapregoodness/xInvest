// Market Page Functionality
class MarketPage {
    constructor() {
        this.currentSymbol = 'BTCUSDT';
        this.favorites = JSON.parse(localStorage.getItem('marketFavorites')) || [];
        this.marketData = {};
        this.chart = null;
        this.currentInterval = '15m';
    }

    // Initialize the market page
    initialize() {
        this.setupEventListeners();
        this.loadInitialData();
        this.updateFavoritesDisplay();
    }

    // Setup event listeners
    setupEventListeners() {
        // Market search
        document.getElementById('marketSearch').addEventListener('input', (e) => {
            this.filterMarkets(e.target.value);
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterMarketsByType(e.target.dataset.filter);
            });
        });

        // Favorites toggle
        document.getElementById('onlyFavorites').addEventListener('change', (e) => {
            this.toggleFavoritesOnly(e.target.checked);
        });

        // Chart intervals
        document.querySelectorAll('input[name="chartInterval"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.currentInterval = e.target.id.replace('interval', '');
                    this.updateChartData();
                }
            });
        });

        // Trading forms
        document.getElementById('buyForm')?.addEventListener('submit', this.handleBuyOrder.bind(this));
        document.getElementById('sellForm')?.addEventListener('submit', this.handleSellOrder.bind(this));
        document.getElementById('convertForm')?.addEventListener('submit', this.handleConvert.bind(this));

        // Price/amount calculations
        document.getElementById('buyPrice')?.addEventListener('input', this.calculateBuyTotal.bind(this));
        document.getElementById('buyAmount')?.addEventListener('input', this.calculateBuyTotal.bind(this));
        document.getElementById('sellPrice')?.addEventListener('input', this.calculateSellTotal.bind(this));
        document.getElementById('sellAmount')?.addEventListener('input', this.calculateSellTotal.bind(this));
    }

    // Load initial market data
    async loadInitialData() {
        try {
            // Simulate API call - replace with real API in production
            const response = await fetch('/api/v1/markets');
            const data = await response.json();
            
            this.marketData = data;
            this.renderMarketTable(data.markets);
            this.updateMarketStats(data.stats);
            this.initializeOrderBook(data.orderBook);
            this.initializeRecentTrades(data.recentTrades);
            
        } catch (error) {
            console.error('Error loading market data:', error);
            this.showError('Failed to load market data');
        }
    }

    // Render market table
    renderMarketTable(markets) {
        const table = document.getElementById('marketTable');
        if (!table) return;

        table.innerHTML = markets.map(market => `
            <tr class="market-row ${this.favorites.includes(market.symbol) ? 'favorite' : ''}" 
                data-symbol="${market.symbol}" data-type="${market.type}">
                <td class="ps-3">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm p-0 me-2 favorite-star" data-symbol="${market.symbol}">
                            <i class="${this.favorites.includes(market.symbol) ? 'fas' : 'far'} fa-star text-warning"></i>
                        </button>
                        <div>
                            <div class="fw-bold">${market.symbol.replace('USDT', '')}/USDT</div>
                            <small class="text-muted">${market.name}</small>
                        </div>
                    </div>
                </td>
                <td class="text-end fw-bold">$${market.price.toLocaleString()}</td>
                <td class="text-end pe-3">
                    <span class="badge ${market.change >= 0 ? 'bg-success' : 'bg-danger'}">
                        ${market.change >= 0 ? '+' : ''}${market.change}%
                    </span>
                </td>
            </tr>
        `).join('');

        // Add click handlers for market rows
        table.querySelectorAll('.market-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-star')) {
                    this.selectMarket(row.dataset.symbol);
                }
            });
        });

        // Add click handlers for favorite stars
        table.querySelectorAll('.favorite-star').forEach(star => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(star.dataset.symbol);
            });
        });

        document.getElementById('marketCount').textContent = `${markets.length} markets`;
    }

    // Select a market
    selectMarket(symbol) {
        this.currentSymbol = symbol;
        
        // Update UI
        document.querySelectorAll('.market-row').forEach(row => {
            row.classList.remove('table-active');
        });
        document.querySelector(`[data-symbol="${symbol}"]`)?.classList.add('table-active');

        // Update selected symbol display
        const market = this.marketData.markets.find(m => m.symbol === symbol);
        if (market) {
            document.getElementById('selectedSymbol').textContent = `${symbol.replace('USDT', '')}/USDT`;
            document.getElementById('selectedSymbolName').textContent = market.name;
            document.getElementById('currentPrice').textContent = `$${market.price.toLocaleString()}`;
            document.getElementById('priceChange').textContent = `${market.change >= 0 ? '+' : ''}${market.change}%`;
            document.getElementById('priceChange').className = `change ${market.change >= 0 ? 'positive' : 'negative'}`;
            
            // Update favorite button
            const favoriteBtn = document.getElementById('favoriteBtn');
            favoriteBtn.innerHTML = this.favorites.includes(symbol) ? 
                '<i class="fas fa-star text-warning"></i>' : 
                '<i class="far fa-star"></i>';
        }

        // Update chart
        this.updateChartData();
        
        // Update order book and recent trades
        this.updateOrderBook(symbol);
        this.updateRecentTrades(symbol);
    }

    // Toggle favorite
    toggleFavorite(symbol) {
        const index = this.favorites.indexOf(symbol);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(symbol);
        }
        
        localStorage.setItem('marketFavorites', JSON.stringify(this.favorites));
        this.updateFavoritesDisplay();
        this.renderMarketTable(this.marketData.markets);
    }

    // Update favorites display
    updateFavoritesDisplay() {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn && this.currentSymbol) {
            favoriteBtn.innerHTML = this.favorites.includes(this.currentSymbol) ? 
                '<i class="fas fa-star text-warning"></i>' : 
                '<i class="far fa-star"></i>';
        }
    }

    // Filter markets by search term
    filterMarkets(searchTerm) {
        const rows = document.querySelectorAll('.market-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const symbol = row.dataset.symbol.toLowerCase();
            const name = row.querySelector('small').textContent.toLowerCase();
            const isVisible = symbol.includes(term) || name.includes(term);
            row.style.display = isVisible ? '' : 'none';
        });
    }

    // Filter markets by type
    filterMarketsByType(type) {
        const rows = document.querySelectorAll('.market-row');
        
        rows.forEach(row => {
            const isVisible = type === 'all' || row.dataset.type === type || 
                            (type === 'favorites' && this.favorites.includes(row.dataset.symbol));
            row.style.display = isVisible ? '' : 'none';
        });
    }

    // Toggle favorites only
    toggleFavoritesOnly(showOnly) {
        const rows = document.querySelectorAll('.market-row');
        
        rows.forEach(row => {
            const isFavorite = this.favorites.includes(row.dataset.symbol);
            row.style.display = showOnly && !isFavorite ? 'none' : '';
        });
    }

    // Initialize trading chart
    initializeTradingChart() {
        const ctx = document.getElementById('tradingChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: 'BTC/USDT',
                    data: this.generateSampleChartData(),
                    color: {
                        up: '#00d395',
                        down: '#e53e3e',
                        unchanged: '#999'
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });

        // Hide loading overlay
        setTimeout(() => {
            document.querySelector('.chart-overlay')?.style.display = 'none';
        }, 1000);
    }

    // Generate sample chart data
    generateSampleChartData() {
        const data = [];
        let price = 34500;
        const now = new Date();

        for (let i = 100; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15min intervals
            
            const open = price;
            const change = (Math.random() - 0.5) * 200;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * 100;
            const low = Math.min(open, close) - Math.random() * 100;

            data.push({
                x: time,
                o: open,
                h: high,
                l: low,
                c: close
            });

            price = close;
        }

        return data;
    }

    // Update chart data
    updateChartData() {
        if (this.chart) {
            // In production, fetch real historical data based on interval
            const newData = this.generateSampleChartData();
            this.chart.data.datasets[0].data = newData;
            this.chart.update('none');
        }
    }

    // Initialize order book
    initializeOrderBook(orderBook) {
        this.renderOrderBook(orderBook);
    }

    // Render order book
    renderOrderBook(orderBook) {
        const asksContainer = document.getElementById('orderBookAsks');
        const bidsContainer = document.getElementById('orderBookBids');

        if (asksContainer && bidsContainer && orderBook) {
            // Render asks (sell orders)
            asksContainer.innerHTML = orderBook.asks.slice(0, 10).map(ask => `
                <div class="order-book-entry ask">
                    <span class="text-danger">${ask.price.toLocaleString()}</span>
                    <span>${ask.amount.toFixed(4)}</span>
                    <span>${(ask.price * ask.amount).toLocaleString()}</span>
                </div>
            `).join('');

            // Render bids (buy orders)
            bidsContainer.innerHTML = orderBook.bids.slice(0, 10).map(bid => `
                <div class="order-book-entry bid">
                    <span class="text-success">${bid.price.toLocaleString()}</span>
                    <span>${bid.amount.toFixed(4)}</span>
                    <span>${(bid.price * bid.amount).toLocaleString()}</span>
                </div>
            `).join('');

            // Calculate and display spread
            if (orderBook.asks.length > 0 && orderBook.bids.length > 0) {
                const bestAsk = orderBook.asks[0].price;
                const bestBid = orderBook.bids[0].price;
                const spread = bestAsk - bestBid;
                document.getElementById('spreadValue').textContent = `$${spread.toFixed(2)}`;
            }
        }
    }

    // Update order book for symbol
    updateOrderBook(symbol) {
        // In production, fetch real order book data for the symbol
        const sampleOrderBook = {
            asks: [
                { price: 34568.90, amount: 0.1254 },
                { price: 34569.50, amount: 0.0897 },
                { price: 34570.25, amount: 0.2043 },
                // ... more asks
            ],
            bids: [
                { price: 34567.50, amount: 0.1876 },
                { price: 34566.75, amount: 0.0954 },
                { price: 34565.25, amount: 0.1567 },
                // ... more bids
            ]
        };

        this.renderOrderBook(sampleOrderBook);
    }

    // Initialize recent trades
    initializeRecentTrades(trades) {
        this.renderRecentTrades(trades);
    }

    // Render recent trades
    renderRecentTrades(trades) {
        const container = document.getElementById('recentTrades');
        if (!container) return;

        container.innerHTML = trades.map(trade => `
            <div class="trade-entry ${trade.side.toLowerCase()}">
                <span class="${trade.side.toLowerCase() === 'buy' ? 'text-success' : 'text-danger'}">
                    ${trade.price.toLocaleString()}
                </span>
                <span>${trade.amount.toFixed(4)}</span>
                <span class="text-muted">${this.formatTime(trade.timestamp)}</span>
            </div>
        `).join('');
    }

    // Update recent trades for symbol
    updateRecentTrades(symbol) {
        // In production, fetch real trade data for the symbol
        const sampleTrades = [
            { price: 34567.89, amount: 0.00234, side: 'BUY', timestamp: new Date() },
            { price: 34567.45, amount: 0.00189, side: 'SELL', timestamp: new Date(Date.now() - 60000) },
            { price: 34568.12, amount: 0.00567, side: 'BUY', timestamp: new Date(Date.now() - 120000) },
            // ... more trades
        ];

        this.renderRecentTrades(sampleTrades);
    }

    // Format time for display
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Calculate buy total
    calculateBuyTotal() {
        const price = parseFloat(document.getElementById('buyPrice').value) || 0;
        const amount = parseFloat(document.getElementById('buyAmount').value) || 0;
        const total = price * amount;
        document.getElementById('buyTotal').value = total.toFixed(2);
    }

    // Calculate sell total
    calculateSellTotal() {
        const price = parseFloat(document.getElementById('sellPrice').value) || 0;
        const amount = parseFloat(document.getElementById('sellAmount').value) || 0;
        const total = price * amount;
        document.getElementById('sellTotal').value = total.toFixed(2);
    }

    // Handle buy order
    handleBuyOrder(e) {
        e.preventDefault();
        // In production, submit buy order to exchange API
        this.showNotification('Buy order placed successfully!', 'success');
    }

    // Handle sell order
    handleSellOrder(e) {
        e.preventDefault();
        // In production, submit sell order to exchange API
        this.showNotification('Sell order placed successfully!', 'success');
    }

    // Handle convert
    handleConvert(e) {
        e.preventDefault();
        // In production, handle currency conversion
        this.showNotification('Conversion completed!', 'success');
    }

    // Update market prices from real-time data
    updateMarketPrices(prices) {
        // Update main display
        if (prices.BTC) {
            document.getElementById('currentPrice').textContent = `$${parseFloat(prices.BTC.price).toLocaleString()}`;
            document.getElementById('priceChange').textContent = `${prices.BTC.change >= 0 ? '+' : ''}${prices.BTC.change}%`;
            document.getElementById('priceChange').className = `change ${prices.BTC.change >= 0 ? 'positive' : 'negative'}`;
        }

        // Update market table
        Object.keys(prices).forEach(symbol => {
            const row = document.querySelector(`[data-symbol="${symbol}USDT"]`);
            if (row) {
                const priceCell = row.querySelector('td:nth-child(2)');
                const changeCell = row.querySelector('td:nth-child(3) span');
                
                if (priceCell) priceCell.textContent = `$${parseFloat(prices[symbol].price).toLocaleString()}`;
                if (changeCell) {
                    changeCell.textContent = `${prices[symbol].change >= 0 ? '+' : ''}${prices[symbol].change}%`;
                    changeCell.className = `badge ${prices[symbol].change >= 0 ? 'bg-success' : 'bg-danger'}`;
                }
            }
        });
    }

    // Update trading view with new data
    updateTradingView(prices) {
        // Update chart with new price data
        if (this.chart && prices.BTC) {
            const latestData = this.chart.data.datasets[0].data;
            const lastCandle = latestData[latestData.length - 1];
            
            // Update last candle with new price (in production, get proper OHLC data)
            if (lastCandle) {
                const newPrice = parseFloat(prices.BTC.price);
                lastCandle.c = newPrice;
                lastCandle.h = Math.max(lastCandle.h, newPrice);
                lastCandle.l = Math.min(lastCandle.l, newPrice);
                
                this.chart.update('none');
            }
        }
    }

    // Update market statistics
    updateMarketStats(stats) {
        if (stats) {
            document.getElementById('totalVolume').textContent = `$${stats.totalVolume}`;
            document.getElementById('activePairs').textContent = `${stats.activePairs}+`;
            document.getElementById('btcDominance').textContent = `${stats.btcDominance}%`;
            
            document.getElementById('statVolume').textContent = `$${stats.volume24h}`;
            document.getElementById('statMarketCap').textContent = `$${stats.marketCap}`;
            document.getElementById('statSupply').textContent = stats.circulatingSupply;
            document.getElementById('statATH').textContent = `$${stats.ath}`;
            document.getElementById('statTransactions').textContent = stats.transactions24h;
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create and show notification (you can use a library like Toastify)
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // Show error
    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize market page when DOM is loaded
function initializeMarketPage() {
    window.marketPage = new MarketPage();
    window.marketPage.initialize();
}

// Global functions for the script tags in the EJS file
function initializeMarketPage() {
    window.marketPage = new MarketPage();
    window.marketPage.initialize();
}

function loadMarketData() {
    if (window.marketPage) {
        window.marketPage.loadInitialData();
    }
}

function initializeTradingChart() {
    if (window.marketPage) {
        window.marketPage.initializeTradingChart();
    }
}

// Sample market data (replace with real API calls)
const sampleMarketData = {
    markets: [
        { symbol: 'BTCUSDT', name: 'Bitcoin', price: 34567.89, change: 2.34, type: 'spot', volume: 1250000000 },
        { symbol: 'ETHUSDT', name: 'Ethereum', price: 1845.67, change: 1.56, type: 'spot', volume: 650000000 },
        { symbol: 'ADAUSDT', name: 'Cardano', price: 0.4567, change: -0.89, type: 'spot', volume: 120000000 },
        { symbol: 'DOTUSDT', name: 'Polkadot', price: 6.789, change: 3.45, type: 'spot', volume: 85000000 },
        { symbol: 'LINKUSDT', name: 'Chainlink', price: 12.345, change: -1.23, type: 'spot', volume: 45000000 },
        { symbol: 'LTCUSDT', name: 'Litecoin', price: 78.901, change: 0.67, type: 'spot', volume: 35000000 },
        { symbol: 'BCHUSDT', name: 'Bitcoin Cash', price: 234.56, change: -2.34, type: 'spot', volume: 28000000 },
        { symbol: 'XLMUSDT', name: 'Stellar', price: 0.1234, change: 1.23, type: 'spot', volume: 15000000 }
    ],
    stats: {
        totalVolume: '2.4B',
        activePairs: 150,
        btcDominance: '42.5',
        volume24h: '1.2B',
        marketCap: '675B',
        circulatingSupply: '19.5M BTC',
        ath: '68,789.63',
        transactions24h: '285,634'
    },
    orderBook: {
        asks: [
            { price: 34568.90, amount: 0.1254 },
            { price: 34569.50, amount: 0.0897 },
            { price: 34570.25, amount: 0.2043 },
            { price: 34571.80, amount: 0.1567 },
            { price: 34573.45, amount: 0.0987 }
        ],
        bids: [
            { price: 34567.50, amount: 0.1876 },
            { price: 34566.75, amount: 0.0954 },
            { price: 34565.25, amount: 0.1567 },
            { price: 34564.10, amount: 0.1234 },
            { price: 34562.85, amount: 0.0876 }
        ]
    },
    recentTrades: [
        { price: 34567.89, amount: 0.00234, side: 'BUY', timestamp: new Date() },
        { price: 34567.45, amount: 0.00189, side: 'SELL', timestamp: new Date(Date.now() - 30000) },
        { price: 34568.12, amount: 0.00567, side: 'BUY', timestamp: new Date(Date.now() - 60000) },
        { price: 34566.78, amount: 0.00345, side: 'SELL', timestamp: new Date(Date.now() - 90000) },
        { price: 34569.23, amount: 0.00123, side: 'BUY', timestamp: new Date(Date.now() - 120000) }
    ]
};

// For development - provide sample data
if (typeof fetch === 'function') {
    const originalFetch = fetch;
    window.fetch = function(...args) {
        if (args[0] === '/api/v1/markets') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(sampleMarketData)
            });
        }
        return originalFetch.apply(this, args);
    };
}