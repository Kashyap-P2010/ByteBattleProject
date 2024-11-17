document.addEventListener("DOMContentLoaded", () => {
    $('#stockSelectionPopup').modal('show'); // Show popup on load

    const selectedStocks = [];
    const alphaVantageKey = 'GMCV8KLI4CCA708N';
    const polygonKey = 'dH4v61tsW0SojvndgGAB5wTNuoC81zXO';

    // Stock option selection with animations
    document.querySelectorAll(".stock-option").forEach(option => {
        option.addEventListener("click", () => {
            const ticker = option.getAttribute("data-ticker");
            if (selectedStocks.includes(ticker)) {
                selectedStocks.splice(selectedStocks.indexOf(ticker), 1);
                option.classList.remove("selected");
                gsap.to(option, { scale: 1, duration: 0.5 });
            } else {
                selectedStocks.push(ticker);
                option.classList.add("selected");
                gsap.to(option, { scale: 1.2, duration: 0.5 });
            }
        });
    });

    // Confirm stock selection
    document.getElementById("confirmSelection").addEventListener("click", async () => {
        $('#stockSelectionPopup').modal('hide');
        const container = document.getElementById("stockCardsContainer");
        if (!container) {
            console.error("Stock cards container not found!");
            return;
        }

        container.innerHTML = ''; // Clear existing stock cards

        for (const ticker of selectedStocks) {
            const stockData = await fetchStockData(ticker, alphaVantageKey, polygonKey);
            const timeSeries = await fetchTimeSeriesData(ticker, alphaVantageKey, polygonKey);
            if (stockData && timeSeries) {
                const stockCard = createStockCard(ticker, stockData, timeSeries);
                container.appendChild(stockCard);
            }
        }
    });
});
// Fetch time-series data
async function fetchTimeSeriesData(ticker, alphaVantageKey, polygonKey) {
    try {
        const weeklyResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${ticker}&apikey=${alphaVantageKey}`);
        const monthlyResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${ticker}&apikey=${alphaVantageKey}`);

        const weeklyData = await weeklyResponse.json();
        const monthlyData = await monthlyResponse.json();

        if (weeklyData["Weekly Time Series"] && monthlyData["Monthly Time Series"]) {
            const weekly = Object.entries(weeklyData["Weekly Time Series"]).slice(0, 10).map(([date, data]) => ({
                date,
                close: parseFloat(data["4. close"]),
            }));

            const monthly = Object.entries(monthlyData["Monthly Time Series"]).slice(0, 10).map(([date, data]) => ({
                date,
                close: parseFloat(data["4. close"]),
            }));

            return { weekly, monthly };
        } else {
            console.warn(`Alpha Vantage time-series data not found for ${ticker}. Falling back to Polygon.`);
            return await fetchTimeSeriesFromPolygon(ticker, polygonKey);
        }
    } catch (error) {
        console.warn(`Error fetching Alpha Vantage time-series data for ${ticker}. Falling back to Polygon: ${error}`);
        return await fetchTimeSeriesFromPolygon(ticker, polygonKey);
    }
}
async function fetchTimeSeriesFromPolygon(ticker, polygonKey) {
    try {
        const weeklyResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/${ticker}/range/7/day/2023-01-01/2023-12-31?adjusted=true&sort=desc&limit=10&apiKey=${polygonKey}`);
        const monthlyResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/month/2023-01-01/2023-12-31?adjusted=true&sort=desc&limit=10&apiKey=${polygonKey}`);

        const weeklyData = await weeklyResponse.json();
        const monthlyData = await monthlyResponse.json();

        const weekly = weeklyData.results.map(item => ({
            date: new Date(item.t).toISOString().split('T')[0],
            close: item.c,
        }));

        const monthly = monthlyData.results.map(item => ({
            date: new Date(item.t).toISOString().split('T')[0],
            close: item.c,
        }));

        return { weekly, monthly };
    } catch (error) {
        console.error(`Error fetching time-series data from Polygon for ${ticker}: ${error}`);
        return null;
    }
}

