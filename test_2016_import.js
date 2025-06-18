const ACNCDataImporter = require('./acnc-finder/database/importer');
const path = require('path');

async function testImport2016() {
    console.log('Testing 2016 import with updated field mapping...');
    
    const importer = new ACNCDataImporter();
    const filePath = path.join(__dirname, 'Historical Data Files', 'datadotgov_ais16.xlsx');
    
    try {
        // Clear existing 2016 data first
        importer.db.prepare('DELETE FROM financial_data WHERE ais_report_id IN (SELECT id FROM ais_reports WHERE report_year = 2016)').run();
        importer.db.prepare('DELETE FROM ais_reports WHERE report_year = 2016').run();
        console.log('Cleared existing 2016 data');
        
        // Import 2016 data
        importer.importFile(filePath, 2016);
        
        // Check results
        const stats = importer.db.prepare(`
            SELECT COUNT(*) as total_reports,
                   COUNT(CASE WHEN fd.total_revenue > 0 THEN 1 END) as with_revenue,
                   ROUND(AVG(fd.total_revenue)) as avg_revenue
            FROM ais_reports ar 
            LEFT JOIN financial_data fd ON ar.id = fd.ais_report_id 
            WHERE ar.report_year = 2016
        `).get();
        
        console.log('2016 Results:');
        console.log(`- Total reports: ${stats.total_reports}`);
        console.log(`- With revenue data: ${stats.with_revenue}`);
        console.log(`- Average revenue: $${(stats.avg_revenue || 0).toLocaleString()}`);
        
        // Test specific charity
        const hutt = importer.db.prepare(`
            SELECT ar.abn, c.charity_name, fd.total_revenue, fd.total_expenses, fd.total_assets
            FROM ais_reports ar 
            JOIN charities c ON ar.abn = c.abn
            LEFT JOIN financial_data fd ON ar.id = fd.ais_report_id 
            WHERE ar.report_year = 2016 AND ar.abn = '75055179354'
        `).get();
        
        if (hutt) {
            console.log('\nHutt Street Centre 2016 data:');
            console.log(`- Revenue: $${(hutt.total_revenue || 0).toLocaleString()}`);
            console.log(`- Expenses: $${(hutt.total_expenses || 0).toLocaleString()}`);
            console.log(`- Assets: $${(hutt.total_assets || 0).toLocaleString()}`);
        }
        
    } catch (error) {
        console.error('Import error:', error.message);
    }
}

testImport2016();
