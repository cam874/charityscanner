const express = require('express');
const fetch = require('node-fetch');
const ACNCDatabase = require('./database/queries');
const path = require('path');
const fs = require('fs');
const https = require('https');

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

// --- HTTPS/SSL CONFIGURATION ---
const useHttps = process.env.USE_HTTPS === 'true';
let server;

if (useHttps) {
    try {
        const options = {
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem')
        };
        server = https.createServer(options, app);
        console.log('HTTPS server created.');
    } catch (e) {
        console.error('Could not create HTTPS server. Falling back to HTTP.', e);
        server = app; // Fallback to HTTP if certs are missing
    }
} else {
    server = app; // Use HTTP if USE_HTTPS is not set
}

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

// --- NEW LOCAL DATABASE ENDPOINTS (FOR HISTORICAL DATA) ---

// Search charities in local database
app.get('/api/local/search', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not initialized' });
    }
    const { name = '', search = '' } = req.query;
    const searchTerm = name || search;
    
    try {
        const charities = db.searchCharities({ search: searchTerm });
        res.json(charities);
    } catch (err) {
        console.error('Local search error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Get charity details from database
app.get('/api/local/charity/:abn', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not initialized' });
    }
    const { abn } = req.params;
    
    try {
        const charity = db.getCharityDetails(abn);
        if (!charity) {
            return res.status(404).json({ error: 'Charity not found' });
        }
        res.json(charity);
    } catch (err) {
        console.error('Local charity details error:', err);
        return res.status(500).json({ error: err.message });
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

// Health-check endpoint for frontend proxy
app.get('/api/db/health', (req, res) => {
  res.json({ success: true, dbInitialized: !!db });
});

// Map frontend history path to local trends
app.get('/api/db/charity/:abn/history', (req, res, next) => {
  const { abn } = req.params;
  // Forward to the existing local trends route
  req.url = `/api/local/trends/${abn}`;
  next();
});

// --- HISTORICAL DATA ENDPOINT (WORKING FROM BEFORE) ---
app.get('/api/historical', async (req, res) => {
    const { abn } = req.query;
    
    if (!abn) {
        return res.status(400).json({ error: 'ABN is required' });
    }

    try {
        // Get the charity UUID first from search
        const searchUrl = `https://www.acnc.gov.au/api/dynamics/search/charity?search=${encodeURIComponent(abn)}`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
            throw new Error(`Failed to find charity with ABN ${abn}`);
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.items || searchData.items.length === 0) {
            return res.status(404).json({ error: 'Charity not found' });
        }
        
        const charity = searchData.items[0];
        const uuid = charity.uuid;
        
        // Fetch historical data for multiple years
        const years = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013];
        const historicalData = [];
        
        for (const year of years) {
            try {
                const aisUrl = `https://www.acnc.gov.au/api/dynamics/entity/${uuid}?type=annual_information_statement&year=${year}`;
                const aisResponse = await fetch(aisUrl);
                
                if (aisResponse.ok) {
                    const aisData = await aisResponse.json();
                    
                    if (aisData.data) {
                        const yearData = {
                            year,
                            revenue: calculateTotalRevenue(aisData.data),
                            expenses: calculateTotalExpenses(aisData.data),
                            assets: parseFloat(aisData.data.TotalAssets || 0),
                            liabilities: parseFloat(aisData.data.TotalLiabilities || 0)
                        };
                        
                        yearData.surplus = yearData.revenue - yearData.expenses;
                        historicalData.push(yearData);
                    }
                }
            } catch (error) {
                console.log(`No data for year ${year}: ${error.message}`);
            }
        }
        
        res.json(historicalData);
        
    } catch (error) {
        console.error('Historical data error:', error);
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});

// --- ENHANCED SEARCH ENDPOINT (WORKING FROM BEFORE) ---
app.get('/api/db/search', async (req, res) => {
    const { search = '', limit = 50 } = req.query;
    
    try {
        // Use the live ACNC search API
        const searchUrl = `https://www.acnc.gov.au/api/dynamics/search/charity?search=${encodeURIComponent(search)}`;
        const searchResponse = await fetch(searchUrl);
        
        if (!searchResponse.ok) {
            throw new Error(`ACNC search failed with status ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.items) {
            return res.json([]);
        }
        
        // Limit the results and add financial data for the first few
        const limitedResults = searchData.items.slice(0, parseInt(limit));
        const enhancedResults = [];
        
        // Get financial data for first 10 results to avoid overwhelming the API
        const financialPromises = limitedResults.slice(0, 10).map(async (charity) => {
            try {
                const entityUrl = `https://www.acnc.gov.au/api/dynamics/entity/${charity.uuid}`;
                const entityResponse = await fetch(entityUrl);
                
                if (entityResponse.ok) {
                    const entityData = await entityResponse.json();
                    
                    return {
                        abn: charity.abn,
                        charity_name: charity.name,
                        charity_size: charity.size,
                        charity_website: charity.website,
                        uuid: charity.uuid,
                        state: charity.state,
                        total_revenue: entityData.data ? calculateTotalRevenue(entityData.data) : 0,
                        total_expenses: entityData.data ? calculateTotalExpenses(entityData.data) : 0,
                        total_assets: entityData.data ? parseFloat(entityData.data.TotalAssets || 0) : 0,
                        net_surplus_deficit: entityData.data ? (calculateTotalRevenue(entityData.data) - calculateTotalExpenses(entityData.data)) : 0
                    };
                }
            } catch (error) {
                console.log(`Failed to get financial data for ${charity.name}: ${error.message}`);
            }
            
            // Return basic data if financial fetch fails
            return {
                abn: charity.abn,
                charity_name: charity.name,
                charity_size: charity.size,
                charity_website: charity.website,
                uuid: charity.uuid,
                state: charity.state,
                total_revenue: 0,
                total_expenses: 0,
                total_assets: 0,
                net_surplus_deficit: 0
            };
        });
        
        const enhancedFirst10 = await Promise.all(financialPromises);
        
        // Add the remaining results without financial data
        const remainingResults = limitedResults.slice(10).map(charity => ({
            abn: charity.abn,
            charity_name: charity.name,
            charity_size: charity.size,
            charity_website: charity.website,
            uuid: charity.uuid,
            state: charity.state,
            total_revenue: 0,
            total_expenses: 0,
            total_assets: 0,
            net_surplus_deficit: 0
        }));
        
        const finalResults = [...enhancedFirst10, ...remainingResults];
        res.json(finalResults);
        
    } catch (error) {
        console.error('Database search error:', error);
        res.status(500).json({ error: 'Failed to search charities' });
    }
});

// --- HELPER FUNCTIONS FOR FINANCIAL CALCULATIONS ---
function calculateTotalRevenue(data) {
    const revenue = 
        parseFloat(data.TotalGrossIncomeGovernmentGrants || 0) +
        parseFloat(data.TotalGrossIncomeOtherRevenues || 0) +
        parseFloat(data.TotalGrossIncomeDonationsAndRequests || 0) +
        parseFloat(data.TotalGrossIncomeInvestments || 0) +
        parseFloat(data.TotalGrossIncomeOther || 0);
    
    return revenue;
}

function calculateTotalExpenses(data) {
    const expenses = 
        parseFloat(data.TotalExpensesEmployee || 0) +
        parseFloat(data.TotalExpensesOther || 0) +
        parseFloat(data.TotalExpensesGrantsAndDonationsMadeToOtherOrganisations || 0) +
        parseFloat(data.TotalExpensesInterest || 0);
    
    return expenses;
}

// --- SERVER STARTUP ---
const serverInstance = server.listen(PORT, () => {
    const protocol = useHttps ? 'https' : 'http';
    console.log(`Server running on ${protocol}://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    serverInstance.close(() => {
        console.log('HTTP server closed');
    });
});

module.exports = app;