async function fetchStockDataFromPolygon(ticker, polygonKey) {
    try {
        const response = await fetch(`https://api.polygon.io/v1/open-close/${ticker}/2023-12-01?adjusted=true&apiKey=${polygonKey}`);
        const data = await response.json();

        if (data) {
            return {
                source: 'Polygon.io',
                open: data.open,
                close: data.close,
                high: data.high,
                low: data.low,
            };
        }
    } catch (error) {
        console.error(`Error fetching stock data from Polygon for ${ticker}: ${error}`);
    }

    return null; // Return null if data fetch fails
}
// Fetch stock data
async function fetchStockData(ticker, alphaVantageKey, polygonKey) {
    try {
        const alphaResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${alphaVantageKey}`);
        const alphaData = await alphaResponse.json();

        if (alphaData["Time Series (Daily)"]) {
            const timeSeries = alphaData["Time Series (Daily)"];
            const latestDate = Object.keys(timeSeries)[0];
            const stockDetails = timeSeries[latestDate];

            return {
                source: 'AlphaVantage',
                open: stockDetails["1. open"],
                close: stockDetails["4. close"],
                high: stockDetails["2. high"],
                low: stockDetails["3. low"],
            };
        } else {
            console.warn(`Alpha Vantage data not found for ticker ${ticker}. Falling back to Polygon.`);
            return await fetchStockDataFromPolygon(ticker, polygonKey);
        }
    } catch (error) {
        console.warn(`Error fetching Alpha Vantage data for ${ticker}. Falling back to Polygon: ${error}`);
        return await fetchStockDataFromPolygon(ticker, polygonKey);
    }
}
// Create stock card

// Create stock card with source indication
function createStockCard(ticker, stockData, timeSeries) {
    const card = document.createElement("div");
    card.className = "stock-card bg-white p-3 m-2 rounded shadow";
    card.style.width = "200px";

    card.innerHTML = `
        <h4>${ticker}</h4>
        <img src="assets/${ticker}.png" alt="${ticker} logo" class="img-fluid my-2" style="max-height: 100px; object-fit: contain;">
        <p>Source: ${stockData.source}</p>
        <p>Open: ${stockData.open}</p>
        <p>Close: ${stockData.close}</p>
        <p>High: ${stockData.high}</p>
        <p>Low: ${stockData.low}</p>
    `;

    card.addEventListener("click", () => openStockModal(ticker, stockData, timeSeries));
    return card;
}



// Open stock modal
function openStockModal(ticker, stockData, timeSeries) {
    const modalBody = document.querySelector("#stockModal .modal-body");
    if (!modalBody) return;

    modalBody.innerHTML = `
        <h4>${ticker} Details</h4>
        <ul>
            <li>Open: ${stockData.open}</li>
            <li>Close: ${stockData.close}</li>
            <li>High: ${stockData.high}</li>
            <li>Low: ${stockData.low}</li>
        </ul>
        <h5>10-Week Data</h5>
        <ul>${timeSeries.weekly.map(w => `<li>${w.date}: ${w.close}</li>`).join('')}</ul>
        <canvas id="weeklyChart"></canvas>
        <h5>10-Month Data</h5>
        <ul>${timeSeries.monthly.map(m => `<li>${m.date}: ${m.close}</li>`).join('')}</ul>
        <canvas id="monthlyChart"></canvas>
    `;

    // Weekly Chart
    const weeklyCtx = document.getElementById("weeklyChart").getContext("2d");
    new Chart(weeklyCtx, {
        type: "line",
        data: {
            labels: timeSeries.weekly.map(w => w.date),
            datasets: [{
                label: "Weekly Close Prices",
                data: timeSeries.weekly.map(w => w.close),
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 2,
                fill: false,
            }],
        },
        options: { responsive: true },
    });

    // Monthly Chart
    const monthlyCtx = document.getElementById("monthlyChart").getContext("2d");
    new Chart(monthlyCtx, {
        type: "line",
        data: {
            labels: timeSeries.monthly.map(m => m.date),
            datasets: [{
                label: "Monthly Close Prices",
                data: timeSeries.monthly.map(m => m.close),
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 2,
                fill: false,
            }],
        },
        options: { responsive: true },
    });

    $('#stockModal').modal('show');
}