import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Moon, Sun, X, Check, ChevronsUpDown, Info, ArrowLeft, PlusCircle, MinusCircle, LayoutDashboard, List, HelpingHand, DollarSign, TrendingDown, TrendingUp, PieChart, BarChart3, Target, Shield, FileText, Calendar, Users, Globe, Award, Briefcase, BookOpen, Download, ExternalLink, AlertTriangle, CheckCircle, Clock, MapPin, Phone, Mail, Building2 } from 'lucide-react';
import CharityAPI from './services/api';
import './index.css';

// --- MAGIC UI & ANIMATION STYLES ---
const मैजिकUICSS = `
@keyframes meteor {
    0% { transform: rotate(215deg) translateX(0); opacity: 1; }
    70% { opacity: 1; }
    100% { transform: rotate(215deg) translateX(-500px); opacity: 0; }
}
@keyframes shimmer {
    0%, 90%, 100% {
      background-position: calc(-100% - var(--shimmer-width)) 0;
    }
    30%, 60% {
      background-position: calc(100% + var(--shimmer-width)) 0;
    }
}
@keyframes shine {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
@keyframes blur-in {
    0% { filter: blur(10px); opacity: 0; }
    100% { filter: blur(0px); opacity: 1; }
}
`;

// --- MOCK DATA ---
const mockCharities = [
    { id: '1', abn: '11123456789', name: 'Australian Red Cross', category: 'Humanitarian', state: 'National', revenue: 1050000000, expenses: 980000000, staff: 3200, volunteers: 35000, website: 'https://www.redcross.org.au', description: 'Providing relief in times of crisis and care when its needed most.', transparency_score: 95, financial_efficiency: 0.93, historical_data: [ { year: 2020, revenue: 950, expenses: 880 }, { year: 2021, revenue: 1000, expenses: 920 }, { year: 2022, revenue: 1020, expenses: 950 }, { year: 2023, revenue: 1050, expenses: 980 } ] },
    { id: '2', abn: '22987654321', name: 'The Smith Family', category: 'Children & Youth', state: 'National', revenue: 145000000, expenses: 125000000, staff: 850, volunteers: 8000, website: 'https://www.thesmithfamily.com.au', description: 'A national charity helping young Australians from disadvantaged backgrounds succeed at school.', transparency_score: 92, financial_efficiency: 0.86, historical_data: [ { year: 2020, revenue: 130, expenses: 110 }, { year: 2021, revenue: 135, expenses: 115 }, { year: 2022, revenue: 140, expenses: 120 }, { year: 2023, revenue: 145, expenses: 125 } ] },
    { id: '3', abn: '33111222333', name: 'RSPCA Australia', category: 'Animal Welfare', state: 'National', revenue: 175000000, expenses: 168000000, staff: 1200, volunteers: 5000, website: 'https://www.rspca.org.au', description: 'Australia\'s leading animal welfare organisation and one of Australia\'s most trusted charities.', transparency_score: 88, financial_efficiency: 0.96, historical_data: [ { year: 2020, revenue: 160, expenses: 155 }, { year: 2021, revenue: 165, expenses: 160 }, { year: 2022, revenue: 170, expenses: 165 }, { year: 2023, revenue: 175, expenses: 168 } ] },
    { id: '4', abn: '44555666777', name: 'OzHarvest', category: 'Food Rescue', state: 'National', revenue: 25000000, expenses: 22000000, staff: 200, volunteers: 2500, website: 'https://www.ozharvest.org', description: 'Rescuing surplus food to feed people in need across Australia.', transparency_score: 98, financial_efficiency: 0.88, historical_data: [ { year: 2020, revenue: 20, expenses: 18 }, { year: 2021, revenue: 22, expenses: 20 }, { year: 2022, revenue: 23, expenses: 21 }, { year: 2023, revenue: 25, expenses: 22 } ] },
    { id: '5', abn: '55888999000', name: 'Clean Up Australia', category: 'Environment', state: 'National', revenue: 8500000, expenses: 7800000, staff: 45, volunteers: 750000, website: 'https://www.cleanup.org.au', description: 'Inspiring and empowering communities to clean up, fix up and conserve our environment.', transparency_score: 91, financial_efficiency: 0.92, historical_data: [ { year: 2020, revenue: 7, expenses: 6.5 }, { year: 2021, revenue: 7.5, expenses: 7 }, { year: 2022, revenue: 8, expenses: 7.5 }, { year: 2023, revenue: 8.5, expenses: 7.8 } ] },
    { id: '6', abn: '66123123123', name: 'SA Bushfire Appeal', category: 'Disaster Relief', state: 'SA', revenue: 12000000, expenses: 11000000, staff: 15, volunteers: 500, website: '#', description: 'Supporting communities in South Australia affected by bushfires.', transparency_score: 85, financial_efficiency: 0.91, historical_data: [ { year: 2020, revenue: 15, expenses: 14 }, { year: 2021, revenue: 10, expenses: 9 }, { year: 2022, revenue: 11, expenses: 10 }, { year: 2023, revenue: 12, expenses: 11 } ] }
];

