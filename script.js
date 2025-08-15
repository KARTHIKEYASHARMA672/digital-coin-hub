const coinList = document.getElementById('coin-list');
const searchInput = document.getElementById('search');
const themeToggleBtn = document.getElementById('theme-toggle');
const showWatchlistBtn = document.getElementById('show-watchlist');
const filterGainersBtn = document.getElementById('filter-gainers');
const filterLosersBtn = document.getElementById('filter-losers');
const clearFiltersBtn = document.getElementById('clear-filters');
const currencySelect = document.getElementById('currency');
const sortSelect = document.getElementById('sort');
const timeRangeSelect = document.getElementById('time-range');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username');
const userDisplay = document.getElementById('user-display');
const chartEl = document.getElementById('chart');

let allCoins = [];
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || {};
let currentPage = 1;
let isFetching = false;
let viewingWatchlist = false;
let currency = 'usd';
let sortBy = 'market_cap_desc';
let currentUser = null;
let chart;
const coinsPerPage = 50;

// Login system
loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Please enter a username!');
    return;
  }

  currentUser = username;
  userDisplay.textContent = `Logged in as: ${currentUser}`;

  if (!watchlist[currentUser]) {
    watchlist[currentUser] = [];
  }

  saveWatchlist();
  displayCoins(viewingWatchlist ? getWatchlistCoins() : allCoins);
});

// Fetch coins
async function fetchCoins(page = 1) {
  if (isFetching) return;

  isFetching = true;
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=${sortBy}&per_page=${coinsPerPage}&page=${page}`);
    const data = await res.json();

    if (page === 1) allCoins = [];

    allCoins = [...allCoins, ...data];
    displayCoins(viewingWatchlist ? getWatchlistCoins() : allCoins);
  } catch (error) {
    console.error('Fetch error:', error);
  }
  isFetching = false;
}

// Display coins
function displayCoins(coins) {
  coinList.innerHTML = '';

  coins.forEach(coin => {
    const coinEl = document.createElement('div');
    coinEl.classList.add('coin');

    const isFavorite = currentUser && watchlist[currentUser]?.includes(coin.id);
    const priceChange = coin.price_change_percentage_24h;
    const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';
    const priceChangeText = priceChange !== null ? `${priceChange.toFixed(2)}%` : 'N/A';

    coinEl.innerHTML = `
      <div class="star ${isFavorite ? 'favorited' : ''}" data-id="${coin.id}">⭐</div>
      <img src="${coin.image}" alt="${coin.name} logo" />
      <h2>${coin.name} (${coin.symbol.toUpperCase()})</h2>
      <p><strong>Price:</strong> ${formatCurrency(coin.current_price)}</p>
      <p><strong>Market Cap:</strong> ${formatCurrency(coin.market_cap)}</p>
      <p><strong>24h Change:</strong> <span class="${priceChangeClass}">${priceChangeText}</span></p>
      <p><strong>Rank:</strong> #${coin.market_cap_rank}</p>
      <button class="show-chart" data-id="${coin.id}">📈 Show Chart</button>
    `;

    coinList.appendChild(coinEl);
  });
}

// Currency formatting
function formatCurrency(value) {
  const symbols = { usd: '$', eur: '€', inr: '₹' };
  return `${symbols[currency]}${value.toLocaleString()}`;
}

// Infinite scroll
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !viewingWatchlist) {
    currentPage++;
    fetchCoins(currentPage);
  }
});

// Search
searchInput.addEventListener('input', () => {
  const searchValue = searchInput.value.toLowerCase();
  const coins = viewingWatchlist ? getWatchlistCoins() : allCoins;
  const filtered = coins.filter(coin => coin.name.toLowerCase().includes(searchValue));
  displayCoins(filtered);
});

// Theme toggle
themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
  themeToggleBtn.textContent = document.body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
});

// Watchlist toggle
showWatchlistBtn.addEventListener('click', () => {
  if (!currentUser) {
    alert('Please login first!');
    return;
  }

  viewingWatchlist = !viewingWatchlist;
  showWatchlistBtn.textContent = viewingWatchlist ? '🔙 Back to All Coins' : '⭐ Watchlist';

  displayCoins(viewingWatchlist ? getWatchlistCoins() : allCoins);
});

// Filters
filterGainersBtn.addEventListener('click', () => {
  const coins = viewingWatchlist ? getWatchlistCoins() : allCoins;
  const gainers = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 10);
  displayCoins(gainers);
});

filterLosersBtn.addEventListener('click', () => {
  const coins = viewingWatchlist ? getWatchlistCoins() : allCoins;
  const losers = [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 10);
  displayCoins(losers);
});

clearFiltersBtn.addEventListener('click', () => {
  displayCoins(viewingWatchlist ? getWatchlistCoins() : allCoins);
});

// Currency & sort change
currencySelect.addEventListener('change', () => {
  currency = currencySelect.value;
  currentPage = 1;
  fetchCoins(currentPage);
});

sortSelect.addEventListener('change', () => {
  sortBy = sortSelect.value;
  currentPage = 1;
  fetchCoins(currentPage);
});

// Coin list click handler
coinList.addEventListener('click', async (e) => {
  if (e.target.classList.contains('star')) {
    if (!currentUser) {
      alert('Please login first!');
      return;
    }

    const id = e.target.getAttribute('data-id');
    toggleFavorite(id);
    displayCoins(viewingWatchlist ? getWatchlistCoins() : allCoins);
  }

  if (e.target.classList.contains('show-chart')) {
    const id = e.target.getAttribute('data-id');
    showChart(id, timeRangeSelect.value);
  }
});

// Toggle favorite
function toggleFavorite(id) {
  if (!currentUser) return;

  const userList = watchlist[currentUser] || [];

  if (userList.includes(id)) {
    watchlist[currentUser] = userList.filter(item => item !== id);
  } else {
    watchlist[currentUser].push(id);
  }

  saveWatchlist();
}

// Get watchlist coins
function getWatchlistCoins() {
  if (!currentUser) return [];
  return allCoins.filter(coin => watchlist[currentUser]?.includes(coin.id));
}

// Save watchlist to localStorage
function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

// Show chart
async function showChart(coinId, days = 7) {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`);
  const data = await res.json();

  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString());

  if (chart) chart.destroy();

  chart = new Chart(chartEl, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Price (${currency.toUpperCase()})`,
        data: prices,
        fill: true,
        borderColor: '#00ffe7',
        backgroundColor: 'rgba(0, 255, 231, 0.1)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: document.body.classList.contains('dark') ? '#fff' : '#000'
          }
        }
      },
      scales: {
        x: { ticks: { color: document.body.classList.contains('dark') ? '#fff' : '#000' } },
        y: { ticks: { color: document.body.classList.contains('dark') ? '#fff' : '#000' } }
      }
    }
  });
}

// Initial fetch
fetchCoins(currentPage);
