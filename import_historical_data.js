const path = require('path');
const fs = require('fs');
const ACNCDataImporter = require('./database/importer');

async function importAllHistoricalData() {
    const dataDir = path.join(__dirname, '..', 'Historical Data Files');
    const importer = new ACNCDataImporter();
    
    console.log('Starting import of all historical ACNC data...');
    console.log(`Data directory: ${dataDir}`);
    
    // Map of filenames to years (only 2017+ when comprehensive financial reporting was required)
    const fileYearMap = {
        'datadotgov_ais17.xlsx': 2017,
        'datadotgov_ais18.xlsx': 2018,
        'datadotgov_ais19.csv': 2019,
        'datadotgov_ais20.csv': 2020,
        'datadotgov_ais21.csv': 2021,
        'datadotgov_ais22.csv': 2022,
        'datadotgov_ais23.csv': 2023
    };
    
    const startTime = Date.now();
    let totalImported = 0;
    
    for (const [filename, year] of Object.entries(fileYearMap)) {
        const filePath = path.join(dataDir, filename);
        
        if (fs.existsSync(filePath)) {
            console.log(`\n=== Processing ${filename} (Year ${year}) ===`);
            try {
                const fileStartTime = Date.now();
                importer.importFile(filePath, year);
                const fileEndTime = Date.now();
                console.log(`Completed ${filename} in ${(fileEndTime - fileStartTime) / 1000}s`);
                totalImported++;
            } catch (error) {
                console.error(`Error processing ${filename}:`, error.message);
            }
        } else {
            console.log(`⚠️  File not found: ${filename}`);
        }
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n🎉 Import completed!`);
    console.log(`Files processed: ${totalImported}`);
    console.log(`Total time: ${totalTime}s`);
    
    // Show some database statistics
    const db = importer.db;
    const charityCount = db.prepare('SELECT COUNT(*) as count FROM charities').get().count;
    const reportCount = db.prepare('SELECT COUNT(*) as count FROM ais_reports').get().count;
    const yearRange = db.prepare('SELECT MIN(report_year) as min_year, MAX(report_year) as max_year FROM ais_reports').get();
    
    console.log(`\n📊 Database Statistics:`);
    console.log(`Total charities: ${charityCount.toLocaleString()}`);
    console.log(`Total AIS reports: ${reportCount.toLocaleString()}`);
    console.log(`Year range: ${yearRange.min_year} - ${yearRange.max_year}`);
    
    // Show top 5 charities by total revenue
    const topCharities = db.prepare(`
        SELECT c.charity_name, c.abn, f.total_revenue, a.report_year
        FROM charities c
        JOIN ais_reports a ON c.abn = a.abn
        JOIN financial_data f ON a.id = f.ais_report_id
        WHERE f.total_revenue > 0
        ORDER BY f.total_revenue DESC
        LIMIT 5
    `).all();
    
    console.log(`\n🏆 Top 5 Charities by Revenue:`);
    topCharities.forEach((charity, i) => {
        console.log(`${i + 1}. ${charity.charity_name} (${charity.report_year}): $${charity.total_revenue.toLocaleString()}`);
    });
    
    importer.close();
}

// Run the import if this script is executed directly
if (require.main === module) {
    importAllHistoricalData().catch(console.error);
}

module.exports = { importAllHistoricalData };
