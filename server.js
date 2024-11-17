const express = require('express');
const path = require('path');
const axios = require('axios'); // Axios to handle external API requests

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname)));

// Serve index.html for root requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve stock-specific HTML files
app.get('/stock/:file', (req, res) => {
    const { file } = req.params;
    const filePath = path.join(__dirname, 'stock_folder', `${file}.html`);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`File not found: ${filePath}`);
            res.status(404).send('File not found');
        }
    });
});

// API endpoint to fetch stock data (Polygon.io)
app.get('/api/stock/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const polygonKey = 'dH4v61tsW0SojvndgGAB5wTNuoC81zXO'; // Replace with your Polygon.io API key

    try {
        const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${polygonKey}`);
        if (response.data.results && response.data.results.length > 0) {
            const stockDetails = response.data.results[0];
            res.json(stockDetails);
        } else {
            res.status(404).json({ error: `No data found for symbol ${symbol}` });
        }
    } catch (error) {
        console.error(`Error fetching data from Polygon.io for ${symbol}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch data from Polygon.io' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
