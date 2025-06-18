const Database = require('better-sqlite3');
const path = require('path');

class ACNCDatabase {
    constructor() {
        const dbPath = path.join(__dirname, 'acnc_data.db');
        console.log('Database path:', dbPath);
        try {
            this.db = new Database(dbPath, { readonly: true });
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection error:', error);
            throw error;
        }
    }
    
    // Search charities with filters
    searchCharities(options = {}) {
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
            SELECT DISTINCT c.abn, c.charity_name, c.charity_size, c.charity_website,
                   ar.report_year, fd.total_revenue, fd.total_assets, fd.net_surplus_deficit
            FROM charities c
            LEFT JOIN ais_reports ar ON c.abn = ar.abn
            LEFT JOIN financial_data fd ON ar.id = fd.ais_report_id
            WHERE 1=1
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
    }
    
    // Get charity details by ABN
    getCharityDetails(abn) {
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
    }
    
    // Get financial trends for a charity
    getFinancialTrends(abn) {
        return this.db.prepare(`
            SELECT ar.report_year, fd.total_revenue, fd.total_expenses, 
                   fd.net_surplus_deficit, fd.total_assets, fd.total_liabilities
            FROM ais_reports ar
            JOIN financial_data fd ON ar.id = fd.ais_report_id
            WHERE ar.abn = ?
            ORDER BY ar.report_year ASC
        `).all(abn);
    }
    
    // Get charity statistics by year
    getYearlyStats(year) {
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
    }
    
    // Get top charities by revenue for a year
    getTopCharities(year, limit = 10) {
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
    }
    
    // Get sector analysis (by charity size)
    getSectorAnalysis(year) {
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
    }
    
    // Get autocomplete suggestions
    getAutocompleteSuggestions(search, limit = 10) {
        return this.db.prepare(`
            SELECT DISTINCT charity_name, abn
            FROM charities
            WHERE charity_name LIKE ?
            ORDER BY charity_name
            LIMIT ?
        `).all(`%${search}%`, limit);
    }
    
    // Get available years
    getAvailableYears() {
        return this.db.prepare(`
            SELECT DISTINCT report_year 
            FROM ais_reports 
            ORDER BY report_year DESC
        `).all().map(row => row.report_year);
    }
    
    close() {
        this.db.close();
    }
}

module.exports = ACNCDatabase;
