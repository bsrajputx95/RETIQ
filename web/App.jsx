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
  DollarSign,
  ShoppingCart,
  Percent,
  RotateCcw,
  Calendar,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie
} from 'recharts';
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
  
  const formatCurrencyCompact = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
  };

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

  // Monthly trends with calculated MoM
  const monthlyTrendsWithMom = useMemo(() => {
    return monthlyTrends.map((item, idx) => {
      const prev = idx > 0 ? monthlyTrends[idx - 1] : null;
      const mom = prev ? ((item.net_revenue - prev.net_revenue) / prev.net_revenue) * 100 : 0;
      return {
        ...item,
        mom_growth_pct: Number(mom.toFixed(1))
      };
    });
  }, []);

  // Aggregated regional revenue
  const regionalSummary = useMemo(() => {
    const map = {};
    regionalBreakdown.forEach(item => {
      if (!map[item.region]) {
        map[item.region] = { region: item.region, revenue: 0, profit: 0 };
      }
      map[item.region].revenue += item.revenue;
      map[item.region].profit += item.profit;
    });
    return Object.values(map);
  }, []);

  // Cohort matrix transformation
  const cohortMatrix = useMemo(() => {
    const cohortsMap = {};
    cohortRetention.forEach(item => {
      if (!cohortsMap[item.cohort]) {
        cohortsMap[item.cohort] = {
          cohort: item.cohort,
          total_users: item.total_users,
          periods: {}
        };
      }
      cohortsMap[item.cohort].periods[item.period] = item.retention_rate;
    });
    return Object.values(cohortsMap).slice(0, 10);
  }, []);

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
    const baseCogs = baseVolume * baseCost;
    const baseProfit = baseRevenue - baseCogs;
    const baseMargin = (baseProfit / baseRevenue) * 100;

    const projectedRevenue = newVolume * newPrice;
    const projectedCogs = newVolume * newCost;
    const projectedProfit = projectedRevenue - projectedCogs;
    const projectedMargin = (projectedProfit / projectedRevenue) * 100;

    return {
      baseRevenue,
      baseCogs,
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

  // Comparison data for What-If chart
  const whatIfChartData = useMemo(() => [
    {
      metric: 'Net Revenue',
      Baseline: whatIfResults.baseRevenue,
      Projected: whatIfResults.projectedRevenue,
    },
    {
      metric: 'COGS',
      Baseline: whatIfResults.baseCogs,
      Projected: whatIfResults.projectedCogs,
    },
    {
      metric: 'Gross Profit',
      Baseline: whatIfResults.baseProfit,
      Projected: whatIfResults.projectedProfit,
    }
  ], [whatIfResults]);

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

  const CATEGORY_COLORS = ['#2563eb', '#6366f1', '#0d9488', '#f59e0b'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
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

            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
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
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Gross Profit</span>
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(executiveKpis.total_profit)}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                    {executiveKpis.gross_margin_pct}% Margin
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Net after wholesale COGS</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
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
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
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

            {/* Monthly Revenue & Profit Momentum Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Revenue & Profit Momentum</h3>
                  <p className="text-xs text-slate-500">45-month historical trend (Jan 2023 - Sep 2026)</p>
                </div>
                <div className="flex items-center space-x-4 text-xs font-medium">
                  <span className="flex items-center text-slate-700">
                    <span className="w-3 h-3 bg-blue-600 rounded-sm mr-1.5 inline-block"></span> Net Revenue ($)
                  </span>
                  <span className="flex items-center text-slate-700">
                    <span className="w-3 h-3 bg-emerald-500 rounded-sm mr-1.5 inline-block"></span> Gross Profit ($)
                  </span>
                  <span className="flex items-center text-slate-700">
                    <span className="w-3 h-0.5 bg-amber-500 mr-1.5 inline-block"></span> Margin %
                  </span>
                </div>
              </div>

              {/* Recharts Area + Bar Chart */}
              <div className="mt-6 w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyTrends} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="period_label" 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      interval={2}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={formatCurrencyCompact}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 2000000]}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: '#f59e0b' }}
                      tickLine={false}
                      axisLine={false}
                      domain={[20, 35]}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-800">
                              <p className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-slate-200">{label}</p>
                              <div className="space-y-1">
                                <p className="flex justify-between gap-4">
                                  <span className="text-slate-400">Net Revenue:</span>
                                  <span className="font-semibold text-blue-400">{formatCurrency(data.net_revenue)}</span>
                                </p>
                                <p className="flex justify-between gap-4">
                                  <span className="text-slate-400">Gross Profit:</span>
                                  <span className="font-semibold text-emerald-400">{formatCurrency(data.gross_profit)}</span>
                                </p>
                                <p className="flex justify-between gap-4">
                                  <span className="text-slate-400">Gross Margin:</span>
                                  <span className="font-semibold text-amber-400">{data.margin_pct}%</span>
                                </p>
                                <p className="flex justify-between gap-4">
                                  <span className="text-slate-400">Order Volume:</span>
                                  <span className="font-semibold text-slate-200">{formatNumber(data.orders)} orders</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="net_revenue" 
                      name="Net Revenue"
                      stroke="#2563eb" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#revenueGradient)" 
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="gross_profit" 
                      name="Gross Profit"
                      fill="#10b981" 
                      radius={[3, 3, 0, 0]}
                      maxBarSize={16}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="margin_pct" 
                      name="Margin %"
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split Grid: Category Breakdown + Regional Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Bar Chart */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Merchandising Category Revenue & Margin</h3>
                    <p className="text-xs text-slate-500">Sales volume and profitability distribution</p>
                  </div>
                  <button 
                    onClick={() => exportToCsv('retailiq_category_breakdown', categoryBreakdown)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </button>
                </div>

                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={formatCurrencyCompact} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} />
                      <Tooltip 
                        formatter={(val, name) => [name === 'revenue' ? formatCurrency(val) : `${val}%`, name === 'revenue' ? 'Revenue' : 'Margin']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22}>
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Regional Sales Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Regional Performance</h3>
                    <p className="text-xs text-slate-500">Net revenue and operating gross profit by region</p>
                  </div>
                  <button 
                    onClick={() => exportToCsv('retailiq_regional_breakdown', regionalSummary)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export
                  </button>
                </div>

                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalSummary} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#334155' }} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis tickFormatter={formatCurrencyCompact} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                      <Tooltip 
                        formatter={(val) => [formatCurrency(val)]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="revenue" name="Net Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="profit" name="Gross Profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
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
                <h2 className="text-base font-bold text-slate-900">Time-Series Revenue Mart (SQL Window Functions)</h2>
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

            {/* MoM Variance Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Month-over-Month (MoM) Revenue Growth Rate %</h3>
              <p className="text-xs text-slate-500 mb-4">Calculated dynamically using <code className="text-blue-700">LAG(net_revenue, 1) OVER (ORDER BY year, month)</code></p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendsWithMom} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period_label" tick={{ fontSize: 10, fill: '#64748b' }} interval={2} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Tooltip 
                      formatter={(val) => [`${val}%`, 'MoM Growth']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="mom_growth_pct" name="MoM Growth %" radius={[2, 2, 0, 0]} maxBarSize={14}>
                      {monthlyTrendsWithMom.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.mom_growth_pct >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabular Data View */}
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
                <p className="text-xs text-blue-800 mt-1">Generates $53.7M (80.0% of catalog revenue)</p>
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

            {/* Pareto Composed Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pareto 80/20 Cumulative Revenue Curve</h3>
                  <p className="text-xs text-slate-500">Top 30 SKUs ranked by revenue against 80% cumulative threshold</p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={productPareto.slice(0, 30)} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="product_sku" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      angle={-45} 
                      textAnchor="end" 
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      tickFormatter={formatCurrencyCompact} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                      axisLine={false} 
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickFormatter={(v) => `${v}%`} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 11, fill: '#2563eb' }} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      formatter={(val, name) => [name === 'revenue' ? formatCurrency(val) : `${val}%`, name === 'revenue' ? 'Net Revenue' : 'Cumulative %']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80% Cutoff', fill: '#ef4444', fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Net Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18}>
                      {productPareto.slice(0, 30).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pareto_class === 'Class A' ? '#2563eb' : '#f59e0b'} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="cum_pct" name="Cumulative Sales %" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
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
            {/* RFM Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rfmPersonas.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{p.persona}</span>
                    <span className="text-slate-500 font-medium">{formatNumber(p.customer_count)} accounts</span>
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

            {/* RFM Persona Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Customer Revenue Share by RFM Persona</h3>
              <p className="text-xs text-slate-500 mb-4">Total monetary contribution by lifecycle cohort</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rfmPersonas} margin={{ top: 10, right: 20, left: 20, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="persona" 
                      tick={{ fontSize: 10, fill: '#334155' }} 
                      angle={-30} 
                      textAnchor="end" 
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis tickFormatter={formatCurrencyCompact} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                    <Tooltip 
                      formatter={(val) => [formatCurrency(val), 'Segment Revenue']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="total_segment_revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {rfmPersonas.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.persona === 'Champions' ? '#1d4ed8' :
                            entry.persona === 'Loyal Customers' ? '#3b82f6' :
                            entry.persona.includes('Risk') ? '#ef4444' :
                            entry.persona.includes('Hibernating') ? '#94a3b8' : '#60a5fa'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* True Cohort Retention Heatmap Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cohort Retention Heatmap (%)</h3>
                  <p className="text-xs text-slate-500">Customer order retention from Month 0 to Month 8</p>
                </div>
                <button
                  onClick={() => exportToCsv('retailiq_cohort_retention', cohortRetention)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Cohort</th>
                      <th className="py-2.5 px-3 text-left">Users</th>
                      <th className="py-2.5 px-2">M0</th>
                      <th className="py-2.5 px-2">M1</th>
                      <th className="py-2.5 px-2">M2</th>
                      <th className="py-2.5 px-2">M3</th>
                      <th className="py-2.5 px-2">M4</th>
                      <th className="py-2.5 px-2">M5</th>
                      <th className="py-2.5 px-2">M6</th>
                      <th className="py-2.5 px-2">M7</th>
                      <th className="py-2.5 px-2">M8</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortMatrix.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-left font-bold text-slate-800">{c.cohort}</td>
                        <td className="py-2 px-3 text-left text-slate-500 font-medium">{formatNumber(c.total_users)}</td>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((m) => {
                          const rate = c.periods[m];
                          if (rate === undefined) return <td key={m} className="py-2 px-2 text-slate-300">-</td>;
                          const bgIntensity = rate >= 90 ? 'bg-blue-600 text-white font-bold' :
                                              rate >= 45 ? 'bg-blue-200 text-blue-900 font-semibold' :
                                              rate >= 35 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600';
                          return (
                            <td key={m} className="py-1 px-1">
                              <span className={`inline-block w-full py-1 rounded text-[11px] ${bgIntensity}`}>
                                {rate}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
                Mirrors the sensitivity calculations in <code className="text-blue-700">RetailIQ_Financial_Model.xlsx</code>.
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
                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Selling Price</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatCurrency(whatIfResults.newPrice)}
                  </div>
                  <span className="text-xs text-slate-500">Base: $250.00</span>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Sales Volume</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatNumber(whatIfResults.newVolume)} units
                  </div>
                  <span className={`text-xs font-semibold ${whatIfResults.volumeChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResults.volumeChangePct.toFixed(1)}% volume impact
                  </span>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Gross Profit</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatCurrency(whatIfResults.projectedProfit)}
                  </div>
                  <span className={`text-xs font-semibold ${whatIfResults.profitDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResults.profitDelta >= 0 ? '+' : ''}{formatCurrency(whatIfResults.profitDelta)} vs Baseline
                  </span>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Projected Gross Margin</span>
                  <div className="mt-1 text-xl font-bold text-blue-700">
                    {whatIfResults.projectedMargin.toFixed(2)}%
                  </div>
                  <span className="text-xs text-slate-500">Base: {whatIfResults.baseMargin.toFixed(2)}%</span>
                </div>
              </div>

              {/* Comparison Visual Chart */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-3">Baseline vs Projected Financial Impact</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatIfChartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#334155' }} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis tickFormatter={formatCurrencyCompact} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                      <Tooltip 
                        formatter={(val) => [formatCurrency(val)]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Projected" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
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
                Star schema structure with partitioned sales facts and indexed foreign keys.
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
