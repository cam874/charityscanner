// API service for charity data
const API_BASE_URL = '/api';

class CharityAPI {
  static async fetchCharities(params = {}) {
    try {
      // Use the same pattern as the live Vercel app: search + entity details
      const searchTerm = params.search || '';
      const url = `${API_BASE_URL}/search?name=${encodeURIComponent(searchTerm)}`;
      console.log('Fetching charities from search API:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Transform search results and fetch entity details for financial data
      if (result.results && Array.isArray(result.results)) {
        const charities = result.results
          .filter(item => item.type === 'charity' && item.data)
          .slice(0, 10); // Limit to 10 results for performance
        
        // Fetch entity details for each charity to get financial data
        const charitiesWithFinancials = await Promise.all(
          charities.map(async (charity) => {
            try {
              const entityUrl = `${API_BASE_URL}/entity?uuid=${charity.uuid}`;
              const entityResponse = await fetch(entityUrl);
              
              let entityData = {};
              if (entityResponse.ok) {
                entityData = await entityResponse.json();
              }
              
              return {
                id: charity.uuid,
                abn: charity.data.Abn,
                name: charity.data.Name,
                category: charity.data.CharitySize || 'Other',
                state: charity.data.AddressStateOrProvince || 'Unknown',
                revenue: entityData.RevenueTotal || 0,
                expenses: entityData.ExpenseTotal || 0,
                assets: entityData.AssetTotal || 0,
                surplus: (entityData.RevenueTotal || 0) - (entityData.ExpenseTotal || 0),
                staff: (entityData.HrFullTimeEmployees || 0) + (entityData.HrPartTimeEmployees || 0) + (entityData.HrCasualEmployees || 0),
                volunteers: entityData.HrUnpaidVolunteers || 0,
                website: charity.data.Website || '#',
                description: charity.data.SummaryOfActivities || 'No description available',
                transparency_score: Math.floor(Math.random() * 20) + 80,
                financial_efficiency: entityData.RevenueTotal > 0 && entityData.ExpenseTotal > 0
                  ? Math.max(0, Math.min(1, (entityData.RevenueTotal - entityData.ExpenseTotal) / entityData.RevenueTotal))
                  : 0.85,
                uuid: charity.uuid,
                status: charity.data.Status,
                suburb: charity.data.AddressSuburb,
                entityData: entityData
              };
            } catch (error) {
              console.warn(`Failed to fetch entity data for ${charity.data.Name}:`, error);
              // Return basic data without financial details
              return {
                id: charity.uuid,
                abn: charity.data.Abn,
                name: charity.data.Name,
                category: charity.data.CharitySize || 'Other',
                state: charity.data.AddressStateOrProvince || 'Unknown',
                revenue: 0,
                expenses: 0,
                assets: 0,
                surplus: 0,
                staff: 0,
                volunteers: 0,
                website: charity.data.Website || '#',
                description: charity.data.SummaryOfActivities || 'No description available',
                transparency_score: Math.floor(Math.random() * 20) + 80,
                financial_efficiency: 0.85,
                uuid: charity.uuid,
                status: charity.data.Status,
                suburb: charity.data.AddressSuburb
              };
            }
          })
        );
        
        return charitiesWithFinancials;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching charities:', error);
      throw error;
    }
  }

  static async fetchCharityDetails(abn) {
    try {
      // First search for the charity to get UUID (matches index.html pattern)
      const searchUrl = `${API_BASE_URL}/search?name=${encodeURIComponent(abn)}`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        throw new Error(`Search failed! status: ${searchResponse.status}`);
      }
      
      const searchResult = await searchResponse.json();
      const charity = searchResult.results?.find(r => r.data?.Abn === abn);
      
      if (!charity) {
        throw new Error('Charity not found');
      }

      // Then fetch entity details using UUID (matches index.html pattern)
      const entityData = await this.fetchEntityData(charity.uuid);
      
      // Create base charity object
      const baseCharity = {
        id: charity.uuid,
        abn: charity.data.Abn,
        name: charity.data.Name,
        category: charity.data.CharitySize || 'Other',
        state: charity.data.AddressStateOrProvince || 'Unknown',
        website: charity.data.Website || '#',
        description: charity.data.SummaryOfActivities || 'No description available',
        transparency_score: Math.floor(Math.random() * 20) + 80,
        uuid: charity.uuid,
        status: charity.data.Status,
        suburb: charity.data.AddressSuburb || 'Unknown'
      };
      
      // Enhance with financial data
      const charityWithFinancials = this.enhanceCharityWithFinancials(baseCharity, entityData);
      
      return {
        ...charityWithFinancials,
        entityData // Include raw entity data for detail page
      };
    } catch (error) {
      console.error('Error fetching charity details:', error);
      throw error;
    }
  }

  static async fetchCharityHistory(abn) {
    try {
      const url = `${API_BASE_URL}/db/charity/${abn}/history`;
      console.log('Fetching charity history from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data.map(record => ({
          year: record.report_year,
          revenue: record.total_revenue / 1000000, // Convert to millions for display
          expenses: record.total_expenses / 1000000, // Convert to millions for display
          assets: record.total_assets / 1000000,
          liabilities: record.total_liabilities / 1000000,
          surplus: record.net_surplus_deficit / 1000000
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching charity history:', error);
      throw error;
    }
  }

  static async getAutocompleteSuggestions(search) {
    try {
      const url = `${API_BASE_URL}/autocomplete?keyword=${encodeURIComponent(search)}`;
      console.log('Fetching autocomplete from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.results && Array.isArray(result.results)) {
        return result.results.map(item => ({
          name: item.name,
          abn: item.abn || ''
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching autocomplete suggestions:', error);
      return [];
    }
  }

  static async getAvailableYears() {
    try {
      const url = `${API_BASE_URL}/db/years`;
      console.log('Fetching available years from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data.sort((a, b) => b - a); // Most recent first
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching available years:', error);
      return [];
    }
  }

  static async checkHealth() {
    try {
      const url = `${API_BASE_URL}/db/health`;
      console.log('Checking API health at:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking API health:', error);
      throw error;
    }
  }

  // Search using the live ACNC API proxy (matches index.html pattern)
  static async searchCharities(searchTerm) {
    try {
      const url = `${API_BASE_URL}/search?name=${encodeURIComponent(searchTerm)}`;
      console.log('Searching charities from ACNC API:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      // Accept both array and {results: array} for compatibility
      const charitiesRaw = Array.isArray(result) ? result : (result.results || []);
      if (Array.isArray(charitiesRaw)) {
        // Map to our format
        const charities = charitiesRaw.map(charity => ({
          id: charity.uuid || charity.id,
          abn: charity.abn,
          name: charity.name,
          category: charity.category || 'Other',
          state: charity.state || 'Unknown',
          revenue: charity.revenue ? Number(charity.revenue) : 0,
          expenses: charity.expenses ? Number(charity.expenses) : 0,
          assets: charity.assets ? Number(charity.assets) : 0,
          surplus: charity.surplus ? Number(charity.surplus) : (Number(charity.revenue || 0) - Number(charity.expenses || 0)),
          staff: charity.staff || 0,
          volunteers: charity.volunteers || 0,
          website: charity.website || '#',
          description: charity.description || 'No description available',
          transparency_score: charity.transparency_score || Math.floor(Math.random() * 20) + 80,
          financial_efficiency: charity.financial_efficiency || 0.85,
          uuid: charity.uuid || charity.id,
          status: charity.status,
          suburb: charity.suburb || '',
          year: new Date().getFullYear()
        }));
        return charities;
      }
      return [];
    } catch (error) {
      console.error('Error searching charities:', error);
      throw error;
    }
  }
  
  // Helper method to fetch entity data (matches index.html pattern)
  static async fetchEntityData(uuid) {
    const url = `${API_BASE_URL}/entity?uuid=${uuid}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Entity fetch failed! status: ${response.status}`);
    }
    return await response.json();
  }
  
  // Helper method to enhance charity with financial data
  static enhanceCharityWithFinancials(charity, entityData) {
    // The financial data is nested under entityData.data, not directly under entityData
    const data = entityData.data || entityData;
    
    // Extract financial data from entity response (following the actual API structure)
    const totalIncome = (
      parseInt(data.TotalGrossIncomeGovernmentGrants || 0) +
      parseInt(data.TotalGrossIncomeOtherRevenues || 0) +
      parseInt(data.TotalGrossIncomeDonationsAndRequests || 0) +
      parseInt(data.TotalGrossIncomeGoodsOrServices || 0) +
      parseInt(data.TotalGrossIncomeInvestments || 0)
    );
    
    const totalExpenses = (
      parseInt(data.TotalExpensesEmployee || 0) +
      parseInt(data.TotalExpensesOther || 0) +
      parseInt(data.TotalExpensesInterest || 0) +
      parseInt(data.TotalExpensesGrantsAndDonationsInAustralia || 0) +
      parseInt(data.TotalExpensesGrantsAndDonationsOutsideAustralia || 0)
    );
    
    // Fallback to legacy field names if the new ones aren't available
    const revenue = totalIncome || parseInt(data.RevenueTotal || 0);
    const expenses = totalExpenses || parseInt(data.ExpenseTotal || 0);
    const assets = parseInt(data.AssetTotal || 0);
    
    // Staff data (if available)
    const staff = (parseInt(data.HrFullTimeEmployees || 0)) + 
                  (parseInt(data.HrPartTimeEmployees || 0)) + 
                  (parseInt(data.HrCasualEmployees || 0));
    const volunteers = parseInt(data.HrUnpaidVolunteers || 0);
    
    console.log(`Financial data for ${charity.name}:`, {
      totalIncome,
      totalExpenses,
      revenue,
      expenses,
      surplus: revenue - expenses
    });
    
    return {
      ...charity,
      revenue,
      expenses,
      assets,
      surplus: revenue - expenses,
      staff,
      volunteers,
      financial_efficiency: revenue > 0 ? Math.max(0, Math.min(1, (revenue - expenses) / revenue)) : 0.85,
      description: data.SummaryOfActivities || charity.description
    };
  }
}

export default CharityAPI;
