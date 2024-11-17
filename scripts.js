document.addEventListener("DOMContentLoaded", () => {
    $('#stockSelectionPopup').modal('show'); // Show popup on load

    const selectedStocks = [];
    const alphaVantageKeys = [
        'UR99IXSBTTCF13N3', 'FD7HQBZBP0Y0WZB0', 'GZLLSB6AH1NR3GOR',
        'Z8PRDXWUYS5QU0IQ', 'HGXFL235VYVD1MOB', 'Z6XM3B5OO01GJA6Y',
        '3WR4N1RL795M3VGW', '5RQV2FLBYGA0HAIW', '26ZBZ4M6497SF3NJ', 'BG0TCDIF75WAGR55'
    ];
    const polygonKeys = [
        'Xamwnk853o8rmbnfe2e_cAAGGpOIxXm0', 'FhTtubpu_10H2N5mUqaLpbRl7wGr77Uy',
        'f5zXPVnlYLjyWnpPpNrGxv4GvnJpMArR', 'jhpgBa58lbCcanRepvPlsEYeUXUXHakw',
        'AT19FEQDDPWT_3atLprCJWoSqh7agXQl', 'bth1OMhkTWrrjGQPDKaPMIS5s2ku_XfE',
        '54Q_OhXPKgXDBBWxJmWNwcMLbv2oitge', 'vZHZZAsc6DeioNf4aCSHgD6WJ9S83E5S',
        'sQ62HHpBaBMv49K0thuOC9I9_Gg0yhVp', 'M8duEl5sdM95F74Q5Y8cZpCrQnhPpBlo'
    ];

    let alphaIndex = 0;
    let polygonIndex = 0;

    const getAlphaKey = () => alphaVantageKeys[alphaIndex % alphaVantageKeys.length];
    const getPolygonKey = () => polygonKeys[polygonIndex % polygonKeys.length];

    const rotateAlphaKey = () => alphaIndex++;
    const rotatePolygonKey = () => polygonIndex++;

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
            const stockData = await fetchStockData(ticker);
            const timeSeries = await fetchTimeSeriesData(ticker);
            if (stockData && timeSeries) {
                const stockCard = createStockCard(ticker, stockData, timeSeries);
                container.appendChild(stockCard);
            }
        }
    });
// Fetch time-series data
async function fetchTimeSeriesData(ticker) {
    // Try Alpha Vantage
    try {
        const alphaKey = getAlphaKey();
        const weeklyResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${ticker}&apikey=${alphaKey}`);
        const monthlyResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${ticker}&apikey=${alphaKey}`);

        if (weeklyResponse.status === 429 || monthlyResponse.status === 429) {
            rotateAlphaKey();
            return fetchTimeSeriesData(ticker); // Retry with next key
        }

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
            console.warn(`Alpha Vantage data not found for ${ticker}.`);
        }
    } catch (error) {
        console.error(`Error fetching Alpha Vantage time-series data for ${ticker}: ${error}`);
    }

    // Fall back to Polygon
    try {
        return await fetchTimeSeriesFromPolygon(ticker);
    } catch (error) {
        console.error(`Error fetching time-series data from Polygon for ${ticker}: ${error}`);
    }

    return null; // Return null if both APIs fail
}
async function fetchTimeSeriesFromPolygon(ticker) {
    const polygonKey = getPolygonKey();
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/month/2023-01-01/2023-12-31?adjusted=true&sort=desc&limit=10&apiKey=${polygonKey}`;

    try {
        const response = await fetch(url);
        if (response.status === 429) {
            rotatePolygonKey();
            return fetchTimeSeriesFromPolygon(ticker); // Retry with next key
        }

        const data = await response.json();
        if (data && data.results) {
            const monthly = data.results.map(result => ({
                date: new Date(result.t).toISOString().split('T')[0],
                close: result.c,
            }));
            return { weekly: [], monthly };
        }
    } catch (error) {
        throw new Error("Polygon data not available");
    }
}
 // Fetch stock data
 async function fetchStockData(ticker) {
    const alphaKey = getAlphaKey();
    try {
        const alphaResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${alphaKey}`);
        if (alphaResponse.status === 429) {
            rotateAlphaKey();
            return fetchStockData(ticker); // Retry with next key
        }

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
            return await fetchStockDataFromPolygon(ticker);
        }
    } catch (error) {
        console.warn(`Error fetching Alpha Vantage data for ${ticker}. Falling back to Polygon: ${error}`);
        return await fetchStockDataFromPolygon(ticker);
    }
}

async function fetchStockDataFromPolygon(ticker) {
    const polygonKey = getPolygonKey();
    try {
        const response = await fetch(`https://api.polygon.io/v1/open-close/${ticker}/2023-12-01?adjusted=true&apiKey=${polygonKey}`);
        if (response.status === 429) {
            rotatePolygonKey();
            return fetchStockDataFromPolygon(ticker); // Retry with next key
        }

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
});
// Fetch stock data

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

console.log("heklo")

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
    week = timeSeries.weekly.map(w => w.date)
    data = timeSeries.weekly.map(w => w.close)
    
    labels = ["Week 1", "Week 2", "Week 3", "Week 4",]
    values = [402.27, 427.13, 502.00, 480.00]
    const weeklyCtx = document.getElementById("weeklyChart").getContext("2d");
    new Chart(weeklyCtx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Weekly Close Prices",
                data: values,
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
            labels: ["May", "June", "July", "August"],
            datasets: [{
                label: "Monthly Close Prices",
                data: [312.12, 406.51, 370.00, 212.21],
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 2,
                fill: false,
            }],
        },
        options: { responsive: true },
    });

    $('#stockModal').modal('show');
}