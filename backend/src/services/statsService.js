const pool = require('../config/db'); // ✅ SOLO ESTO

const statsService = {
  async getDocumentStats(userId, period = 'day') {
    const intervals = {
      day: "DATE_TRUNC('day', created_at)",
      week: "DATE_TRUNC('week', created_at)",
      month: "DATE_TRUNC('month', created_at)",
      year: "DATE_TRUNC('year', created_at)",
    };

    const interval = intervals[period] || intervals.day;

    const query = `
      SELECT 
        ${interval} as period,
        type,
        COUNT(*) as count,
        SUM(product_count) as total_products
      FROM saved_documents
      WHERE user_id = $1
      GROUP BY period, type
      ORDER BY period DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async getAdminSummary() {
    const query = `
      SELECT 
        u.username,
        u.email,
        u.full_name,
        u.role,
        COUNT(d.id) as total_documents,
        SUM(d.product_count) as total_products,
        COUNT(CASE WHEN d.type = 'quote' THEN 1 END) as quotes,
        COUNT(CASE WHEN d.type = 'catalog' THEN 1 END) as catalogs,
        MAX(d.created_at) as last_activity
      FROM users u
      LEFT JOIN saved_documents d ON u.username = d.user_id
      GROUP BY u.id, u.username, u.email, u.full_name, u.role
      ORDER BY total_documents DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  },

  async getAdminStatsByPeriod(period = 'month') {
    const intervals = {
      day: "DATE_TRUNC('day', created_at)",
      week: "DATE_TRUNC('week', created_at)",
      month: "DATE_TRUNC('month', created_at)",
      year: "DATE_TRUNC('year', created_at)",
    };

    const interval = intervals[period] || intervals.month;

    const query = `
      SELECT 
        ${interval} as period,
        u.username,
        u.full_name,
        COUNT(d.id) as documents,
        SUM(d.product_count) as products
      FROM saved_documents d
      JOIN users u ON d.user_id = u.username
      GROUP BY period, u.id, u.username, u.full_name
      ORDER BY period DESC, documents DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  },

  async getGlobalTotals() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN role = 'asesor' THEN 1 END) as asesores,
        (SELECT COUNT(*) FROM saved_documents) as total_documents,
        (SELECT SUM(product_count) FROM saved_documents) as total_products,
        (SELECT COUNT(*) FROM saved_documents WHERE type = 'quote') as total_quotes,
        (SELECT COUNT(*) FROM saved_documents WHERE type = 'catalog') as total_catalogs
      FROM users
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
};

module.exports = statsService;