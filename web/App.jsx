import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  Calculator, 
  Database, 
  Download, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  DollarSign,
  ShoppingCart,
  Percent,
  RotateCcw,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  executiveKpis, 
  monthlyTrends, 
  categoryBreakdown, 
  regionalBreakdown, 
  productPareto, 
  rfmPersonas, 
  cohortRetention, 
  basketAffinity 
} from './data.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [paretoCategoryFilter, setParetoCategoryFilter] = useState('ALL');
  const [paretoSearch, setParetoSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');

  // What-If Simulator state
  const [priceChangePct, setPriceChangePct] = useState(5);
  const [elasticity, setElasticity] = useState(-1.25);
  const [costInflationPct, setCostInflationPct] = useState(3);

  // Formatter utilities
  const formatCurrency = (val) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  
  const formatNumber = (val) => 
    new Intl.NumberFormat('en-US').format(val);

  // Filtered Pareto SKUs
  const filteredPareto = useMemo(() => {
    return productPareto.filter(item => {
      const matchCat = paretoCategoryFilter === 'ALL' || item.category === paretoCategoryFilter;
      const matchSearch = item.product_name.toLowerCase().includes(paretoSearch.toLowerCase()) || 
                          item.product_sku.toLowerCase().includes(paretoSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [paretoCategoryFilter, paretoSearch]);

  // Filtered Monthly Trends
  const filteredMonthly = useMemo(() => {
    if (selectedYear === 'ALL') return monthlyTrends;
    return monthlyTrends.filter(m => String(m.year) === selectedYear);
  }, [selectedYear]);

  // What-If calculations
  const whatIfResults = useMemo(() => {
    const baseVolume = 35000;
    const basePrice = 250.00;
    const baseCost = 175.00;

    const newPrice = basePrice * (1 + priceChangePct / 100);
    const volumeChangePct = (priceChangePct / 100) * elasticity;
    const newVolume = Math.round(baseVolume * (1 + volumeChangePct));
    const newCost = baseCost * (1 + costInflationPct / 100);

    const baseRevenue = baseVolume * basePrice;
    const baseProfit = baseVolume * (basePrice - baseCost);
    const baseMargin = (baseProfit / baseRevenue) * 100;

    const projectedRevenue = newVolume * newPrice;
    const projectedCogs = newVolume * newCost;
    const projectedProfit = projectedRevenue - projectedCogs;
    const projectedMargin = (projectedProfit / projectedRevenue) * 100;

    return {
      baseRevenue,
      baseProfit,
      baseMargin,
      newPrice,
      newVolume,
      volumeChangePct: volumeChangePct * 100,
      projectedRevenue,
      projectedCogs,
      projectedProfit,
      projectedMargin,
      profitDelta: projectedProfit - baseProfit,
      revenueDelta: projectedRevenue - baseRevenue
    };
  }, [priceChangePct, elasticity, costInflationPct]);

  // CSV export helper
  const exportToCsv = (filename, rows) => {
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k]}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                R
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">RetailIQ</h1>
                <p className="text-xs text-slate-500 font-medium">Retail Sales & Business Intelligence Analytics</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
                DWH Synced (PostgreSQL 18)
              </span>
              <a
                href="https://github.com/bsrajputx95/RETIQ"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
              >
                GitHub Repo
              </a>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto pb-1 text-sm font-medium border-t border-slate-100 pt-1">
            {[
              { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
              { id: 'revenue', label: 'Revenue Trends', icon: TrendingUp },
              { id: 'merchandising', label: 'Merchandising & Pareto', icon: Package },
              { id: 'rfm', label: 'Customer RFM & Cohorts', icon: Users },
              { id: 'whatif', label: 'What-If Sensitivity Model', icon: Calculator },
              { id: 'sql', label: 'SQL Marts & Schema', icon: Database }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Banner Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <span>Total Net Sales</span>
                  <DollarSign className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(executiveKpis.total_revenue)}</span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +10.1% YoY
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">46,069 Completed Orders</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <span>Gross Profit</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(executiveKpis.total_profit)}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                    {executiveKpis.gross_margin_pct}% Margin
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Net after wholesale COGS</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <span>Average Order Value</span>
                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {formatCurrency(executiveKpis.total_revenue / executiveKpis.total_orders)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">~1.9 items/basket</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Active base of {formatNumber(executiveKpis.total_customers)} accounts</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
                  <span>Returns & Refunds</span>
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{formatNumber(executiveKpis.total_returns)}</span>
                  <span className="text-xs font-semibold text-amber-600">{executiveKpis.return_rate_pct}% Rate</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Defective / Size exchanges</p>
              </div>
            </div>

            {/* Sales Momentum Graph */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Revenue & Profit Momentum</h3>
                  <p className="text-xs text-slate-500">45-month historical trend (Jan 2023 - Sep 2026)</p>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="flex items-center font-medium text-slate-700">
                    <span className="w-3 h-3 bg-blue-600 rounded-sm mr-1.5"></span> Net Revenue ($)
                  </span>
                  <span className="flex items-center font-medium text-slate-700">
                    <span className="w-3 h-3 bg-emerald-500 rounded-sm mr-1.5"></span> Gross Profit ($)
                  </span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="mt-6 h-64 flex items-end space-x-1.5 overflow-x-auto pb-4 pt-4">
                {monthlyTrends.map((m, i) => {
                  const revHeight = Math.min(100, Math.max(15, (m.net_revenue / 1800000) * 100));
                  const profHeight = Math.min(100, Math.max(8, (m.gross_profit / 1800000) * 100));
                  return (
                    <div key={i} className="flex-1 min-w-[20px] flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-[11px] py-1.5 px-2.5 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                        <span className="font-bold">{m.period_label}</span>
                        <span>Revenue: {formatCurrency(m.net_revenue)}</span>
                        <span>Profit: {formatCurrency(m.gross_profit)} ({m.margin_pct}%)</span>
                        <span>Orders: {formatNumber(m.orders)}</span>
                      </div>

                      <div className="w-full flex items-end justify-center space-x-0.5">
                        <div 
                          style={{ height: `${revHeight}%` }} 
                          className="w-2.5 bg-blue-600 rounded-t-sm group-hover:bg-blue-700 transition-all"
                        ></div>
                        <div 
                          style={{ height: `${profHeight}%` }} 
                          className="w-2.5 bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-all"
                        ></div>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center">
                        {m.month_number === 1 ? m.year : m.period_label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split Grid: Category Breakdown + Regional Stores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Merchandising Category Contribution</h3>
                  <button 
                    onClick={() => exportToCsv('retailiq_category_breakdown', categoryBreakdown)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {categoryBreakdown.map((cat, i) => {
                    const pctOfTotal = ((cat.revenue / executiveKpis.total_revenue) * 100).toFixed(1);
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800">{cat.category}</span>
                          <span className="text-slate-600 font-medium">
                            {formatCurrency(cat.revenue)} ({pctOfTotal}%) | {cat.margin_pct}% Margin
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              cat.category === 'Technology' ? 'bg-blue-600' :
                              cat.category === 'Furniture' ? 'bg-indigo-500' :
                              cat.category === 'Apparel' ? 'bg-teal-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pctOfTotal}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Sales Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Regional & Channel Performance</h3>
                  <button 
                    onClick={() => exportToCsv('retailiq_regional_breakdown', regionalBreakdown)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2">Region</th>
                        <th className="py-2">Store Type</th>
                        <th className="py-2 text-right">Revenue</th>
                        <th className="py-2 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {regionalBreakdown.slice(0, 6).map((reg, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 font-medium text-slate-800">{reg.region}</td>
                          <td className="py-2.5 text-slate-600">{reg.store_type}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">{formatCurrency(reg.revenue)}</td>
                          <td className="py-2.5 text-right text-emerald-600 font-medium">{formatCurrency(reg.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REVENUE TRENDS */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900">Time-Series Revenue Mart (PostgreSQL SQL 03)</h2>
                <p className="text-xs text-slate-500">Calculates MoM Growth %, Prior Year SPLY, and YTD Cumulative Running Revenue</p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">All Years (2023 - 2026)</option>
                  <option value="2023">Year 2023</option>
                  <option value="2024">Year 2024</option>
                  <option value="2025">Year 2025</option>
                  <option value="2026">Year 2026</option>
                </select>
                <button
                  onClick={() => exportToCsv('retailiq_revenue_trends', filteredMonthly)}
                  className="text-xs font-semibold bg-blue-700 text-white px-3.5 py-1.5 rounded-md hover:bg-blue-800 transition flex items-center shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Orders</th>
                      <th className="py-3 px-4 text-right">Net Revenue</th>
                      <th className="py-3 px-4 text-right">Gross Profit</th>
                      <th className="py-3 px-4 text-right">Gross Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMonthly.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{row.period_label}</td>
                        <td className="py-2.5 px-4 text-slate-600">{formatNumber(row.orders)}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-900">{formatCurrency(row.net_revenue)}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 font-medium">{formatCurrency(row.gross_profit)}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-blue-700">{row.margin_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MERCHANDISING & ABC PARETO */}
        {activeTab === 'merchandising' && (
          <div className="space-y-6">
            {/* Pareto Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase">Class A (Top 80%)</span>
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[11px] font-bold rounded">Core Drivers</span>
                </div>
                <p className="mt-2 text-xl font-bold text-blue-950">28 Products (18.9%)</p>
                <p className="text-xs text-blue-800 mt-1">Generates $53.7M (80.0% of total catalog revenue)</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase">Class B (Next 15%)</span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-[11px] font-bold rounded">Steady Volume</span>
                </div>
                <p className="mt-2 text-xl font-bold text-amber-950">34 Products (23.0%)</p>
                <p className="text-xs text-amber-800 mt-1">Generates $10.1M (15.0% of catalog revenue)</p>
              </div>

              <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Class C (Tail 5%)</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[11px] font-bold rounded">Low Velocity</span>
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">86 Products (58.1%)</p>
                <p className="text-xs text-slate-600 mt-1">Ties up working capital with only $3.3M revenue</p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SKU or product title..."
                    value={paretoSearch}
                    onChange={(e) => setParetoSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <select
                  value={paretoCategoryFilter}
                  onChange={(e) => setParetoCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Technology">Technology</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Apparel">Apparel</option>
                </select>
              </div>

              <button
                onClick={() => exportToCsv('retailiq_pareto_products', filteredPareto)}
                className="text-xs font-semibold bg-blue-700 text-white px-3 py-1.5 rounded-md hover:bg-blue-800 transition flex items-center self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Export Active View
              </button>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Units Sold</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                      <th className="py-3 px-4 text-right">Margin %</th>
                      <th className="py-3 px-4 text-right">Cum %</th>
                      <th className="py-3 px-4 text-center">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPareto.map((item) => (
                      <tr key={item.rank} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-500">#{item.rank}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{item.product_sku}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 max-w-xs truncate">{item.product_name}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.category}</td>
                        <td className="py-2.5 px-4 text-right text-slate-700">{formatNumber(item.units_sold)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(item.revenue)}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-emerald-600">{item.margin_pct}%</td>
                        <td className="py-2.5 px-4 text-right text-slate-500">{item.cum_pct}%</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.pareto_class === 'Class A' ? 'bg-blue-100 text-blue-800' :
                            item.pareto_class === 'Class B' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.pareto_class}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMER RFM & COHORTS */}
        {activeTab === 'rfm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rfmPersonas.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{p.persona}</span>
                    <span className="text-slate-500">{formatNumber(p.customer_count)} users</span>
                  </div>
                  <div className="mt-2 text-xl font-bold text-blue-700">
                    {formatCurrency(p.total_segment_revenue)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Avg Spend: {formatCurrency(p.avg_monetary)}
                  </p>
                </div>
              ))}
            </div>

            {/* RFM Full Persona Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Customer Lifecycle Segmentation (NTILE 5)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Persona Group</th>
                      <th className="py-2.5 px-3">Total Accounts</th>
                      <th className="py-2.5 px-3 text-right">Avg Customer Spend</th>
                      <th className="py-2.5 px-3 text-right">Segment Net Sales</th>
                      <th className="py-2.5 px-3 text-right">Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rfmPersonas.map((p, idx) => {
                      const share = ((p.total_segment_revenue / executiveKpis.total_revenue) * 100).toFixed(1);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{p.persona}</td>
                          <td className="py-2.5 px-3 text-slate-700">{formatNumber(p.customer_count)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-800">{formatCurrency(p.avg_monetary)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(p.total_segment_revenue)}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-blue-700">{share}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Basket Association Rules */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Top Cross-Sell Affinities (Market Basket Analysis)</h3>
                  <p className="text-xs text-slate-500">Co-occurrence pairs with statistical lift &gt; 2.5</p>
                </div>
                <button
                  onClick={() => exportToCsv('retailiq_market_basket_affinity', basketAffinity)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export Pairs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item A</th>
                      <th className="py-2.5 px-3">Item B (Cross-Sell Target)</th>
                      <th className="py-2.5 px-3 text-right">Orders Together</th>
                      <th className="py-2.5 px-3 text-right">Confidence (A &rarr; B)</th>
                      <th className="py-2.5 px-3 text-right">Affinity Lift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {basketAffinity.slice(0, 8).map((pair, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{pair.name_a}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{pair.name_b}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{pair.pair_orders}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{pair.confidence_pct}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{pair.lift}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: WHAT-IF SENSITIVITY MODEL */}
        {activeTab === 'whatif' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Dynamic Financial What-If Scenario Simulator</h2>
              <p className="text-xs text-slate-500 mt-1">
                Mirrors the logic in <code className="text-blue-700">RetailIQ_Financial_Model.xlsx</code>.
                Simulate price elasticity against unit volumes and supplier cost inflation.
              </p>

              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Price Adjustment (%)</span>
                    <span className="text-blue-700 font-bold">{priceChangePct > 0 ? `+${priceChangePct}` : priceChangePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={priceChangePct}
                    onChange={(e) => setPriceChangePct(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>-20%</span>
                    <span>0%</span>
                    <span>+20%</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Price Elasticity (Ped)</span>
                    <span className="text-blue-700 font-bold">{elasticity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-2.50"
                    max="-0.50"
                    step="0.05"
                    value={elasticity}
                    onChange={(e) => setElasticity(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>-2.50 (Elastic)</span>
                    <span>-1.25</span>
                    <span>-0.50 (Inelastic)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Wholesale Cost Inflation (%)</span>
                    <span className="text-amber-700 font-bold">+{costInflationPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={costInflationPct}
                    onChange={(e) => setCostInflationPct(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0%</span>
                    <span>+7.5%</span>
                    <span>+15%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-lg border border-slate-200 bg-white">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Selling Price</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatCurrency(whatIfResults.newPrice)}
                  </div>
                  <span className="text-xs text-slate-500">Base: $250.00</span>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Sales Volume</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatNumber(whatIfResults.newVolume)} units
                  </div>
                  <span className={`text-xs font-semibold ${whatIfResults.volumeChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResults.volumeChangePct.toFixed(1)}% volume impact
                  </span>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Gross Profit</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatCurrency(whatIfResults.projectedProfit)}
                  </div>
                  <span className={`text-xs font-semibold ${whatIfResults.profitDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResults.profitDelta >= 0 ? '+' : ''}{formatCurrency(whatIfResults.profitDelta)} vs Baseline
                  </span>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Gross Margin</span>
                  <div className="mt-1 text-xl font-bold text-blue-700">
                    {whatIfResults.projectedMargin.toFixed(2)}%
                  </div>
                  <span className="text-xs text-slate-500">Base: {whatIfResults.baseMargin.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SQL MARTS & SCHEMA */}
        {activeTab === 'sql' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">PostgreSQL Data Warehouse Architecture</h2>
              <p className="text-xs text-slate-500 mt-1">
                Star schema structure with partitioned sales facts and optimized B-Tree and BRIN indexes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 font-mono text-xs text-slate-800">
                  <div className="font-bold text-blue-800 pb-2 border-b border-slate-200 mb-2">
                    FACT: fact_sales (87,971 rows)
                  </div>
                  <ul className="space-y-1 text-slate-600">
                    <li>• transaction_id (BIGINT PK)</li>
                    <li>• order_id (VARCHAR FK)</li>
                    <li>• customer_id (INT FK &rarr; dim_customers)</li>
                    <li>• product_id (INT FK &rarr; dim_products)</li>
                    <li>• store_id (INT FK &rarr; dim_stores)</li>
                    <li>• order_date_id (INT FK &rarr; dim_date)</li>
                    <li>• order_quantity (INT)</li>
                    <li>• net_sales_amount (NUMERIC)</li>
                    <li>• gross_profit_amount (NUMERIC)</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 font-mono text-xs text-slate-800">
                  <div className="font-bold text-blue-800 pb-2 border-b border-slate-200 mb-2">
                    DIMENSIONS
                  </div>
                  <ul className="space-y-1 text-slate-600">
                    <li>• <strong>dim_customers</strong>: 2,500 profiles with RFM segments</li>
                    <li>• <strong>dim_products</strong>: 148 SKUs with ABC classification</li>
                    <li>• <strong>dim_stores</strong>: 12 brick-and-mortar &amp; digital channels</li>
                    <li>• <strong>dim_date</strong>: 3,653 calendar records with fiscal quarters</li>
                    <li>• <strong>fact_returns</strong>: 6,477 refund transactions with reasons</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>RetailIQ &bull; Retail Sales &amp; Business Intelligence Platform</span>
          <div className="flex space-x-4">
            <span>Python &bull; Pandas &bull; PostgreSQL 18 &bull; Power BI &bull; Excel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