const categories = ['All', 'Large', 'Medium', 'Small', 'Humanitarian', 'Children & Youth', 'Animal Welfare', 'Food Rescue', 'Environment', 'Disaster Relief'];
const states = ['All', 'National', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

// --- CONTEXT PROVIDERS ---
const ThemeContext = createContext();
const ComparisonContext = createContext();
const NavigationContext = createContext();

// --- HELPER FUNCTIONS & HOOKS ---
const formatCurrency = (value) => {
    if (Math.abs(value) >= 1.0e+9) return `$${(Math.abs(value) / 1.0e+9).toFixed(2)}B`;
    if (Math.abs(value) >= 1.0e+6) return `$${(Math.abs(value) / 1.0e+6).toFixed(1)}M`;
    if (Math.abs(value) >= 1.0e+3) return `$${(Math.abs(value) / 1.0e+3).toFixed(0)}K`;
    return `$${Math.abs(value)}`;
};

const formatNumber = (value) => {
    return new Intl.NumberFormat('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const useTheme = () => useContext(ThemeContext);
const useComparison = () => useContext(ComparisonContext);
const useNavigation = () => useContext(NavigationContext);

// --- PROVIDER COMPONENTS ---
const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');
    useEffect(() => { const root = window.document.documentElement; root.classList.remove('light', 'dark'); root.classList.add(theme); }, [theme]);
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
const ComparisonProvider = ({ children }) => {
    const [comparisonList, setComparisonList] = useState([]);
    const toggleCompare = (charity) => setComparisonList(prev => prev.some(c => c.id === charity.id) ? prev.filter(c => c.id !== charity.id) : [...prev, charity]);
    const clearComparison = () => setComparisonList([]);
    return <ComparisonContext.Provider value={{ comparisonList, toggleCompare, clearComparison }}>{children}</ComparisonContext.Provider>;
};
const NavigationProvider = ({ children }) => {
    const [route, setRoute] = useState({ page: 'landing', data: null });
    const navigate = useCallback((newRoute) => { setRoute(newRoute); window.scrollTo(0, 0); }, []);
    return <NavigationContext.Provider value={{ route, navigate }}>{children}</NavigationContext.Provider>;
}

// --- MAIN APP COMPONENT ---
export default function App() {
    return (
        <ThemeProvider>
            <style>{मैजिकUICSS}</style>
            <ComparisonProvider>
                <NavigationProvider>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col"><AppContent /></div>
                </NavigationProvider>
            </ComparisonProvider>
        </ThemeProvider>
    );
}

const AppContent = () => {
    const { route } = useNavigation();
    const renderPage = () => {
        switch (route.page) {
            case 'landing': return <LandingPage />;
            case 'search': return <SearchPage />;
            case 'charityDetail': return <CharityDetailPage charity={route.data} />;
            case 'compare': return <ComparePage />;
            case 'about': return <AboutPage />;
            default: return <LandingPage />;
        }
    };
    return <><Header /><main className="flex-grow">{renderPage()}</main><Footer /></>;
}

// --- STANDARD UI COMPONENTS ---
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    const variants = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus-visible:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-50 dark:hover:bg-gray-600 focus-visible:ring-gray-400',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-gray-400',
        destructive: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 focus-visible:ring-red-500',
        outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-gray-400',
    };
    const sizes = { default: 'h-10 py-2 px-4', sm: 'h-9 px-3 rounded-md', lg: 'h-11 px-8 rounded-md', icon: 'h-10 w-10' };
    return ( <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} {...props}>{children}</button> );
};

// --- ICONS (from lucide-react) ---
// Already imported: Search, Moon, Sun, X, Check, ChevronsUpDown, Info, ArrowLeft, PlusCircle, MinusCircle, LayoutDashboard, List, HelpingHand
// No need to redefine, just use as imported.

