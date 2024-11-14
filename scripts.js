document.addEventListener("DOMContentLoaded", () => {
    $('#stockSelectionPopup').modal('show'); // Show popup on load

    const selectedStocks = [];
    const alphaVantageKey = 'DYUP8VE9PJH8O9I2';

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
            const stockData = await fetchStockData(ticker, alphaVantageKey);
            const stockCard = createStockCard(ticker, stockData);
            container.appendChild(stockCard);
        }
    });
});

async function fetchStockData(ticker, apiKey) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        const today = new Date().toISOString().split('T')[0];
        const timeSeries = data['Time Series (Daily)'];
        const stockInfo = timeSeries[today] || Object.values(timeSeries)[0];

        return {
            open: stockInfo['1. open'] || 'N/A',
            close: stockInfo['4. close'] || 'N/A',
            high: stockInfo['2. high'] || 'N/A',
            low: stockInfo['3. low'] || 'N/A'
        };
    } catch (error) {
        console.error(`Failed to fetch stock data for ${ticker}:`, error.message);
        return { open: 'N/A', close: 'N/A', high: 'N/A', low: 'N/A' };
    }
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
