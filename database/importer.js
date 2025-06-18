const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { initializeDatabase } = require('./init');

class ACNCDataImporter {
    constructor() {
        this.db = initializeDatabase();
        
        // Prepare statements for better performance
        this.insertCharity = this.db.prepare(`
            INSERT OR REPLACE INTO charities (
                abn, charity_name, registration_status, charity_size, 
                basic_religious_charity, charity_website, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        this.insertAISReport = this.db.prepare(`
            INSERT OR REPLACE INTO ais_reports (
                abn, report_year, ais_due_date, date_ais_received, 
                financial_report_date_received, fin_report_from, fin_report_to,
                conducted_activities, why_charity_did_not_conduct_activities,
                how_purposes_were_pursued, cash_or_accrual, type_of_financial_statement,
                report_consolidated, charity_report_has_modification, type_of_report_modification
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        this.insertFinancialData = this.db.prepare(`
            INSERT OR REPLACE INTO financial_data (
                ais_report_id, revenue_from_government, donations_and_bequests,
                revenue_from_goods_and_services, revenue_from_investments, all_other_revenue,
                total_revenue, other_income, total_gross_income, employee_expenses,
                interest_expenses, grants_and_donations_made_australia, grants_and_donations_made_overseas,
                all_other_expenses, total_expenses, net_surplus_deficit, other_comprehensive_income,
                total_comprehensive_income, total_current_assets, non_current_loans_receivable,
                other_non_current_assets, total_non_current_assets, total_assets,
                total_current_liabilities, non_current_loans_payable, other_non_current_liabilities,
                total_non_current_liabilities, total_liabilities, net_assets_liabilities
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        this.insertStaffData = this.db.prepare(`
            INSERT OR REPLACE INTO staff_data (
                ais_report_id, staff_full_time, staff_part_time, staff_casual,
                total_full_time_equivalent_staff, staff_volunteers, key_management_personnel,
                number_of_key_management_personnel, total_paid_to_key_management_personnel
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        this.insertInternationalActivities = this.db.prepare(`
            INSERT OR REPLACE INTO international_activities (
                ais_report_id, international_activities_details,
                transferring_goods_or_services_overseas, operating_overseas_including_programs,
                other_international_activities, other_international_activities_description
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        this.insertExtendedData = this.db.prepare(`
            INSERT OR REPLACE INTO extended_data (
                ais_report_id, field_name, field_value, data_type
            ) VALUES (?, ?, ?, ?)
        `);
        
        this.getAISReportId = this.db.prepare(`
            SELECT id FROM ais_reports WHERE abn = ? AND report_year = ?
        `);
    }
    
    // Normalize column names across different years
    normalizeColumnName(colName) {
        if (!colName) return '';
        return colName.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
    
    // Parse CSV file
    parseCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        return data;
    }
    
    // Simple CSV line parser (handles basic cases)
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }
    
    // Parse Excel file
    parseExcel(filePath) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    }
    
    // Convert value to number if possible
    toNumber(value) {
        if (!value || value === '') return 0;
        const num = parseFloat(value.toString().replace(/[,$]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    
    // Convert value to integer if possible
    toInteger(value) {
        if (!value || value === '') return 0;
        const num = parseInt(value.toString().replace(/[,$]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    
    // Get financial field value with fallback for different year formats
    getFinancialField(row, year, fieldName) {
        // 2017+ uses consistent lowercase field names
        if (year >= 2017) {
            return this.toNumber(row[fieldName]);
        }
        
        // 2016 uses title case with some variations
        if (year === 2016) {
            const fieldMap = {
                'revenue from government': 'Revenue from government',
                'donations and bequests': 'Donations and bequests',
                'revenue from goods and services': 'Revenue from goods and services',
                'revenue from investments': 'Revenue from investments',
                'all other revenue': 'All other revenue',
                'total revenue': 'Total revenue',
                'other income': 'Other income',
                'total gross income': 'Total gross income',
                'employee expenses': 'Employee expenses',
                'interest expenses': 'Interest expenses',
                'grants and donations made for use in Australia': 'Grants and donations made for use in Australia',
                'grants and donations made for use outside Australia': 'Grants and donations made for use outside Australia',
                'all other expenses': 'All other expenses',
                'total expenses': 'Total expenses',
                'net surplus/deficit': 'Net surplus/deficit',
                'other comprehensive income': 'Other Comprehensive Income (if applicable)',
                'total comprehensive income': 'Total Comprehensive Income',
                'total current assets': 'Total current assets',
                'non-current loans receivable': 'Non-current loans receivable',
                'other non-current assets': 'Other non-current assets',
                'total non-current assets': 'Total non-current assets',
                'total assets': 'Total assets',
                'total current liabilities': 'Total current liabilities',
                'non-current loans payable': 'Non-current loans payable',
                'other non-current liabilities': 'Other non-current liabilities',
                'total non-current liabilities': 'Total non-current liabilities',
                'total liabilities': 'Total liabilities',
                'net assets/liabilities': 'Net assets/liabilities'
            };
            return this.toNumber(row[fieldMap[fieldName]]);
        }
        
        // 2013-2015 have very limited financial data
        return 0;
    }
    
    // Import data from a single file
    importFile(filePath, year) {
        console.log(`Importing ${filePath} for year ${year}...`);
        
        const extension = path.extname(filePath).toLowerCase();
        let data;
        
        if (extension === '.csv') {
            data = this.parseCSV(filePath);
        } else if (extension === '.xlsx') {
            data = this.parseExcel(filePath);
        } else {
            throw new Error(`Unsupported file format: ${extension}`);
        }
        
        console.log(`Found ${data.length} records`);
        
        // Start transaction for better performance
        const transaction = this.db.transaction(() => {
            let imported = 0;
            let errors = 0;
            
            for (const row of data) {
                try {
                    this.importRecord(row, year);
                    imported++;
                    
                    if (imported % 1000 === 0) {
                        console.log(`  Imported ${imported} records...`);
                    }
                } catch (error) {
                    errors++;
                    if (errors <= 5) { // Only log first 5 errors
                        console.error(`Error importing record:`, error.message);
                    }
                }
            }
            
            console.log(`Completed: ${imported} imported, ${errors} errors`);
        });
        
        transaction();
    }
    
    // Import a single record
    importRecord(row, year) {
        // Get ABN (handle different column names)
        const abn = row.abn || row.ABN || row['ABN'];
        if (!abn) return;
        
        // Insert charity data
        this.insertCharity.run(
            abn,
            row['charity name'] || row['Charity Name'] || row['Charity_Name'] || '',
            row['registration status'] || row['Registration Status'] || '',
            row['charity size'] || row['charity_size'] || '',
            row['basic religious charity'] || row['basic_religious_charity'] || '',
            row['charity website'] || row['charity_website'] || ''
        );
        
        // Insert AIS report
        this.insertAISReport.run(
            abn,
            year,
            row['ais due date'] || row['ais_due_date'] || '',
            row['date ais received'] || row['date_ais_received'] || '',
            row['financial report date received'] || row['financial_report_date_received'] || '',
            row['fin report from'] || row['fin_report_from'] || '',
            row['fin report to'] || row['fin_report_to'] || '',
            row['conducted activities'] || row['conducted_activities'] || '',
            row['why charity did not conduct activities'] || row['why_charity_did_not_conduct_activities'] || '',
            row['how purposes were pursued'] || row['how_purposes_were_pursued'] || '',
            row['cash or accrual'] || row['cash_or_accrual'] || '',
            row['type of financial statement'] || row['type_of_financial_statement'] || '',
            row['report consolidated with more than one entity'] || row['report_consolidated_with_more_than_one_entity'] || '',
            row['charity report has a modification'] || row['charity_report_has_a_modification'] || '',
            row['type of report modification'] || row['type_of_report_modification'] || ''
        );
        
        // Get the AIS report ID
        const aisReport = this.getAISReportId.get(abn, year);
        if (!aisReport) return;
        
        const aisReportId = aisReport.id;
        
        // Insert financial data
        this.insertFinancialData.run(
            aisReportId,
            this.getFinancialField(row, year, 'revenue from government'),
            this.getFinancialField(row, year, 'donations and bequests'),
            this.getFinancialField(row, year, 'revenue from goods and services'),
            this.getFinancialField(row, year, 'revenue from investments'),
            this.getFinancialField(row, year, 'all other revenue'),
            this.getFinancialField(row, year, 'total revenue'),
            this.getFinancialField(row, year, 'other income'),
            this.getFinancialField(row, year, 'total gross income'),
            this.getFinancialField(row, year, 'employee expenses'),
            this.getFinancialField(row, year, 'interest expenses'),
            this.getFinancialField(row, year, 'grants and donations made for use in Australia'),
            this.getFinancialField(row, year, 'grants and donations made for use outside Australia'),
            this.getFinancialField(row, year, 'all other expenses'),
            this.getFinancialField(row, year, 'total expenses'),
            this.getFinancialField(row, year, 'net surplus/deficit'),
            this.getFinancialField(row, year, 'other comprehensive income'),
            this.getFinancialField(row, year, 'total comprehensive income'),
            this.getFinancialField(row, year, 'total current assets'),
            this.getFinancialField(row, year, 'non-current loans receivable'),
            this.getFinancialField(row, year, 'other non-current assets'),
            this.getFinancialField(row, year, 'total non-current assets'),
            this.getFinancialField(row, year, 'total assets'),
            this.getFinancialField(row, year, 'total current liabilities'),
            this.getFinancialField(row, year, 'non-current loans payable'),
            this.getFinancialField(row, year, 'other non-current liabilities'),
            this.getFinancialField(row, year, 'total non-current liabilities'),
            this.getFinancialField(row, year, 'total liabilities'),
            this.getFinancialField(row, year, 'net assets/liabilities')
        );
        
        // Insert staff data
        this.insertStaffData.run(
            aisReportId,
            this.toInteger(row['staff - full time'] || row['staff_full_time']),
            this.toInteger(row['staff - part time'] || row['staff_part_time']),
            this.toInteger(row['staff - casual'] || row['staff_casual']),
            this.toNumber(row['total full time equivalent staff'] || row['total_full_time_equivalent_staff']),
            this.toInteger(row['staff - volunteers'] || row['staff_volunteers']),
            row['Key Management Personnel'] || row['key_management_personnel'] || '',
            this.toInteger(row['Number of Key Management Personnel'] || row['number_of_key_management_personnel']),
            this.toNumber(row['Total paid to Key Management Personnel'] || row['total_paid_to_key_management_personnel'])
        );
        
        // Insert international activities
        this.insertInternationalActivities.run(
            aisReportId,
            row['international activities details'] || row['international_activities_details'] || '',
            row['international activities undertaken - transferring goods or services overseas'] || '',
            row['international activities undertaken - operating overseas including programs'] || '',
            row['other international activities'] || row['other_international_activities'] || '',
            row['other international activities description'] || row['other_international_activities_description'] || ''
        );
        
        // Store any additional fields as extended data
        const coreFields = new Set([
            'abn', 'ABN', 'charity name', 'Charity Name', 'registration status', 'charity size',
            'basic religious charity', 'charity website', 'ais due date', 'date ais received',
            'financial report date received', 'fin report from', 'fin report to', 'conducted activities',
            'revenue from government', 'donations and bequests', 'total revenue', 'total expenses',
            'staff - full time', 'staff - part time', 'staff - volunteers'
        ]);
        
        for (const [key, value] of Object.entries(row)) {
            const normalizedKey = this.normalizeColumnName(key);
            if (!coreFields.has(key) && value && value.toString().trim() !== '') {
                this.insertExtendedData.run(aisReportId, normalizedKey, value.toString(), 'text');
            }
        }
    }
    
    close() {
        this.db.close();
    }
}

module.exports = ACNCDataImporter;
