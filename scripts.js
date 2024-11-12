document.addEventListener("DOMContentLoaded", () => {
    $('#stockSelectionPopup').modal('show'); // Show popup on load

    const selectedStocks = [];
    const tickers = { RELIANCE: 'RELIANCE', ITC: 'ITC', HDFC: 'HDFC', TITAN: 'TITAN', SBIN: 'SBI', SUNPHARMA: 'SUNPHARMA' };

    document.querySelectorAll(".stock-option").forEach(option => {
        option.addEventListener("click", () => {
            const ticker = option.getAttribute("data-ticker");
            if (selectedStocks.includes(ticker)) {
                selectedStocks.splice(selectedStocks.indexOf(ticker), 1);
                option.classList.remove("selected");
            } else {
                selectedStocks.push(ticker);
                option.classList.add("selected");
            }
        });
    });

    document.getElementById("confirmSelection").addEventListener("click", async () => {
        $('#stockSelectionPopup').modal('hide');
        const container = document.getElementById("stockCardsContainer");
        container.innerHTML = '';

        for (const ticker of selectedStocks) {
            const stockData = await fetchStockData(ticker);
            const stockCard = createStockCard(ticker, stockData);
            container.appendChild(stockCard);
        }
    });
});

async function fetchStockData(ticker) {
    const apiKey = 'J4xRtJrvCbp_X9xVWnKzezCXjAPyM88z';
    const url = `https://api.polygon.io/v1/last/stocks/${ticker}?apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return {
        open: data.open || 'N/A',
        close: data.close || 'N/A',
        high: data.high || 'N/A',
        low: data.low || 'N/A'
    };
}

function createStockCard(ticker, stockData) {
    const card = document.createElement("div");
    card.classList.add("Stock-card");
    card.innerHTML = `
        <h1>${ticker}</h1>
        <img class="stock-img" src="assets/${ticker}.png" alt="${ticker} logo">
        <div class="value-container">
            <h4 class="open-value">Open: ${stockData.open}</h4>
            <h4 class="close-value">Close: ${stockData.close}</h4>
        </div>
        <div class="high-low-container">
            <h4 class="high-value">High: ${stockData.high}</h4>
            <h4 class="low-value">Low: ${stockData.low}</h4>
        </div>`;
    return card;
}
// Select elements
const hamburgerIcon = document.getElementById('hamburgerIcon');
const sidebar = document.getElementById('sidebar');
const body = document.body;

// Toggle sidebar visibility
hamburgerIcon.addEventListener('click', () => {
  sidebar.style.transform = sidebar.style.transform === 'translateX(250px)' ? 'translateX(-250px)' : 'translateX(250px)';
  body.classList.toggle('blur');
});

// Close sidebar on hover out
sidebar.addEventListener('mouseleave', () => {
  sidebar.style.transform = 'translateX(-250px)';
  body.classList.remove('blur');
});

