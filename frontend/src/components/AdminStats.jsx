import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Package, 
  X, 
  RefreshCw,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#8aa646', '#2563eb', '#f59e0b', '#ef4444', '#22c55e'];

function AdminStats({ onClose }) {
  const [period, setPeriod] = useState('day');
  const [selectedUser, setSelectedUser] = useState('all');
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState([]);
  const [totals, setTotals] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState('bar');

  const periods = [
    { value: 'day', label: 'Diario' },
    { value: 'week', label: 'Semanal' },
    { value: 'biweek', label: 'Quincenal' },
    { value: 'month', label: 'Mensual' },
    { value: 'quarter', label: 'Trimestral' },
    { value: 'semester', label: 'Semestral' },
    { value: 'year', label: 'Anual' }
  ];

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/stats/admin/users', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        period,
        userId: selectedUser !== 'all' ? selectedUser : ''
      });
      
      const [statsRes, summaryRes, totalsRes] = await Promise.all([
        fetch(`/api/stats/admin/stats?${params}`, { credentials: 'include' }),
        fetch('/api/stats/admin/summary', { credentials: 'include' }),
        fetch('/api/stats/admin/totals', { credentials: 'include' })
      ]);
      
      const statsData = await statsRes.json();
      const summaryData = await summaryRes.json();
      const totalsData = await totalsRes.json();
      
      if (statsData.success) {
        console.log('Stats data recibida:', statsData.stats);
        setStats(statsData.stats || []);
      }
      if (summaryData.success) setSummary(summaryData.summary || []);
      if (totalsData.success) setTotals(totalsData.totals);
    } catch (err) {
      console.error('Error:', err);
      setError('Error cargando estadisticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  useEffect(() => {
    loadStats();
  }, [period, selectedUser]);

  const formatPeriodLabel = (periodStr) => {
    if (!periodStr) return '';
    try {
      // Forzar parseo como UTC para evitar desfase de zona horaria
      const date = new Date(periodStr.includes('T') ? periodStr : periodStr + 'T12:00:00Z');
      if (isNaN(date.getTime())) return periodStr;
      
      if (period === 'year') {
        return date.getUTCFullYear().toString();
      }
      if (period === 'month') {
        return date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      }
      if (period === 'day') {
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'UTC' });
      }
      if (period === 'week' || period === 'biweek') {
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'UTC' });
      }
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'UTC' });
    } catch {
      return periodStr;
    }
  };

  // Preparar datos para gráficos - agrupar por período
  // FIX: usar tanto nombres en inglés (quotes/catalogs) como en español por si la API varía
  const processStatsData = () => {
    const grouped = {};
    
    stats.forEach(item => {
      const key = formatPeriodLabel(item.period);
      if (!grouped[key]) {
        grouped[key] = {
          periodo: key,
          cotizaciones: 0,
          catalogos: 0,
          total: 0,
          productos: 0,
          _rawPeriod: item.period  // para ordenar correctamente
        };
      }
      // FIX: soportar campos en inglés y en español
      const quotes   = Number(item.quotes   ?? item.cotizaciones ?? 0);
      const catalogs = Number(item.catalogs  ?? item.catalogos   ?? 0);
      const products = Number(item.products  ?? item.productos   ?? 0);

      grouped[key].cotizaciones += quotes;
      grouped[key].catalogos   += catalogs;
      grouped[key].total       += quotes + catalogs;
      grouped[key].productos   += products;
    });

    // Ordenar por fecha real (no por etiqueta formateada)
    return Object.values(grouped).sort((a, b) => {
      return new Date(a._rawPeriod) - new Date(b._rawPeriod);
    });
  };

  const barChartData = processStatsData();

  console.log('barChartData procesada:', barChartData);

  const lineChartData = barChartData.map(item => ({
    periodo: item.periodo,
    productos: item.productos,
    documentos: item.total
  }));

  const pieChartData = summary.slice(0, 6).map(user => ({
    name: user.username,
    value: Number(user.total_documents) || 0
  })).filter(item => item.value > 0);

  const getPeriodLabel = () => {
    const p = periods.find(p => p.value === period);
    return p ? p.label : 'Diario';
  };

  const getUserName = () => {
    if (selectedUser === 'all') return 'Todos los usuarios';
    const user = users.find(u => u.username === selectedUser);
    return user ? (user.full_name || user.username) : selectedUser;
  };

  const getTotalPeriodDocs = () => {
    return barChartData.reduce((sum, item) => sum + item.total, 0);
  };

  // FIX: hasData ahora verifica cotizaciones O catalogos, no solo total
  const hasData = barChartData.length > 0 && barChartData.some(
    item => item.cotizaciones > 0 || item.catalogos > 0 || item.total > 0
  );

  return (
    <div className="statsModalOverlay" onClick={onClose}>
      <div className="statsModal" onClick={(e) => e.stopPropagation()}>
        <div className="statsModalHeader">
          <div className="statsModalTitle">
            <BarChart3 size={22} />
            <h2>Estadisticas</h2>
          </div>
          <button className="statsCloseBtn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="statsModalContent">
          <div className="statsFilters">
            <div className="statsFilterGroup">
              <Calendar size={14} />
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                {periods.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="statsFilterGroup">
              <User size={14} />
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="all">Todos los usuarios</option>
                {users.map(user => (
                  <option key={user.id} value={user.username}>
                    {user.full_name || user.username} ({user.role === 'admin' ? 'Admin' : 'Asesor'})
                  </option>
                ))}
              </select>
            </div>

            <button className="statsRefreshBtn" onClick={loadStats} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>

          {error && <div className="statsError">{error}</div>}

          {totals && (
            <div className="statsCards">
              <div className="statsCard">
                <Users size={20} />
                <div>
                  <strong>{totals.total_users}</strong>
                  <span>Usuarios</span>
                </div>
              </div>
              <div className="statsCard">
                <FileText size={20} />
                <div>
                  <strong>{totals.total_documents}</strong>
                  <span>Documentos</span>
                </div>
                <small>{totals.total_quotes} cotiz · {totals.total_catalogs} catal</small>
              </div>
              <div className="statsCard">
                <Package size={20} />
                <div>
                  <strong>{totals.total_products}</strong>
                  <span>Productos</span>
                </div>
              </div>
              <div className="statsCard">
                <TrendingUp size={20} />
                <div>
                  <strong>{getPeriodLabel()}</strong>
                  <span>{getTotalPeriodDocs()} docs</span>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="statsLoading">Cargando datos...</div>
          ) : !hasData ? (
            <div className="statsEmpty">
              <p>No hay datos para mostrar en este periodo</p>
              <p className="statsEmptyHint">Intenta con otro periodo o selecciona un usuario diferente</p>
              {/* DEBUG temporal: mostrar qué llegó de la API */}
              {stats.length > 0 && (
                <p className="statsEmptyHint" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                  (Se recibieron {stats.length} registros — revisa la consola para ver los datos)
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="statsChartTabs">
                <button 
                  className={`statsTabBtn ${activeChart === 'bar' ? 'active' : ''}`}
                  onClick={() => setActiveChart('bar')}
                >
                  Barras
                </button>
                <button 
                  className={`statsTabBtn ${activeChart === 'line' ? 'active' : ''}`}
                  onClick={() => setActiveChart('line')}
                >
                  Tendencia
                </button>
                {pieChartData.length > 0 && (
                  <button 
                    className={`statsTabBtn ${activeChart === 'pie' ? 'active' : ''}`}
                    onClick={() => setActiveChart('pie')}
                  >
                    Distribucion
                  </button>
                )}
              </div>

              <div className="statsChartContainer">
                {activeChart === 'bar' && (
                  <div className="statsChartCard">
                    <h3>Documentos por periodo — {getUserName()}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="periodo" 
                          stroke="#94a3b8" 
                          tick={{ fontSize: 11 }} 
                          angle={-25} 
                          textAnchor="end" 
                          height={50}
                          interval={0}
                        />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: 12 }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="cotizaciones" name="Cotizaciones" fill="#8aa646" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="catalogos" name="Catalogos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChart === 'line' && (
                  <div className="statsChartCard">
                    <h3>Tendencia — {getUserName()}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="periodo" 
                          stroke="#94a3b8" 
                          tick={{ fontSize: 11 }} 
                          angle={-25} 
                          textAnchor="end" 
                          height={50}
                          interval={0}
                        />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: 12 }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="documentos" name="Documentos" stroke="#8aa646" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="productos" name="Productos" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {activeChart === 'pie' && pieChartData.length > 0 && (
                  <div className="statsChartCard">
                    <h3>Top usuarios por documentos</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: 12 }}
                          formatter={(value) => [`${value} documentos`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="statsFooter">
            <p>Periodo: {getPeriodLabel()} | Usuario: {getUserName()} | {stats.length} registros</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminStats;