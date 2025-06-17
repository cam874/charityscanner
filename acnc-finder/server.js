const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the static frontend file from the 'public' directory
app.use(express.static('public'));

// --- PROXY ENDPOINT FOR AUTOCOMPLETE CHARITY NAMES ---
app.get('/api/autocomplete', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) {
        return res.status(400).json({ error: 'A search keyword is required.' });
    }
    const acncAutocompleteUrl = `https://www.acnc.gov.au/api/dynamics/autocomplete/charity?search=${encodeURIComponent(keyword)}`;
    try {
        const apiResponse = await fetch(acncAutocompleteUrl);
        if (!apiResponse.ok) {
            throw new Error(`ACNC Autocomplete API returned status ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy autocomplete error:', error);
        res.status(500).json({ error: 'Failed to fetch autocomplete data from ACNC.' });
    }
});

// --- PROXY ENDPOINT FOR SEARCHING CHARITIES (returns UUID, ABN, etc.) ---
app.get('/api/search', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'A charity name is required.' });
    }
    const acncSearchUrl = `https://www.acnc.gov.au/api/dynamics/search/charity?search=${encodeURIComponent(name)}`;
    try {
        const apiResponse = await fetch(acncSearchUrl);
        if (!apiResponse.ok) {
            throw new Error(`ACNC Charity Search API returned status ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy ACNC search error:', error);
        res.status(500).json({ error: 'Failed to fetch charity data from ACNC.' });
    }
});

// --- PROXY ENDPOINT FOR FETCHING A SPECIFIC AIS ---
app.get('/api/ais', async (req, res) => {
    const { uuid, year } = req.query;

    if (!uuid || !year) {
        return res.status(400).json({ error: 'Charity UUID and year are required.' });
    }

    const acncEntityUrl = `https://www.acnc.gov.au/api/dynamics/entity/${uuid}?type=annual_information_statement&year=${year}`;
    console.log(`[Proxy] Fetching AIS: ${acncEntityUrl}`);

    try {
        const apiResponse = await fetch(acncEntityUrl);
         // The ACNC API correctly returns a 404 if the report for that year doesn't exist.
         // We pass this status directly back to the frontend so it can handle it gracefully.
        if (!apiResponse.ok) {
            return res.status(apiResponse.status).send();
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy AIS fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch AIS data from ACNC.' });
    }
});

// --- PROXY ENDPOINT FOR FETCHING CHARITY ENTITY DATA (FINANCIALS, ETC.) ---
app.get('/api/entity', async (req, res) => {
    const { uuid } = req.query;
    if (!uuid) {
        return res.status(400).json({ error: 'Charity UUID is required.' });
    }
    const acncEntityUrl = `https://www.acnc.gov.au/api/dynamics/entity/${uuid}`;
    try {
        const apiResponse = await fetch(acncEntityUrl);
        if (!apiResponse.ok) {
            throw new Error(`ACNC Entity API returned status ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy ACNC entity error:', error);
        res.status(500).json({ error: 'Failed to fetch entity data from ACNC.' });
    }
});

app.listen(PORT, () => {
    console.log(`ACNC Proxy Server running at http://localhost:${PORT}`);
});
