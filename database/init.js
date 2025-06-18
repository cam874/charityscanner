const Database = require('better-sqlite3');
const path = require('path');

// Create database directory if it doesn't exist
const dbPath = path.join(__dirname, 'database', 'acnc_data.db');

function initializeDatabase() {
    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create charities table (core charity information)
    db.exec(`
        CREATE TABLE IF NOT EXISTS charities (
            abn TEXT PRIMARY KEY,
            charity_name TEXT NOT NULL,
            registration_status TEXT,
            charity_size TEXT,
            basic_religious_charity TEXT,
            charity_website TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create AIS reports table (annual financial data)
    db.exec(`
        CREATE TABLE IF NOT EXISTS ais_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            abn TEXT NOT NULL,
            report_year INTEGER NOT NULL,
            ais_due_date TEXT,
            date_ais_received TEXT,
            financial_report_date_received TEXT,
            fin_report_from TEXT,
            fin_report_to TEXT,
            conducted_activities TEXT,
            why_charity_did_not_conduct_activities TEXT,
            how_purposes_were_pursued TEXT,
            cash_or_accrual TEXT,
            type_of_financial_statement TEXT,
            report_consolidated TEXT,
            charity_report_has_modification TEXT,
            type_of_report_modification TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (abn) REFERENCES charities(abn),
            UNIQUE(abn, report_year)
        )
    `);
    
    // Create financial data table
    db.exec(`
        CREATE TABLE IF NOT EXISTS financial_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ais_report_id INTEGER NOT NULL,
            revenue_from_government REAL DEFAULT 0,
            donations_and_bequests REAL DEFAULT 0,
            revenue_from_goods_and_services REAL DEFAULT 0,
            revenue_from_investments REAL DEFAULT 0,
            all_other_revenue REAL DEFAULT 0,
            total_revenue REAL DEFAULT 0,
            other_income REAL DEFAULT 0,
            total_gross_income REAL DEFAULT 0,
            employee_expenses REAL DEFAULT 0,
            interest_expenses REAL DEFAULT 0,
            grants_and_donations_made_australia REAL DEFAULT 0,
            grants_and_donations_made_overseas REAL DEFAULT 0,
            all_other_expenses REAL DEFAULT 0,
            total_expenses REAL DEFAULT 0,
            net_surplus_deficit REAL DEFAULT 0,
            other_comprehensive_income REAL DEFAULT 0,
            total_comprehensive_income REAL DEFAULT 0,
            total_current_assets REAL DEFAULT 0,
            non_current_loans_receivable REAL DEFAULT 0,
            other_non_current_assets REAL DEFAULT 0,
            total_non_current_assets REAL DEFAULT 0,
            total_assets REAL DEFAULT 0,
            total_current_liabilities REAL DEFAULT 0,
            non_current_loans_payable REAL DEFAULT 0,
            other_non_current_liabilities REAL DEFAULT 0,
            total_non_current_liabilities REAL DEFAULT 0,
            total_liabilities REAL DEFAULT 0,
            net_assets_liabilities REAL DEFAULT 0,
            FOREIGN KEY (ais_report_id) REFERENCES ais_reports(id)
        )
    `);
    
    // Create staff data table
    db.exec(`
        CREATE TABLE IF NOT EXISTS staff_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ais_report_id INTEGER NOT NULL,
            staff_full_time INTEGER DEFAULT 0,
            staff_part_time INTEGER DEFAULT 0,
            staff_casual INTEGER DEFAULT 0,
            total_full_time_equivalent_staff REAL DEFAULT 0,
            staff_volunteers INTEGER DEFAULT 0,
            key_management_personnel TEXT,
            number_of_key_management_personnel INTEGER DEFAULT 0,
            total_paid_to_key_management_personnel REAL DEFAULT 0,
            FOREIGN KEY (ais_report_id) REFERENCES ais_reports(id)
        )
    `);
    
    // Create international activities table
    db.exec(`
        CREATE TABLE IF NOT EXISTS international_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ais_report_id INTEGER NOT NULL,
            international_activities_details TEXT,
            transferring_goods_or_services_overseas TEXT,
            operating_overseas_including_programs TEXT,
            other_international_activities TEXT,
            other_international_activities_description TEXT,
            FOREIGN KEY (ais_report_id) REFERENCES ais_reports(id)
        )
    `);
    
    // Create extended data table for fields that vary by year
    db.exec(`
        CREATE TABLE IF NOT EXISTS extended_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ais_report_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT,
            data_type TEXT DEFAULT 'text',
            FOREIGN KEY (ais_report_id) REFERENCES ais_reports(id)
        )
    `);
    
    // Create useful indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_charities_name ON charities(charity_name);
        CREATE INDEX IF NOT EXISTS idx_charities_size ON charities(charity_size);
        CREATE INDEX IF NOT EXISTS idx_ais_reports_year ON ais_reports(report_year);
        CREATE INDEX IF NOT EXISTS idx_ais_reports_abn_year ON ais_reports(abn, report_year);
        CREATE INDEX IF NOT EXISTS idx_financial_revenue ON financial_data(total_revenue);
        CREATE INDEX IF NOT EXISTS idx_financial_assets ON financial_data(total_assets);
        CREATE INDEX IF NOT EXISTS idx_extended_field ON extended_data(field_name);
    `);
    
    console.log('Database initialized successfully!');
    console.log(`Database location: ${dbPath}`);
    
    return db;
}

// Create database directory
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

module.exports = { initializeDatabase, dbPath };
