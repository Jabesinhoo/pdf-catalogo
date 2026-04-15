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
  User,
  Trash2,
  AlertTriangle,
  CheckCircle2
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
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState('bar');

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showSuccessDeleteModal, setShowSuccessDeleteModal] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

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
        setUsers(data.users || []);
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

      if (!statsRes.ok) {
        throw new Error(statsData.message || 'No se pudieron cargar las estadísticas');
      }

      if (!summaryRes.ok) {
        throw new Error(summaryData.message || 'No se pudo cargar el resumen');
      }

      if (!totalsRes.ok) {
        throw new Error(totalsData.message || 'No se pudieron cargar los totales');
      }

      if (statsData.success) {
        setStats(statsData.stats || []);
      }

      if (summaryData.success) {
        setSummary(summaryData.summary || []);
      }

      if (totalsData.success) {
        setTotals(totalsData.totals || null);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError(err.message || 'Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteAllModal = () => {
    setShowConfirmDeleteModal(true);
  };

  const closeDeleteAllModal = () => {
    if (deletingAll) return;
    setShowConfirmDeleteModal(false);
  };

  const handleDeleteAllDocuments = async () => {
    setDeletingAll(true);
    setError('');

    try {
      const response = await fetch('/api/stats/admin/delete-all', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudieron eliminar los documentos');
      }

      setDeletedCount(data.affectedRows ?? 0);
      setShowConfirmDeleteModal(false);
      setShowSuccessDeleteModal(true);

      await loadStats();
    } catch (err) {
      console.error('Error eliminando documentos:', err);
      setError(err.message || 'Error eliminando documentos');
      setShowConfirmDeleteModal(false);
    } finally {
      setDeletingAll(false);
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
      const date = new Date(periodStr.includes('T') ? periodStr : `${periodStr}T12:00:00Z`);

      if (isNaN(date.getTime())) return periodStr;

      if (period === 'year') {
        return date.getUTCFullYear().toString();
      }

      if (period === 'month') {
        return date.toLocaleDateString('es-CO', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC'
        });
      }

      if (period === 'day') {
        return date.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC'
        });
      }

      if (period === 'week' || period === 'biweek') {
        return date.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC'
        });
      }

      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC'
      });
    } catch {
      return periodStr;
    }
  };

  const processStatsData = () => {
    const grouped = {};

    stats.forEach((item) => {
      const key = formatPeriodLabel(item.period);

      if (!grouped[key]) {
        grouped[key] = {
          periodo: key,
          cotizaciones: 0,
          catalogos: 0,
          total: 0,
          productos: 0,
          _rawPeriod: item.period
        };
      }

      const quotes = Number(item.quotes ?? item.cotizaciones ?? 0);
      const catalogs = Number(item.catalogs ?? item.catalogos ?? 0);
      const products = Number(item.products ?? item.productos ?? 0);

      grouped[key].cotizaciones += quotes;
      grouped[key].catalogos += catalogs;
      grouped[key].total += quotes + catalogs;
      grouped[key].productos += products;
    });

    return Object.values(grouped).sort((a, b) => {
      return new Date(a._rawPeriod) - new Date(b._rawPeriod);
    });
  };

  const barChartData = processStatsData();

  const lineChartData = barChartData.map((item) => ({
    periodo: item.periodo,
    productos: item.productos,
    documentos: item.total
  }));

  const pieChartData = summary
    .slice(0, 6)
    .map((user) => ({
      name: user.username,
      value: Number(user.total_documents) || 0
    }))
    .filter((item) => item.value > 0);

  const getPeriodLabel = () => {
    const p = periods.find((p) => p.value === period);
    return p ? p.label : 'Diario';
  };

  const getUserName = () => {
    if (selectedUser === 'all') return 'Todos los usuarios';
    const user = users.find((u) => u.username === selectedUser);
    return user ? (user.full_name || user.username) : selectedUser;
  };

  const getTotalPeriodDocs = () => {
    return barChartData.reduce((sum, item) => sum + item.total, 0);
  };

  const hasData = barChartData.length > 0 && barChartData.some(
    (item) => item.cotizaciones > 0 || item.catalogos > 0 || item.total > 0
  );

  return (
    <>
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
                  {periods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
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
                  {users.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.full_name || user.username} ({user.role === 'admin' ? 'Admin' : 'Asesor'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="statsRefreshBtn"
                onClick={loadStats}
                disabled={loading || deletingAll}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                <span>Actualizar</span>
              </button>

              <button
                type="button"
                onClick={openDeleteAllModal}
                disabled={loading || deletingAll}
                className="statsDeleteBtn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.72rem 1rem',
                  fontWeight: 600,
                  cursor: loading || deletingAll ? 'not-allowed' : 'pointer',
                  opacity: loading || deletingAll ? 0.7 : 1
                }}
              >
                <Trash2 size={14} />
                <span>{deletingAll ? 'Eliminando...' : 'Eliminar todo'}</span>
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
                <p className="statsEmptyHint">
                  Intenta con otro periodo o selecciona un usuario diferente
                </p>

                {stats.length > 0 && (
                  <p
                    className="statsEmptyHint"
                    style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      marginTop: 8
                    }}
                  >
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
                          <YAxis
                            stroke="#94a3b8"
                            tick={{ fontSize: 11 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              borderColor: '#334155',
                              fontSize: 12
                            }}
                            labelStyle={{ color: '#f1f5f9' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="cotizaciones"
                            name="Cotizaciones"
                            fill="#8aa646"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="catalogos"
                            name="Catalogos"
                            fill="#2563eb"
                            radius={[4, 4, 0, 0]}
                          />
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
                          <YAxis
                            stroke="#94a3b8"
                            tick={{ fontSize: 11 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              borderColor: '#334155',
                              fontSize: 12
                            }}
                            labelStyle={{ color: '#f1f5f9' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line
                            type="monotone"
                            dataKey="documentos"
                            name="Documentos"
                            stroke="#8aa646"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="productos"
                            name="Productos"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
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
                            label={({ name, percent }) =>
                              percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                            }
                            outerRadius={90}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>

                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              borderColor: '#334155',
                              fontSize: 12
                            }}
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
              <p>
                Periodo: {getPeriodLabel()} | Usuario: {getUserName()} | {stats.length} registros
              </p>
            </div>
          </div>
        </div>
      </div>

      {showConfirmDeleteModal && (
        <div className="statsModalOverlay" onClick={closeDeleteAllModal}>
          <div
            className="statsModal"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="statsModalHeader">
              <div className="statsModalTitle">
                <AlertTriangle size={22} />
                <h2>Confirmar eliminación</h2>
              </div>

              <button className="statsCloseBtn" onClick={closeDeleteAllModal} disabled={deletingAll}>
                <X size={18} />
              </button>
            </div>

            <div className="statsModalContent">
              <p style={{ marginBottom: '0.9rem', lineHeight: 1.6 }}>
                ¿Seguro que deseas eliminar <strong>TODAS</strong> las cotizaciones y catálogos de
                <strong> TODOS los usuarios</strong>?
              </p>

              <p style={{ marginBottom: '1.2rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Esta acción borrará los documentos del listado actual y de la base operativa,
                pero mantendrá las estadísticas y gráficas históricas.
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1rem'
                }}
              >
                <button
                  type="button"
                  onClick={closeDeleteAllModal}
                  disabled={deletingAll}
                  style={{
                    background: '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    cursor: deletingAll ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAllDocuments}
                  disabled={deletingAll}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontWeight: 600,
                    cursor: deletingAll ? 'not-allowed' : 'pointer',
                    opacity: deletingAll ? 0.7 : 1
                  }}
                >
                  {deletingAll ? 'Eliminando...' : 'Sí, eliminar todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessDeleteModal && (
        <div className="statsModalOverlay" onClick={() => setShowSuccessDeleteModal(false)}>
          <div
            className="statsModal"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="statsModalHeader">
              <div className="statsModalTitle">
                <CheckCircle2 size={22} />
                <h2>Eliminación completada</h2>
              </div>

              <button className="statsCloseBtn" onClick={() => setShowSuccessDeleteModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="statsModalContent">
              <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                Se archivaron y eliminaron del listado actual <strong>{deletedCount}</strong> documentos.
              </p>

              <p style={{ color: '#94a3b8', marginBottom: '1.2rem', lineHeight: 1.6 }}>
                Las estadísticas y gráficas históricas se conservaron correctamente.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSuccessDeleteModal(false)}
                  style={{
                    background: '#8aa646',
                    color: '#fff',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminStats;