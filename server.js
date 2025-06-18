const express = require('express');
const fetch = require('node-fetch');
const ACNCDatabase = require('./database/queries');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Add middleware for logging requests in Vercel
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Add CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Serve the static frontend file from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database connection with error handling
let db;
try {
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Is Vercel:', process.env.VERCEL === '1' ? 'Yes' : 'No');
    console.log('Current working directory:', process.cwd());
    console.log('Directory contents:', fs.readdirSync(process.cwd()));
    
    db = new ACNCDatabase();
    console.log('Database initialized');
} catch (error) {
    console.error('Failed to initialize database:', error);
    // We'll continue and handle errors in the routes
}

// Debug route to test if server is working
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server is working!', 
        cwd: process.cwd(),
        env: process.env.NODE_ENV || 'development',
        isVercel: process.env.VERCEL === '1',
        dbInitialized: !!db
    });
});

// --- EXISTING LIVE API ENDPOINTS (KEPT FOR CURRENT DATA) ---

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

// --- NEW DATABASE ENDPOINTS FOR HISTORICAL DATA ---

// Search charities in local database
app.get('/api/db/search', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const {
            search = '',
            size = '',
            minRevenue = 0,
            maxRevenue = '',
            year = '',
            limit = 50,
            offset = 0
        } = req.query;
        
        const options = {
            search,
            size,
            minRevenue: parseInt(minRevenue) || 0,
            maxRevenue: maxRevenue ? parseInt(maxRevenue) : Number.MAX_SAFE_INTEGER,
            year: year ? parseInt(year) : null,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        };
        
        const results = db.searchCharities(options);
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    } catch (error) {
        console.error('Database search error:', error);
        res.status(500).json({ error: 'Failed to search database', message: error.message });
    }
});

// Get charity details from database
app.get('/api/db/charity/:abn', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { abn } = req.params;
        const details = db.getCharityDetails(abn);
        
        if (!details) {
            return res.status(404).json({ error: 'Charity not found' });
        }
        
        res.json({
            success: true,
            data: details
        });
    } catch (error) {
        console.error('Database charity details error:', error);
        res.status(500).json({ error: 'Failed to get charity details' });
    }
});

// Get historical financial data for a charity
app.get('/api/db/charity/:abn/history', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { abn } = req.params;
        const trends = db.getFinancialTrends(abn);
        
        res.json({
            success: true,
            data: trends || []
        });
    } catch (error) {
        console.error('Database historical trends error:', error);
        res.status(500).json({ error: 'Failed to get historical trends' });
    }
});

// Get financial trends for a charity
app.get('/api/db/trends/:abn', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { abn } = req.params;
        const trends = db.getFinancialTrends(abn);
        
        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('Database trends error:', error);
        res.status(500).json({ error: 'Failed to get financial trends' });
    }
});

// Get yearly statistics
app.get('/api/db/stats/:year', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { year } = req.params;
        const stats = db.getYearlyStats(parseInt(year));
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Database stats error:', error);
        res.status(500).json({ error: 'Failed to get yearly statistics' });
    }
});

// Get top charities for a year
app.get('/api/db/top/:year', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { year } = req.params;
        const { limit = 10 } = req.query;
        const topCharities = db.getTopCharities(parseInt(year), parseInt(limit));
        
        res.json({
            success: true,
            data: topCharities
        });
    } catch (error) {
        console.error('Database top charities error:', error);
        res.status(500).json({ error: 'Failed to get top charities' });
    }
});

// Get sector analysis
app.get('/api/db/sectors/:year', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { year } = req.params;
        const sectors = db.getSectorAnalysis(parseInt(year));
        
        res.json({
            success: true,
            data: sectors
        });
    } catch (error) {
        console.error('Database sector analysis error:', error);
        res.status(500).json({ error: 'Failed to get sector analysis' });
    }
});

// Get autocomplete suggestions from database
app.get('/api/db/autocomplete', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { search = '' } = req.query;
        const suggestions = db.getAutocompleteSuggestions(search);
        
        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        console.error('Database autocomplete error:', error);
        res.status(500).json({ error: 'Failed to get autocomplete suggestions' });
    }
});

// Get available years
app.get('/api/db/years', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const years = db.getAvailableYears();
        
        res.json({
            success: true,
            data: years
        });
    } catch (error) {
        console.error('Database years error:', error);
        res.status(500).json({ error: 'Failed to get available years' });
    }
});

// Health check endpoint
app.get('/api/db/health', async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available, but the API server is running.'
            });
        }
        
        const years = db.getAvailableYears();
        const stats = years.length > 0 ? db.getYearlyStats(Math.max(...years)) : {};
        
        res.json({
            success: true,
            database: 'connected',
            available_years: years,
            latest_year_stats: stats
        });
    } catch (error) {
        console.error('Database health check error:', error);
        res.status(500).json({ 
            error: 'Database check failed', 
            message: error.message,
            apiServer: 'running'
        });
    }
});

// --- LOCAL DATABASE ENDPOINTS (OLDER VERSIONS - KEPT FOR COMPATIBILITY) ---

// Search charities with filters from local database
app.get('/api/local/search', (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { search, size, minRevenue, maxRevenue, year, limit, offset } = req.query;
        const results = db.searchCharities({
            search,
            size,
            minRevenue: minRevenue ? Number(minRevenue) : 0,
            maxRevenue: maxRevenue ? Number(maxRevenue) : Number.MAX_SAFE_INTEGER,
            year: year ? Number(year) : null,
            limit: limit ? Number(limit) : 50,
            offset: offset ? Number(offset) : 0
        });
        res.json(results);
    } catch (error) {
        console.error('Local search error:', error);
        res.status(500).json({ error: 'Failed to search local charity database.' });
    }
});

// Get detailed charity information from local database
app.get('/api/local/charity/:abn', (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { abn } = req.params;
        const details = db.getCharityDetails(abn);
        if (details) {
            res.json(details);
        } else {
            res.status(404).json({ error: 'Charity not found in local database.' });
        }
    } catch (error) {
        console.error('Local charity details error:', error);
        res.status(500).json({ error: 'Failed to fetch charity details from local database.' });
    }
});

// Get financial trends for a charity from local database
app.get('/api/local/trends/:abn', (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ 
                error: 'Database Service Unavailable',
                message: 'The database connection is not available.'
            });
        }
        
        const { abn } = req.params;
        const trends = db.getFinancialTrends(abn);
        if (trends && trends.length > 0) {
            res.json(trends);
        } else {
            res.status(404).json({ error: 'No financial trends found for this charity.' });
        }
    } catch (error) {
        console.error('Local financial trends error:', error);
        res.status(500).json({ error: 'Failed to fetch financial trends from local database.' });
    }
});

// Error handling middleware - place at the end
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`ACNC Proxy Server running at http://localhost:${PORT}`);
});
