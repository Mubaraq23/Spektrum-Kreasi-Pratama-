import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Search,
  ChevronDown,
  Activity,
  Award,
  Users,
  Building2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "../lib/utils";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import { handleFirestoreError, OperationType, safeDate } from "../lib/firestoreUtils";

const COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function Reports() {
  const [dateRange, setDateRange] = useState("Bulan Ini");
  const [selectedFacility, setSelectedFacility] = useState("Semua Fasilitas");
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, "worksheets"),
          orderBy("createdAt", "desc"),
        );
        const shot = await getDocs(q);
        const data = shot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setWorksheets(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "worksheets");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProcessedData = () => {
    let filtered = [...worksheets];

    const now = new Date();
    if (dateRange === "Bulan Ini") {
      filtered = filtered.filter((w) => {
        const d = w.createdAt ? safeDate(w.createdAt) : null;
        return (
          d &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    } else if (dateRange === "3 Bulan Terakhir") {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (w) => (w.createdAt ? safeDate(w.createdAt).getTime() : 0) >= ninetyDaysAgo.getTime(),
      );
    } else if (dateRange === "Tahun Ini") {
      filtered = filtered.filter(
        (w) => w.createdAt ? safeDate(w.createdAt).getFullYear() === now.getFullYear() : false,
      );
    }

    if (selectedFacility !== "Semua Fasilitas") {
      filtered = filtered.filter((w) => w.fasyankesName === selectedFacility);
    }

    return filtered;
  };

  const dateFilteredWorksheets = getProcessedData();

  const filteredWorksheets = dateFilteredWorksheets.filter(
    (w) =>
      w.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.technicianName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.fasyankesName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusData = (data: any[]) => {
    const passed = data.filter(
      (w) => w.status === "completed" || w.status === "approved",
    ).length;
    const others = data.length - passed;
    return [
      { name: "Selesai/Disetujui", value: passed },
      { name: "Pending/Draft", value: others },
    ];
  };

  const getTechnicianData = (data: any[]) => {
    const techMap: Record<string, number> = {};
    data.forEach((w) => {
      const name = w.technicianName || "Unknown";
      techMap[name] = (techMap[name] || 0) + 1;
    });
    return Object.entries(techMap).map(([name, count]) => ({ name, count }));
  };

  const getFacilityData = (data: any[]) => {
    const facMap: Record<string, number> = {};
    data.forEach((w) => {
      const name = w.fasyankesName || "Unspecified";
      facMap[name] = (facMap[name] || 0) + 1;
    });
    return Object.entries(facMap).map(([name, count]) => ({ name, count }));
  };

  const exportToExcel = () => {
    const headers = [
      "ID",
      "Device",
      "Method",
      "Technician",
      "Facility",
      "Status",
      "Date",
    ];
    const rows = worksheets.map((w) => [
      w.id,
      w.deviceName,
      w.methodName,
      w.technicianName,
      w.fasyankesName,
      w.status,
      w.createdAt ? safeDate(w.createdAt).toLocaleDateString() : "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Calibration_Report_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-blue-600 rounded-full" />
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] font-mono">
              Dynamic Analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none lowercase">
              Laporan <span className="text-blue-600 italic">Dinamis</span>
            </h1>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] ml-1">
            Spektrum Enterprise Intelligence Protocol • Analysis v.5.0
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToExcel}
            className="px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-3 shadow-xl shadow-slate-200/50 active:scale-95"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Excel Export
          </button>
          <button
            onClick={exportToPDF}
            className="px-10 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center gap-4 uppercase tracking-widest active:scale-95"
          >
            <Download className="w-6 h-6" />
            PDF Deployment
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          icon={Activity}
          label="Total Kalibrasi"
          value={dateFilteredWorksheets.length}
          color="blue"
        />
        <MetricCard
          icon={Building2}
          label="Fasyankes Dilayani"
          value={getFacilityData(dateFilteredWorksheets).length}
          color="indigo"
        />
        <MetricCard
          icon={Users}
          label="Kumpulan Teknisi"
          value={getTechnicianData(dateFilteredWorksheets).length}
          color="emerald"
        />
        <MetricCard
          icon={TrendingUp}
          label="Rasio Efisiensi"
          value={`${Math.round((getStatusData(dateFilteredWorksheets)[0].value / (dateFilteredWorksheets.length || 1)) * 100)}%`}
          color="blue"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 grid grid-cols-1 md:grid-cols-4 gap-8 items-end relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full -mr-10 -mt-10" />
        <FilterGroup label="Temporal Range" icon={Calendar}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer font-mono italic"
          >
            <option>Bulan Ini</option>
            <option>3 Bulan Terakhir</option>
            <option>Tahun Ini</option>
            <option>Rentang Kustom</option>
          </select>
        </FilterGroup>

        <FilterGroup label="Operational Facility" icon={Users}>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer font-mono italic"
          >
            <option>Semua Fasilitas</option>
            {Array.from(new Set(worksheets.map((w) => w.fasyankesName))).map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </FilterGroup>

        <FilterGroup label="Instrument Class" icon={Activity}>
          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-sm text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all appearance-none cursor-pointer font-mono italic">
            <option>Semua Alat</option>
            <option>Life Support Systems</option>
            <option>Diagnostic Tools</option>
            <option>Laboratory Modules</option>
          </select>
        </FilterGroup>

        <button className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm">
          <Filter className="w-5 h-5" />
          Execute Filters
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-2xl shadow-slate-200/50 hover:border-blue-200 transition-all group">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
                Performa Teknisi
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 font-mono">
                Workload Distribution Analysis
              </p>
            </div>
            <div className="flex items-center gap-3 px-5 py-2 bg-blue-50 border border-blue-100 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest italic animate-pulse">
              <Users className="w-4 h-4" />
              Synchronized Data
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={getTechnicianData(dateFilteredWorksheets)}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  fontFamily="JetBrains Mono"
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  fontFamily="JetBrains Mono"
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "24px",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.05)",
                  }}
                  itemStyle={{ color: "#2563eb", fontWeight: "bold" }}
                />
                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  radius={[12, 12, 4, 4]}
                  barSize={45}
                  className="transition-all duration-500 hover:opacity-80"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-2xl shadow-slate-200/50 hover:border-blue-200 transition-all group">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase leading-none mb-12">
            Status Protocol
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={getStatusData(dateFilteredWorksheets)}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {getStatusData(dateFilteredWorksheets).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#2563eb", "#f1f5f9"][index % 2]}
                      className="transition-all duration-500"
                    />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-5 mt-12 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
            {getStatusData(dateFilteredWorksheets).map((d, i) => (
              <div
                key={d.name}
                className="flex items-center justify-between px-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: i === 0 ? "#2563eb" : "#cbd5e1" }}
                  ></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                    {d.name}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 italic font-mono">
                  {d.value} Units
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200/60 transition-all hover:border-blue-200">
          <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest italic">
                Operation Log Registry
              </h3>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] font-mono mt-1">
                Real-time Task Audit Trail
              </p>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-12 pr-6 py-3 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 w-full md:w-80 shadow-sm transition-all italic font-mono uppercase"
              />
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-[0.3em] font-mono border-b border-slate-100 italic">
                <tr>
                  <th className="px-10 py-6">Registry ID</th>
                  <th className="px-10 py-6">Instrument Module</th>
                  <th className="px-10 py-6">Personnel</th>
                  <th className="px-10 py-6">Status Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredWorksheets.length > 0 ? (
                  filteredWorksheets.map((w) => (
                    <tr
                      key={w.id}
                      className="hover:bg-blue-50/30 transition-all group cursor-default"
                    >
                      <td className="px-10 py-6">
                        <p className="text-[11px] font-black text-blue-600 group-hover:underline underline-offset-4 decoration-blue-500 uppercase tracking-widest font-mono">
                          LK-{w.id.slice(0, 12).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-sm font-black text-slate-900 italic tracking-tight group-hover:text-blue-600 transition-colors">
                          {w.deviceName}
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 font-mono italic">
                          {w.fasyankesName}
                        </p>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-black group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all shadow-inner">
                            {w.technicianName?.[0] || "U"}
                          </div>
                          <span className="text-[11px] text-slate-500 font-black uppercase tracking-tight italic">
                            {w.technicianName}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border italic shadow-sm",
                            w.status === "completed" || w.status === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-white text-slate-400 border-slate-200",
                          )}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-24 text-center opacity-40 italic text-sm"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">
                        No data matches current cognitive filters
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Schedule */}
        <div className="bg-white border border-slate-100 rounded-[3.5rem] p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden transition-all hover:border-blue-200 flex flex-col">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 blur-[80px] rounded-full -mr-10 -mt-10" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-4 italic relative">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            Maintenance Protocol
          </h3>
          <div className="space-y-6 flex-1">
            {worksheets
              .filter((w) => w.status === "completed")
              .slice(0, 6)
              .map((w) => (
                <div
                  key={w.id}
                  className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-5 transition-opacity">
                    <Activity className="w-16 h-16 text-blue-600" />
                  </div>
                  <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors italic tracking-tight mb-2">
                    {w.deviceName}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic font-mono truncate max-w-[150px]">
                      {w.fasyankesName}
                    </span>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 font-mono tracking-widest italic group-hover:bg-blue-600 group-hover:text-white transition-all">
                      EXP: 2025
                    </span>
                  </div>
                </div>
              ))}
            {worksheets.filter((w) => w.status === "completed").length ===
              0 && (
              <div className="py-24 text-center opacity-30 flex flex-col items-center justify-center space-y-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] shadow-inner">
                  <Calendar className="w-12 h-12 text-slate-300" />
                </div>
                <p className="text-[10px] uppercase font-black tracking-[0.3em] font-mono italic">
                  No upcoming maintenance taskings.
                </p>
              </div>
            )}
          </div>
          <button className="w-full py-5 mt-10 rounded-[1.8rem] bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 active:scale-95 italic">
            Review Full Schedule Matrix
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    blue: "bg-white border-slate-100 shadow-slate-200/50 group-hover:border-blue-200",
    indigo:
      "bg-white border-slate-100 shadow-slate-200/50 group-hover:border-indigo-200",
    emerald:
      "bg-white border-slate-100 shadow-slate-200/50 group-hover:border-emerald-200",
  };

  const iconColors: any = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div
      className={cn(
        "p-10 rounded-[3rem] border shadow-2xl transition-all group overflow-hidden relative",
        colors[color],
      )}
    >
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-10 -mt-10 opacity-5 group-hover:scale-150 transition-all duration-700",
          color === "blue"
            ? "bg-blue-600"
            : color === "indigo"
              ? "bg-indigo-600"
              : "bg-emerald-600",
        )}
      />
      <div className="relative z-10">
        <div
          className={cn(
            "p-4 rounded-2xl w-fit mb-8 shadow-inner",
            iconColors[color],
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 italic font-mono">
          {label}
        </p>
        <p className="text-4xl font-black tracking-tighter text-slate-900 italic">
          {value}
        </p>
      </div>
    </div>
  );
}

function FilterGroup({ label, icon: Icon, children }: any) {
  return (
    <div className="space-y-4 relative w-full">
      <div className="flex items-center gap-3 px-1">
        <Icon className="w-4 h-4 text-blue-600" />
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-mono">
          {label}
        </label>
      </div>
      <div className="relative group">
        {children}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-blue-600 transition-colors">
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