// --- PAGE COMPONENTS ---
const LandingPage = () => {
    const { navigate } = useNavigation();
    return (
        <div className="flex-grow">
            <section className="relative overflow-hidden py-20 md:py-32 bg-white dark:bg-gray-900">
                <div className="absolute inset-0 z-0">
                    <Meteors number={30} />
                </div>
                <div className="container mx-auto px-4 text-center relative z-10">
                    <Badge variant="success" className="mb-4">Magic UI Edition</Badge>
                    <AnimatedShinyText>Informed Giving, Simplified.</AnimatedShinyText>
                    <BlurIn>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300">
                            Search, compare, and evaluate Australian charities with verified data. Make your donations count.
                        </p>
                    </BlurIn>
                    <ShimmerButton onClick={() => navigate({ page: 'search' })} className="mt-8">
                        <Search className="mr-2 h-5 w-5" /> Start Searching
                    </ShimmerButton>
                </div>
            </section>
            <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="p-6"><LayoutDashboard className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-500" /><h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Impact Dashboards</h3><p className="mt-2 text-gray-600 dark:text-gray-400">Visualize a charity's financial health, efficiency, and scale at a glance.</p></div>
                        <div className="p-6"><List className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-500" /><h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Side-by-Side Comparison</h3><p className="mt-2 text-gray-600 dark:text-gray-400">Compare multiple charities on key metrics to find the best fit for your values.</p></div>
                        <div className="p-6"><Check className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-500" /><h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Transparency Indicators</h3><p className="mt-2 text-gray-600 dark:text-gray-400">Access annual reports and see transparency scores based on public data.</p></div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const SearchPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [charities, setCharities] = useState([]);
    const [filteredCharities, setFilteredCharities] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: 'All', state: 'All' });
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Search function that uses the API
    const performSearch = async (term) => {
        if (!term.trim()) {
            setError('Please enter a search term');
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        
        try {
            const charityData = await CharityAPI.searchCharities(term);
            setCharities(charityData);
            setFilteredCharities(charityData);
        } catch (error) {
            console.error('Failed to search charities:', error);
            setError('Failed to search charities. Please try again.');
            setCharities([]);
            setFilteredCharities([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = useCallback((filterName, value) => { 
        setFilters(prev => ({...prev, [filterName]: value})); 
    }, []);
    
    const handleSearchChange = useCallback((value) => { 
        setSearchTerm(value); 
    }, []);

    const handleSearchSubmit = useCallback(() => {
        performSearch(searchTerm);
    }, [searchTerm]);
    
    useEffect(() => {
        let result = charities.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.abn.includes(searchTerm)
        );
        if (filters.category !== 'All') result = result.filter(c => c.category === filters.category);
        if (filters.state !== 'All') result = result.filter(c => c.state === filters.state || c.state === 'National');
        setFilteredCharities(result);
    }, [searchTerm, filters, charities]);

    return (
        <div className="container mx-auto px-4 py-8 flex-grow">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Find a Charity</h1>
                </div>
                
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        {error}
                    </div>
                )}
                
                <div className="space-y-4">
                    <SearchBar 
                        onSearchChange={handleSearchChange} 
                        onSearchSubmit={handleSearchSubmit}
                        placeholder="Search for a charity (e.g., 'Red Cross', 'Cancer', 'Community')"
                    />
                    <FilterPanel onFilterChange={handleFilterChange} />
                </div>
                
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <SkeletonLoader key={i} className="h-[420px]" />)}
                    </div>
                ) : hasSearched ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCharities.length > 0 ? (
                            filteredCharities.map(charity => <CharityCard key={charity.id} charity={charity} />)
                        ) : (
                            <div className="md:col-span-2 lg:col-span-3 text-center py-16">
                                <p className="text-gray-500 dark:text-gray-400">
                                    No charities found. Try adjusting your search or filters.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Search for Australian Charities
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Enter a charity name, cause, or location to get started
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                            <button 
                                onClick={() => { setSearchTerm('Cancer'); performSearch('Cancer'); }}
                                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                            >
                                <h3 className="font-semibold text-blue-900">Health & Medical</h3>
                                <p className="text-sm text-blue-700">Cancer, medical research, hospitals</p>
                            </button>
                            <button 
                                onClick={() => { setSearchTerm('Community'); performSearch('Community'); }}
                                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                            >
                                <h3 className="font-semibold text-green-900">Community</h3>
                                <p className="text-sm text-green-700">Local communities, support services</p>
                            </button>
                            <button 
                                onClick={() => { setSearchTerm('Environment'); performSearch('Environment'); }}
                                className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                            >
                                <h3 className="font-semibold text-emerald-900">Environment</h3>
                                <p className="text-sm text-emerald-700">Conservation, sustainability</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CharityDetailPage = ({ charity }) => {
    const { navigate } = useNavigation();
    const { toggleCompare, comparisonList } = useComparison();
    const [charityDetails, setCharityDetails] = useState(charity || null);
    const [historicalData, setHistoricalData] = useState([]);
    const [isLoading, setIsLoading] = useState(!charity);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const isInComparison = comparisonList.some(c => c.id === charityDetails?.id);

    useEffect(() => {
        const fetchDetails = async () => {
            if (charity?.abn) {
                setIsLoading(true);
                setError(null);
                
                try {
                    // Fetch detailed charity information
                    const details = await CharityAPI.fetchCharityDetails(charity.abn);
                    if (details) {
                        setCharityDetails(details);
                    }
                    
                    // Fetch historical data for charts
                    const history = await CharityAPI.fetchCharityHistory(charity.abn);
                    setHistoricalData(history);
                } catch (error) {
                    console.error('Failed to fetch charity details:', error);
                    setError('Failed to load charity details. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchDetails();
    }, [charity?.abn]);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 flex-grow">
                <Button onClick={() => navigate({ page: 'search' })} variant="ghost" className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Search
                </Button>
                <div className="space-y-6">
                    <SkeletonLoader className="h-12 w-96" />
                    <SkeletonLoader className="h-64" />
                    <SkeletonLoader className="h-64" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 flex-grow">
                <Button onClick={() => navigate({ page: 'search' })} variant="ghost" className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Search
                </Button>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    <h2 className="text-xl font-semibold mb-2">Error Loading Charity Details</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!charityDetails) {
        return (
            <div className="container mx-auto px-4 py-8 flex-grow">
                <Button onClick={() => navigate({ page: 'search' })} variant="ghost" className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Search
                </Button>
                <div className="text-center py-16">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Charity Not Found</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">The requested charity could not be found.</p>
                </div>
            </div>
        );
    }

    const surplus = charityDetails.revenue - charityDetails.expenses;
    const efficiencyRatio = charityDetails.revenue > 0 ? (charityDetails.expenses / charityDetails.revenue) * 100 : 0;

    return (
        <div className="container mx-auto px-4 py-8 flex-grow">
            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-6">
                <Button onClick={() => navigate({ page: 'search' })} variant="ghost">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Search
                </Button>
                <Button 
                    onClick={() => toggleCompare(charityDetails)} 
                    variant={isInComparison ? "secondary" : "default"}
                    className="flex items-center gap-2"
                >
                    {isInComparison ? <MinusCircle className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                    {isInComparison ? 'Remove from Compare' : 'Add to Compare'}
                </Button>
            </div>
            
            <div className="space-y-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-4xl font-extrabold mb-2">{charityDetails.name}</h1>
                            <p className="text-blue-100 mb-4">{charityDetails.category} • {charityDetails.state}</p>
                            <div className="flex items-center gap-4">
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    ABN: {charityDetails.abn}
                                </Badge>
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    {charityDetails.status || 'Active'}
                                </Badge>
                            </div>
                        </div>
                        <div className="mt-6 lg:mt-0 lg:ml-8">
                            <div className="text-right">
                                <div className="text-3xl font-bold">{Math.round(charityDetails.transparency_score || 85)}%</div>
                                <div className="text-blue-100">Transparency Score</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                        title="Total Revenue" 
                        value={formatCurrency(charityDetails.revenue)} 
                        icon={DollarSign}
                        color="blue"
                        trend={historicalData.length > 1 ? ((charityDetails.revenue - historicalData[historicalData.length - 2]?.revenue) / historicalData[historicalData.length - 2]?.revenue * 100) : null}
                    />
                    <MetricCard 
                        title="Total Expenses" 
                        value={formatCurrency(charityDetails.expenses)} 
                        icon={TrendingDown}
                        color="red"
                        trend={historicalData.length > 1 ? ((charityDetails.expenses - historicalData[historicalData.length - 2]?.expenses) / historicalData[historicalData.length - 2]?.expenses * 100) : null}
                    />
                    <MetricCard 
                        title="Net Surplus" 
                        value={formatCurrency(surplus)} 
                        icon={surplus >= 0 ? TrendingUp : TrendingDown}
                        color={surplus >= 0 ? "green" : "red"}
                        subtitle={surplus >= 0 ? "Positive surplus" : "Operating deficit"}
                    />
                    <MetricCard 
                        title="Efficiency Ratio" 
                        value={`${efficiencyRatio.toFixed(1)}%`} 
                        icon={PieChart}
                        color="purple"
                        subtitle="Expenses vs Revenue"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'overview', label: 'Overview', icon: BarChart3 },
                                { id: 'financials', label: 'Financial Analysis', icon: DollarSign },
                                { id: 'programs', label: 'Programs & Impact', icon: Target },
                                { id: 'governance', label: 'Governance', icon: Shield },
                                { id: 'reports', label: 'Reports & Documents', icon: FileText }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <CharityOverviewTab charityDetails={charityDetails} historicalData={historicalData} />
                        )}
                        {activeTab === 'financials' && (
                            <CharityFinancialsTab charityDetails={charityDetails} historicalData={historicalData} />
                        )}
                        {activeTab === 'programs' && (
                            <CharityProgramsTab charityDetails={charityDetails} />
                        )}
                        {activeTab === 'governance' && (
                            <CharityGovernanceTab charityDetails={charityDetails} />
                        )}
                        {activeTab === 'reports' && (
                            <CharityReportsTab charityDetails={charityDetails} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ComparePage = () => {
    const { navigate } = useNavigation();
    const { comparisonList, clearComparison } = useComparison();

    if (comparisonList.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center flex-grow">
                <h1 className="text-2xl font-bold">Comparison List is Empty</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Go to the search page to add charities to compare.</p>
                <Button onClick={() => navigate({ page: 'search' })} className="mt-6">
                    <Search className="mr-2 h-4 w-4" /> Go to Search
                </Button>
            </div>
        );
    }

    const metrics = [
        { key: 'revenue', label: 'Total Revenue', format: formatCurrency },
        { key: 'expenses', label: 'Total Expenses', format: formatCurrency },
        { key: 'surplus', label: 'Net Surplus/Deficit', format: (c) => formatCurrency(c.revenue - c.expenses) },
        { key: 'transparency_score', label: 'Transparency Score', format: (c) => `${c.transparency_score}%` },
        { key: 'financial_efficiency', label: 'Financial Efficiency', format: (c) => `${(c.financial_efficiency * 100).toFixed(1)}%` },
        { key: 'staff', label: 'Staff', format: (c) => formatNumber(c.staff) },
        { key: 'volunteers', label: 'Volunteers', format: (c) => formatNumber(c.volunteers) },
    ];

    return (
        <div className="container mx-auto px-4 py-8 flex-grow">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compare Charities</h1>
                <Button onClick={clearComparison} variant="destructive">Clear List</Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-tl-lg">Metric</th>
                            {comparisonList.map(charity => (
                                <th key={charity.id} className="py-4 px-6 text-center text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    {charity.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.map(metric => (
                            <tr key={metric.key} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-4 px-6 font-medium text-gray-800 dark:text-gray-200">{metric.label}</td>
                                {comparisonList.map(charity => (
                                    <td key={charity.id} className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">
                                        {metric.key === 'surplus' ? metric.format(charity) : metric.format(charity)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                            <td className="py-4 px-6 rounded-bl-lg"></td>
                            {comparisonList.map(charity => (
                                <td key={charity.id} className="py-4 px-6 text-center">
                                    <Button onClick={() => navigate({ page: 'charityDetail', data: charity })} size="sm">
                                        View Details
                                    </Button>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const AboutPage = () => (
    <div className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">About CharityCompass</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Our mission is to empower donors, researchers, and policymakers with clear, accessible, and reliable data on Australian charities.
            </p>
        </div>
    </div>
);

// --- COMPLEX COMPONENTS ---
const Header = () => {
    const { theme, toggleTheme } = useTheme();
    const { navigate } = useNavigation();
    const { comparisonList } = useComparison();
    return (
        <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto flex items-center justify-between h-16 px-4">
                <div className="flex items-center gap-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate({ page: 'landing' })}} className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                        <HelpingHand className="text-blue-600 dark:text-blue-500" /><span>CharityCompass</span>
                    </a>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate({ page: 'search' })}} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Search</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate({ page: 'compare' })}} className="relative text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                        Compare {comparisonList.length > 0 && <span className="absolute -top-1 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">{comparisonList.length}</span>}
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate({ page: 'about' })}} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">About</a>
                </nav>
                <div className="flex items-center gap-2">
                    <Button onClick={toggleTheme} variant="ghost" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>
            </div>
        </header>
    );
};

const Footer = () => (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto py-8 px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
            <p>&copy; {new Date().getFullYear()} CharityCompass. Data sourced from ACNC (mock data for demo).</p>
            <p className="mt-2">Built with React, TailwindCSS, and a touch of magic.</p>
        </div>
    </footer>
);

// --- MAGIC UI COMPONENTS ---
const Meteors = ({ number = 20 }) => (
    <>
        {[...Array(number)].map((_, i) => (
            <span
                key={i}
                className="absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-full bg-slate-500 animate-meteor"
                style={{
                    top: 0,
                    left: `${Math.floor(Math.random() * 200 - 100)}%`,
                    animationDelay: `${Math.random() * (0.8 - 0.2) + 0.2}s`,
                    animationDuration: `${Math.floor(Math.random() * (10 - 2) + 2)}s`,
                }}
            />
        ))}
    </>
);

const AnimatedShinyText = ({ children, className }) => (
    <div className={`inline-flex items-center justify-center ${className}`}>
        <p
            style={{ animation: 'shine 4s linear infinite' }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-gray-900/60 via-gray-900 to-gray-900/60 dark:from-white/60 dark:via-white dark:to-white/60 bg-[length:200%_100%]"
        >
            {children}
        </p>
    </div>
);

const ShimmerButton = ({ children, onClick, className, ...props }) => (
    <button
        onClick={onClick}
        style={{ '--shimmer-width': '100px' }}
        className={`relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md border border-blue-700 bg-blue-600 px-8 font-medium text-neutral-50 transition-all hover:scale-105 ${className}`}
        {...props}
    >
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-transparent to-white/50 animate-shimmer" />
        <span className="relative z-10">{children}</span>
    </button>
);

const BlurIn = ({ children, className }) => (
    <div className={`animate-blur-in ${className}`} style={{ animationFillMode: 'forwards' }}>
        {children}
    </div>
);

const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>{children}</span>;
};

// --- ADDITIONAL UI COMPONENTS ---
const SearchBar = ({ onSearchChange, onSearchSubmit, placeholder = "Search for a charity by name or ABN..." }) => {
    const [searchValue, setSearchValue] = useState('');

    const handleChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);
        onSearchChange(value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSearchSubmit) {
            onSearchSubmit();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
                type="text" 
                placeholder={placeholder} 
                value={searchValue}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-16 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" 
            />
            <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
            >
                Search
            </button>
        </form>
    );
};

const FilterPanel = ({ onFilterChange }) => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const Dropdown = ({ name, options, onSelect }) => {
        const [selected, setSelected] = useState(options[0]);
        const isOpen = openDropdown === name;
        const handleSelect = (option) => { setSelected(option); onSelect(name.toLowerCase(), option); setOpenDropdown(null); };
        return (
            <div className="relative">
                <button onClick={() => setOpenDropdown(isOpen ? null : name)} className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
                    <span className="capitalize">{name}: {selected}</span><ChevronsUpDown className="h-4 w-4 opacity-50" />
                </button>
                {isOpen && <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">{options.map(opt => <div key={opt} onClick={() => handleSelect(opt)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{opt}</div>)}</div>}
            </div>
        );
    };
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Dropdown name="Category" options={categories} onSelect={onFilterChange} /><Dropdown name="State" options={states} onSelect={onFilterChange} /></div>;
};

const Tooltip = ({ children, text }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 text-sm text-white bg-gray-800 dark:bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
            {text}
        </div>
    </div>
);

const Card = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 ${className}`}>
        {children}
    </div>
);

const SkeletonLoader = ({ className = '' }) => <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`}></div>;

const CharityCard = ({ charity }) => {
    const { navigate } = useNavigation();
    const { comparisonList, toggleCompare } = useComparison();
    const isComparing = comparisonList.some(c => c.id === charity.id);
    const surplus = charity.revenue - charity.expenses;
    const getBadgeVariant = (score) => score > 90 ? "success" : score > 80 ? "warning" : "danger";
    return (
        <BlurIn>
            <Card className="flex flex-col p-4 h-full">
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{charity.name}</h3>
                        <Tooltip text={isComparing ? 'Remove from comparison' : 'Add to comparison'}>
                            <Button onClick={() => toggleCompare(charity)} variant={isComparing ? "secondary" : "ghost"} size="icon" className="flex-shrink-0">
                                {isComparing ? <MinusCircle className="h-5 w-5 text-red-500"/> : <PlusCircle className="h-5 w-5 text-blue-500"/>}
                            </Button>
                        </Tooltip>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{charity.category} | {charity.state}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 h-10 overflow-hidden">{charity.description}</p>
                </div>
                <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Revenue</span><span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(charity.revenue)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Surplus</span><span className={`font-semibold ${surplus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(surplus)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-gray-600 dark:text-gray-400">Transparency</span><Badge variant={getBadgeVariant(charity.transparency_score)}>{charity.transparency_score}%</Badge></div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button onClick={() => navigate({ page: 'charityDetail', data: charity })} className="w-full">View Details</Button>
                </div>
            </Card>
        </BlurIn>
    );
};

// --- METRIC AND DASHBOARD COMPONENTS ---
const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend }) => {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        red: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
    };

    const iconColorClasses = {
        blue: 'text-blue-600 dark:text-blue-400',
        red: 'text-red-600 dark:text-red-400',
        green: 'text-green-600 dark:text-green-400',
        purple: 'text-purple-600 dark:text-purple-400'
    };

    return (
        <Card className={`p-6 ${colorClasses[color] || colorClasses.blue}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                    {trend !== null && trend !== undefined && (
                        <div className={`flex items-center mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {Math.abs(trend).toFixed(1)}% vs last year
                        </div>
                    )}
                </div>
                <Icon className={`h-8 w-8 ${iconColorClasses[color] || iconColorClasses.blue}`} />
            </div>
        </Card>
    );
};

// --- CHARITY DASHBOARD TAB COMPONENTS ---
const CharityOverviewTab = ({ charityDetails, historicalData }) => {
    const surplus = charityDetails.revenue - charityDetails.expenses;
    const efficiencyRatio = charityDetails.revenue > 0 ? (charityDetails.expenses / charityDetails.revenue) * 100 : 0;
    
    return (
        <div className="space-y-8">
            {/* Description and Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About This Charity</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                        {charityDetails.description || 'This charity is committed to making a positive impact in the Australian community through their dedicated programs and services.'}
                    </p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {charityDetails.website ? (
                                    <a href={charityDetails.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        Visit Website
                                    </a>
                                ) : 'Website not available'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Operating in {charityDetails.state}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {charityDetails.dateEstablished ? `Established ${charityDetails.dateEstablished}` : 'Established date not available'}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{charityDetails.staff || 'N/A'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Staff Members</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(charityDetails.volunteers || 0)}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Volunteers</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round(charityDetails.financial_efficiency * 100 || efficiencyRatio)}%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Financial Efficiency</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(charityDetails.transparency_score || 85)}%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Transparency</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Trend Chart */}
            {historicalData && historicalData.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Financial Trends</h3>
                    <Card className="p-6">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={historicalData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <RechartsTooltip 
                                    formatter={(value, name) => [formatCurrency(value * 1000000), name]}
                                    labelStyle={{ color: '#374151' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue (M)" />
                                <Bar dataKey="expenses" fill="#EF4444" name="Expenses (M)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* Recent Activity/News */}
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    <Card className="p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Annual Report Published</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Latest financial statements and impact report now available</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">2 weeks ago</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-start gap-3">
                            <Award className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Compliance Status Updated</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">All regulatory requirements met for this reporting period</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">1 month ago</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const CharityFinancialsTab = ({ charityDetails, historicalData }) => {
    const surplus = charityDetails.revenue - charityDetails.expenses;
    const programSpendingRatio = charityDetails.revenue > 0 ? ((charityDetails.expenses * 0.85) / charityDetails.revenue) * 100 : 0;
    const adminCostRatio = charityDetails.revenue > 0 ? ((charityDetails.expenses * 0.15) / charityDetails.revenue) * 100 : 0;
    const liquidityRatio = 1.5; // Mock data
    const debtToEquityRatio = 0.2; // Mock data

    const financialMetrics = [
        { label: 'Program Spending Ratio', value: `${programSpendingRatio.toFixed(1)}%`, description: 'Percentage of expenses on programs vs admin' },
        { label: 'Administrative Cost Ratio', value: `${adminCostRatio.toFixed(1)}%`, description: 'Administrative costs as % of total expenses' },
        { label: 'Surplus Margin', value: `${((surplus / charityDetails.revenue) * 100).toFixed(1)}%`, description: 'Net surplus as % of total revenue' },
        { label: 'Liquidity Ratio', value: liquidityRatio.toFixed(1), description: 'Current assets to current liabilities' },
    ];

    return (
        <div className="space-y-8">
            {/* Financial Health Indicators */}
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Financial Health Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {financialMetrics.map((metric, index) => (
                        <Card key={index} className="p-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{metric.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{metric.description}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Detailed Financial Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Revenue Breakdown</h3>
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Donations & Grants</span>
                                <span className="font-semibold">{formatCurrency(charityDetails.revenue * 0.7)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Government Funding</span>
                                <span className="font-semibold">{formatCurrency(charityDetails.revenue * 0.2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Other Income</span>
                                <span className="font-semibold">{formatCurrency(charityDetails.revenue * 0.1)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Expense Allocation</h3>
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Program Services</span>
                                <span className="font-semibold">{formatCurrency(charityDetails.expenses * 0.85)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Administration</span>
                                <span className="font-semibold">{formatCurrency(charityDetails.expenses * 0.1)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Fundraising</span>
                                <span className="font-semibold">{formatCurrency(charityDetails.expenses * 0.05)}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Multi-Year Comparison */}
            {historicalData && historicalData.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Multi-Year Financial Analysis</h3>
                    <Card className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-3 text-gray-600 dark:text-gray-400">Year</th>
                                        <th className="text-right py-3 text-gray-600 dark:text-gray-400">Revenue</th>
                                        <th className="text-right py-3 text-gray-600 dark:text-gray-400">Expenses</th>
                                        <th className="text-right py-3 text-gray-600 dark:text-gray-400">Surplus</th>
                                        <th className="text-right py-3 text-gray-600 dark:text-gray-400">Growth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historicalData.map((year, index) => {
                                        const surplus = year.revenue - year.expenses;
                                        const growth = index > 0 ? ((year.revenue - historicalData[index - 1].revenue) / historicalData[index - 1].revenue * 100) : 0;
                                        return (
                                            <tr key={year.year} className="border-b border-gray-100 dark:border-gray-800">
                                                <td className="py-3 font-medium">{year.year}</td>
                                                <td className="py-3 text-right">{formatCurrency(year.revenue * 1000000)}</td>
                                                <td className="py-3 text-right">{formatCurrency(year.expenses * 1000000)}</td>
                                                <td className={`py-3 text-right font-medium ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(surplus * 1000000)}
                                                </td>
                                                <td className={`py-3 text-right ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {index > 0 ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

const CharityProgramsTab = ({ charityDetails }) => {
    // Mock program data - in real app this would come from API
    const programs = [
        {
            name: "Community Support Services",
            description: "Direct assistance to individuals and families in need",
            budget: charityDetails.expenses * 0.4,
            beneficiaries: 1250,
            outcomes: "95% of participants report improved quality of life"
        },
        {
            name: "Education & Training Programs",
            description: "Skills development and educational support initiatives",
            budget: charityDetails.expenses * 0.3,
            beneficiaries: 850,
            outcomes: "78% completion rate with 85% job placement success"
        },
        {
            name: "Health & Wellness Initiative",
            description: "Mental health support and wellness programs",
            budget: charityDetails.expenses * 0.15,
            beneficiaries: 450,
            outcomes: "Significant improvement in mental health scores"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Programs & Services</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Overview of key programs and their impact on the community.
                </p>
            </div>

            {/* Program Impact Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                        {programs.reduce((total, program) => total + program.beneficiaries, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Beneficiaries</div>
                </Card>
                <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{programs.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Programs</div>
                </Card>
                <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                        {formatCurrency(programs.reduce((total, program) => total + program.budget, 0))}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Program Budget</div>
                </Card>
            </div>

            {/* Individual Program Details */}
            <div className="space-y-6">
                {programs.map((program, index) => (
                    <Card key={index} className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{program.name}</h4>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">{program.description}</p>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Key Outcomes</span>
                                    </div>
                                    <p className="text-sm text-green-700 dark:text-green-300">{program.outcomes}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Annual Budget</div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(program.budget)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Beneficiaries Served</div>
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{program.beneficiaries.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Cost per Beneficiary</div>
                                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                        {formatCurrency(program.budget / program.beneficiaries)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Impact Measurement */}
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Impact Measurement</h3>
                <Card className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Social Return on Investment</h4>
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">$4.20</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">For every $1 invested, $4.20 in social value is created</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Program Effectiveness</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Program completion rate</span>
                                    <span className="font-medium">87%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Participant satisfaction</span>
                                    <span className="font-medium">94%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Long-term impact retention</span>
                                    <span className="font-medium">76%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const CharityGovernanceTab = ({ charityDetails }) => {
    // Mock data
    const boardMembers = [
        { name: 'John Smith', role: 'Chairperson' },
        { name: 'Jane Doe', role: 'Treasurer' },
        { name: 'Peter Jones', role: 'Secretary' },
        { name: 'Susan King', role: 'Board Member' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Governance & Transparency</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Information about the charity's leadership, compliance, and public reporting.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Board of Directors */}
                <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Board of Directors</h4>
                    <Card className="p-6">
                        <ul className="space-y-4">
                            {boardMembers.map((member, index) => (
                                <li key={index} className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{member.name}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{member.role}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>

                {/* Compliance & Reporting */}
                <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compliance & Reporting</h4>
                    <Card className="p-6">
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-gray-700 dark:text-gray-300">Registered with ACNC</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-gray-700 dark:text-gray-300">Up-to-date financial reporting</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                <span className="text-gray-700 dark:text-gray-300">Minor data discrepancy in 2021 report</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-gray-700 dark:text-gray-300">DGR status confirmed</span>
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const CharityReportsTab = ({ charityDetails }) => {
    // Mock data
    const reports = [
        { name: 'Annual Report 2023', date: '2024-06-15', size: '4.5 MB', url: '#' },
        { name: 'Financial Statements 2023', date: '2024-06-15', size: '1.2 MB', url: '#' },
        { name: 'Impact Report 2023', date: '2024-07-01', size: '8.1 MB', url: '#' },
        { name: 'Annual Report 2022', date: '2023-06-20', size: '4.2 MB', url: '#' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Reports & Documents</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Download annual reports, financial statements, and other public documents.
                </p>
            </div>

            <Card className="p-6">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((report, index) => (
                        <li key={index} className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <FileText className="h-6 w-6 text-gray-500" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{report.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Published: {report.date} • Size: {report.size}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => window.open(report.url, '_blank')} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
};
