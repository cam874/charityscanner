const ACNCDatabase = require('./queries');

async function checkDatabase() {
    const db = new ACNCDatabase();
    
    // Check total number of charities
    const charityCount = db.db.prepare('SELECT COUNT(*) as count FROM charities').get().count;
    console.log(`Total charities in database: ${charityCount}`);
    
    // Check year range of data
    const yearRange = db.db.prepare('SELECT MIN(report_year) as min_year, MAX(report_year) as max_year FROM ais_reports').get();
    console.log(`Data year range: ${yearRange.min_year} - ${yearRange.max_year}`);
    
    // Check a sample charity
    const sampleCharity = db.searchCharities({ limit: 1 })[0];
    if (sampleCharity) {
        console.log('\nSample charity data:');
        console.log(sampleCharity);
        
        const details = db.getCharityDetails(sampleCharity.abn);
        console.log('\nCharity details:');
        console.log(details);
        
        const trends = db.getFinancialTrends(sampleCharity.abn);
        console.log('\nFinancial trends:');
        console.log(trends);
    }
}

checkDatabase().catch(console.error);
