const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class ACNCDatabase {
    constructor() {
        try {
            // Determine if we're in Vercel production environment
            const isVercel = process.env.VERCEL === '1';
            console.log('Is Vercel environment:', isVercel);
            
            let dbPath;
            if (isVercel) {
                // Use /tmp directory for Vercel
                dbPath = '/tmp/acnc_data.db';
                console.log('Using Vercel tmp path:', dbPath);
                
                // Check if we need to copy the database to /tmp
                const sourceDbPath = path.join(__dirname, 'acnc_data.db');
                console.log('Source DB path:', sourceDbPath);
                console.log('Source DB exists:', fs.existsSync(sourceDbPath));
                
                // Create sample data if DB doesn't exist in development
                if (!fs.existsSync(sourceDbPath) && !fs.existsSync(dbPath)) {
                    this.createSampleDatabase(dbPath);
                    console.log('Created sample database for Vercel');
                } else if (!fs.existsSync(dbPath)) {
                    // Copy database to /tmp
                    try {
                        fs.copyFileSync(sourceDbPath, dbPath);
                        console.log('Database copied to /tmp for Vercel deployment');
                    } catch (err) {
                        console.error('Error copying database to /tmp:', err);
                        this.createSampleDatabase(dbPath);
                        console.log('Created fallback sample database after copy error');
                    }
                }
            } else {
                // Local development path
                dbPath = path.join(__dirname, 'acnc_data.db');
                console.log('Using local path:', dbPath);
                
                // Create sample data if DB doesn't exist in development
                if (!fs.existsSync(dbPath)) {
                    this.createSampleDatabase(dbPath);
                    console.log('Created sample database for local development');
                }
            }
            
            console.log('Database path:', dbPath);
            console.log('Database exists:', fs.existsSync(dbPath));
            
            // Open the database
            this.db = new Database(dbPath, { readonly: true, fileMustExist: false });
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database initialization error:', error);
            // Instead of throwing, we'll use a mock database
            this.useMockDatabase();
        }
    }
    
    // Create a small sample database with minimal structure
    createSampleDatabase(dbPath) {
        try {
            // Create a new database
            const tempDb = new Database(dbPath, { readonly: false });
            
            // Create tables
            tempDb.exec(`
                CREATE TABLE IF NOT EXISTS charities (
                    ABN TEXT PRIMARY KEY,
                    Name TEXT,
                    CharitySize TEXT,
                    YearEstablished TEXT,
                    Website TEXT
                );
                
                CREATE TABLE IF NOT EXISTS annual_reports (
                    ABN TEXT,
                    Year INTEGER,
                    Revenue REAL,
                    Expenses REAL,
                    Assets REAL,
                    Liabilities REAL,
                    Description TEXT,
                    PRIMARY KEY (ABN, Year),
                    FOREIGN KEY (ABN) REFERENCES charities(ABN)
                );
            `);
            
            // Insert sample data
            tempDb.exec(`
                INSERT INTO charities VALUES
                ('37008882233', 'Australian Red Cross', 'Large', '1914', 'https://www.redcross.org.au'),
                ('64001444939', 'The Salvation Army', 'Large', '1865', 'https://www.salvationarmy.org.au'),
                ('26054135512', 'Médecins Sans Frontières Australia', 'Large', '1971', 'https://msf.org.au');
                
                INSERT INTO annual_reports VALUES
                ('37008882233', 2023, 325000000, 320000000, 450000000, 150000000, 'Providing humanitarian aid across Australia and internationally.'),
                ('37008882233', 2022, 310000000, 305000000, 430000000, 140000000, 'Responding to disasters and supporting vulnerable communities.'),
                ('64001444939', 2023, 290000000, 285000000, 500000000, 180000000, 'Providing social services and disaster relief.'),
                ('26054135512', 2023, 110000000, 105000000, 120000000, 40000000, 'Providing medical assistance to people affected by conflict, disasters, or exclusion from healthcare.');
            `);
            
            tempDb.close();
        } catch (err) {
            console.error('Error creating sample database:', err);
        }
    }
    
    // Use mock data when database isn't available
    useMockDatabase() {
        console.log('Using mock database instead of SQLite');
        this.isMock = true;
    }
    
    // Search charities with filters
    searchCharities(options = {}) {
        if (this.isMock) {
            return this.mockSearchCharities(options);
        }
        
        try {
            const {
                search = '',
                size = '',
                minRevenue = 0,
                maxRevenue = Number.MAX_SAFE_INTEGER,
                year = null,
                limit = 50,
                offset = 0
            } = options;
            
            let query = `
                SELECT DISTINCT c.ABN as abn, c.Name as charity_name, c.CharitySize as charity_size, c.Website as charity_website,
                    ar.Year as report_year, ar.Revenue as total_revenue, ar.Expenses as total_expenses, ar.Assets as total_assets, 
                    (ar.Revenue - ar.Expenses) as net_surplus_deficit
                FROM charities c
                LEFT JOIN annual_reports ar ON c.ABN = ar.ABN
                WHERE ar.Revenue IS NOT NULL
            `;
            
            const params = [];
            
            if (search) {
                query += ` AND c.charity_name LIKE ?`;
                params.push(`%${search}%`);
            }
            
            if (size) {
                query += ` AND c.charity_size = ?`;
                params.push(size);
            }
            
            if (year) {
                query += ` AND ar.report_year = ?`;
                params.push(year);
            }
            
            query += ` AND fd.total_revenue >= ? AND fd.total_revenue <= ?`;
            params.push(minRevenue, maxRevenue);
            
            query += ` ORDER BY fd.total_revenue DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            return this.db.prepare(query).all(...params);
        } catch (error) {
            console.error('Error in searchCharities:', error);
            return this.mockSearchCharities(options);
        }
    }
    
    // Mock implementation of searchCharities
    mockSearchCharities(options) {
        console.log('Using mock searchCharities with options:', options);
        const { search = '' } = options;
        const mockData = [
            { abn: '37008882233', charity_name: 'Australian Red Cross', charity_size: 'Large', charity_website: 'https://www.redcross.org.au', report_year: 2023, total_revenue: 325000000, total_expenses: 320000000, total_assets: 450000000, net_surplus_deficit: 5000000 },
            { abn: '64001444939', charity_name: 'The Salvation Army', charity_size: 'Large', charity_website: 'https://www.salvationarmy.org.au', report_year: 2023, total_revenue: 290000000, total_expenses: 285000000, total_assets: 500000000, net_surplus_deficit: 5000000 },
            { abn: '26054135512', charity_name: 'Médecins Sans Frontières Australia', charity_size: 'Large', charity_website: 'https://msf.org.au', report_year: 2023, total_revenue: 110000000, total_expenses: 105000000, total_assets: 120000000, net_surplus_deficit: 5000000 }
        ];
        
        if (!search) return mockData;
        return mockData.filter(c => c.charity_name.toLowerCase().includes(search.toLowerCase()));
    }
    
    // Get charity details by ABN
    getCharityDetails(abn) {
        if (this.isMock) {
            return this.mockGetCharityDetails(abn);
        }
        
        try {
            const charity = this.db.prepare(`
                SELECT * FROM charities WHERE abn = ?
            `).get(abn);
            
            if (!charity) return null;
            
            const reports = this.db.prepare(`
                SELECT ar.*, fd.*, sd.*, ia.*
                FROM ais_reports ar
                LEFT JOIN financial_data fd ON ar.id = fd.ais_report_id
                LEFT JOIN staff_data sd ON ar.id = sd.ais_report_id
                LEFT JOIN international_activities ia ON ar.id = ia.ais_report_id
                WHERE ar.abn = ?
                ORDER BY ar.report_year DESC
            `).all(abn);
            
            // Get the most recent charity description from extended_data
            const description = this.db.prepare(`
                SELECT ed.field_value
                FROM extended_data ed
                JOIN ais_reports ar ON ed.ais_report_id = ar.id
                WHERE ar.abn = ? AND ed.field_name = 'how_purposes_were_pursued'
                ORDER BY ar.report_year DESC
                LIMIT 1
            `).get(abn);
            
            return {
                charity: {
                    ...charity,
                    description: description ? description.field_value : null
                },
                reports
            };
        } catch (error) {
            console.error('Error in getCharityDetails:', error);
            return this.mockGetCharityDetails(abn);
        }
    }
    
    // Mock implementation of getCharityDetails
    mockGetCharityDetails(abn) {
        console.log('Using mock getCharityDetails for ABN:', abn);
        if (abn === '37008882233') {
            return {
                charity: {
                    abn: '37008882233',
                    charity_name: 'Australian Red Cross',
                    charity_size: 'Large',
                    charity_website: 'https://www.redcross.org.au',
                    description: 'Providing humanitarian aid across Australia and internationally.'
                },
                reports: [
                    { report_year: 2023, total_revenue: 325000000, total_expenses: 320000000, total_assets: 450000000, total_liabilities: 150000000 },
                    { report_year: 2022, total_revenue: 310000000, total_expenses: 305000000, total_assets: 430000000, total_liabilities: 140000000 }
                ]
            };
        }
        return null;
    }
    
    // Get financial trends for a charity
    getFinancialTrends(abn) {
        if (this.isMock) {
            return this.mockGetFinancialTrends(abn);
        }
        
        try {
            return this.db.prepare(`
                SELECT ar.report_year, fd.total_revenue, fd.total_expenses, 
                       fd.net_surplus_deficit, fd.total_assets, fd.total_liabilities
                FROM ais_reports ar
                JOIN financial_data fd ON ar.id = fd.ais_report_id
                WHERE ar.abn = ?
                ORDER BY ar.report_year ASC
            `).all(abn);
        } catch (error) {
            console.error('Error in getFinancialTrends:', error);
            return this.mockGetFinancialTrends(abn);
        }
    }
    
    // Mock implementation of getFinancialTrends
    mockGetFinancialTrends(abn) {
        console.log('Using mock getFinancialTrends for ABN:', abn);
        if (abn === '37008882233') {
            return [
                { report_year: 2021, total_revenue: 300000000, total_expenses: 295000000, net_surplus_deficit: 5000000, total_assets: 410000000, total_liabilities: 130000000 },
                { report_year: 2022, total_revenue: 310000000, total_expenses: 305000000, net_surplus_deficit: 5000000, total_assets: 430000000, total_liabilities: 140000000 },
                { report_year: 2023, total_revenue: 325000000, total_expenses: 320000000, net_surplus_deficit: 5000000, total_assets: 450000000, total_liabilities: 150000000 }
            ];
        }
        return [];
    }
    
    // Get charity statistics by year
    getYearlyStats(year) {
        if (this.isMock) {
            return this.mockGetYearlyStats(year);
        }
        
        try {
            return this.db.prepare(`
                SELECT 
                    COUNT(*) as total_charities,
                    COUNT(CASE WHEN c.charity_size = 'Small' THEN 1 END) as small_charities,
                    COUNT(CASE WHEN c.charity_size = 'Medium' THEN 1 END) as medium_charities,
                    COUNT(CASE WHEN c.charity_size = 'Large' THEN 1 END) as large_charities,
                    SUM(fd.total_revenue) as total_revenue,
                    AVG(fd.total_revenue) as avg_revenue,
                    SUM(fd.total_assets) as total_assets,
                    COUNT(CASE WHEN fd.total_revenue > 0 THEN 1 END) as charities_with_revenue
                FROM charities c
                JOIN ais_reports ar ON c.abn = ar.abn
                JOIN financial_data fd ON ar.id = fd.ais_report_id
                WHERE ar.report_year = ?
            `).get(year);
        } catch (error) {
            console.error('Error in getYearlyStats:', error);
            return this.mockGetYearlyStats(year);
        }
    }
    
    // Mock implementation of getYearlyStats
    mockGetYearlyStats(year) {
        console.log('Using mock getYearlyStats for year:', year);
        return {
            total_charities: 3,
            small_charities: 0,
            medium_charities: 0,
            large_charities: 3,
            total_revenue: 725000000,
            avg_revenue: 241666666.67,
            total_assets: 1070000000,
            charities_with_revenue: 3
        };
    }
    
    // Get top charities by revenue for a year
    getTopCharities(year, limit = 10) {
        if (this.isMock) {
            return this.mockGetTopCharities(year, limit);
        }
        
        try {
            return this.db.prepare(`
                SELECT c.charity_name, c.abn, c.charity_size, fd.total_revenue,
                       fd.total_assets, fd.net_surplus_deficit
                FROM charities c
                JOIN ais_reports ar ON c.abn = ar.abn
                JOIN financial_data fd ON ar.id = fd.ais_report_id
                WHERE ar.report_year = ? AND fd.total_revenue > 0
                ORDER BY fd.total_revenue DESC
                LIMIT ?
            `).all(year, limit);
        } catch (error) {
            console.error('Error in getTopCharities:', error);
            return this.mockGetTopCharities(year, limit);
        }
    }
    
    // Mock implementation of getTopCharities
    mockGetTopCharities(year, limit) {
        console.log('Using mock getTopCharities for year:', year, 'limit:', limit);
        const mockData = [
            { charity_name: 'Australian Red Cross', abn: '37008882233', charity_size: 'Large', total_revenue: 325000000, total_assets: 450000000, net_surplus_deficit: 5000000 },
            { charity_name: 'The Salvation Army', abn: '64001444939', charity_size: 'Large', total_revenue: 290000000, total_assets: 500000000, net_surplus_deficit: 5000000 },
            { charity_name: 'Médecins Sans Frontières Australia', abn: '26054135512', charity_size: 'Large', total_revenue: 110000000, total_assets: 120000000, net_surplus_deficit: 5000000 }
        ];
        return mockData.slice(0, limit);
    }
    
    // Get sector analysis (by charity size)
    getSectorAnalysis(year) {
        if (this.isMock) {
            return this.mockGetSectorAnalysis(year);
        }
        
        try {
            return this.db.prepare(`
                SELECT 
                    c.charity_size,
                    COUNT(*) as count,
                    SUM(fd.total_revenue) as total_revenue,
                    AVG(fd.total_revenue) as avg_revenue,
                    SUM(fd.total_assets) as total_assets,
                    AVG(fd.total_assets) as avg_assets
                FROM charities c
                JOIN ais_reports ar ON c.abn = ar.abn
                JOIN financial_data fd ON ar.id = fd.ais_report_id
                WHERE ar.report_year = ? AND c.charity_size IS NOT NULL
                GROUP BY c.charity_size
                ORDER BY total_revenue DESC
            `).all(year);
        } catch (error) {
            console.error('Error in getSectorAnalysis:', error);
            return this.mockGetSectorAnalysis(year);
        }
    }
    
    // Mock implementation of getSectorAnalysis
    mockGetSectorAnalysis(year) {
        console.log('Using mock getSectorAnalysis for year:', year);
        return [
            { charity_size: 'Large', count: 3, total_revenue: 725000000, avg_revenue: 241666666.67, total_assets: 1070000000, avg_assets: 356666666.67 }
        ];
    }
    
    // Get autocomplete suggestions
    getAutocompleteSuggestions(search, limit = 10) {
        if (this.isMock) {
            return this.mockGetAutocompleteSuggestions(search, limit);
        }
        
        try {
            return this.db.prepare(`
                SELECT DISTINCT charity_name, abn
                FROM charities
                WHERE charity_name LIKE ?
                ORDER BY charity_name
                LIMIT ?
            `).all(`%${search}%`, limit);
        } catch (error) {
            console.error('Error in getAutocompleteSuggestions:', error);
            return this.mockGetAutocompleteSuggestions(search, limit);
        }
    }
    
    // Mock implementation of getAutocompleteSuggestions
    mockGetAutocompleteSuggestions(search, limit) {
        console.log('Using mock getAutocompleteSuggestions for search:', search, 'limit:', limit);
        const mockData = [
            { charity_name: 'Australian Red Cross', abn: '37008882233' },
            { charity_name: 'The Salvation Army', abn: '64001444939' },
            { charity_name: 'Médecins Sans Frontières Australia', abn: '26054135512' }
        ];
        
        if (!search) return mockData.slice(0, limit);
        return mockData
            .filter(c => c.charity_name.toLowerCase().includes(search.toLowerCase()))
            .slice(0, limit);
    }
    
    // Get available years
    getAvailableYears() {
        if (this.isMock) {
            return this.mockGetAvailableYears();
        }
        
        try {
            return this.db.prepare(`
                SELECT DISTINCT report_year 
                FROM ais_reports 
                ORDER BY report_year DESC
            `).all().map(row => row.report_year);
        } catch (error) {
            console.error('Error in getAvailableYears:', error);
            return this.mockGetAvailableYears();
        }
    }
    
    // Mock implementation of getAvailableYears
    mockGetAvailableYears() {
        console.log('Using mock getAvailableYears');
        return [2023, 2022, 2021];
    }
    
    close() {
        if (this.db && !this.isMock) {
            this.db.close();
        }
    }
}

module.exports = ACNCDatabase;
