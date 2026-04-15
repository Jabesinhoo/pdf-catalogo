const pool = require('../config/db');

async function getUserStats(req, res) {
  try {
    const { period = 'day' } = req.query;
    const userId = req.session.userId;

    const intervals = {
      day: "DATE_TRUNC('day', d.created_at)",
      week: "DATE_TRUNC('week', d.created_at)",
      biweek: "DATE_TRUNC('week', d.created_at + interval '1 week')",
      month: "DATE_TRUNC('month', d.created_at)",
      quarter: "DATE_TRUNC('quarter', d.created_at)",
      semester: "DATE_TRUNC('month', d.created_at + interval '3 months')",
      year: "DATE_TRUNC('year', d.created_at)"
    };

    const interval = intervals[period] || intervals.day;

    const query = `
  SELECT
    ${interval} as period,
    d.type,
    COUNT(*) as count,
    COALESCE(SUM(d.product_count), 0) as total_products
  FROM (
    SELECT
      created_at,
      type::text as type,
      product_count,
      user_id::text as user_id
    FROM saved_documents

    UNION ALL

    SELECT
      created_at,
      type::text as type,
      product_count,
      user_id::text as user_id
    FROM saved_documents_archive
  ) d
  WHERE d.user_id = $1
  GROUP BY period, d.type
  ORDER BY period DESC
`;

    const result = await pool.query(query, [userId]);
    res.json({ success: true, stats: result.rows });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAdminSummary(req, res) {
  try {
    const query = `
  WITH all_documents AS (
    SELECT
      id::text as id,
      type::text as type,
      product_count,
      created_at,
      user_id::text as user_id
    FROM saved_documents

    UNION ALL

    SELECT
      id::text as id,
      type::text as type,
      product_count,
      created_at,
      user_id::text as user_id
    FROM saved_documents_archive
  )
  SELECT
    u.username,
    u.email,
    u.full_name,
    u.role,
    COUNT(d.id) as total_documents,
    COALESCE(SUM(d.product_count), 0) as total_products,
    COUNT(CASE WHEN d.type = 'quote' THEN 1 END) as quotes,
    COUNT(CASE WHEN d.type = 'catalog' THEN 1 END) as catalogs,
    MAX(d.created_at) as last_activity
  FROM users u
  LEFT JOIN all_documents d ON u.username = d.user_id
  GROUP BY u.id, u.username, u.email, u.full_name, u.role
  ORDER BY total_documents DESC
`;

    const result = await pool.query(query);
    res.json({ success: true, summary: result.rows });
  } catch (error) {
    console.error('Error obteniendo resumen admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAdminStats(req, res) {
  try {
    const { period = 'month', userId } = req.query;

    const intervals = {
      day: "DATE_TRUNC('day', d.created_at)",
      week: "DATE_TRUNC('week', d.created_at)",
      biweek: "DATE_TRUNC('week', d.created_at)",
      month: "DATE_TRUNC('month', d.created_at)",
      quarter: "DATE_TRUNC('quarter', d.created_at)",
      semester: "DATE_TRUNC('month', d.created_at) + interval '3 months'",
      year: "DATE_TRUNC('year', d.created_at)"
    };

    const interval = intervals[period] || intervals.month;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (userId && userId !== 'all') {
      whereClause = `AND d.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    const query = `
  WITH all_documents AS (
    SELECT
      created_at,
      type::text as type,
      product_count,
      user_id::text as user_id
    FROM saved_documents

    UNION ALL

    SELECT
      created_at,
      type::text as type,
      product_count,
      user_id::text as user_id
    FROM saved_documents_archive
  )
  SELECT
    ${interval} as period,
    u.username,
    u.full_name,
    COUNT(*) as total,
    COALESCE(SUM(d.product_count), 0) as products,
    COUNT(CASE WHEN d.type = 'quote' THEN 1 END) as quotes,
    COUNT(CASE WHEN d.type = 'catalog' THEN 1 END) as catalogs
  FROM all_documents d
  JOIN users u ON d.user_id = u.username
  WHERE 1=1 ${whereClause}
  GROUP BY period, u.id, u.username, u.full_name
  ORDER BY period DESC, total DESC
`;

    const result = await pool.query(query, params);
    res.json({ success: true, stats: result.rows });
  } catch (error) {
    console.error('Error obteniendo estadísticas admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getGlobalTotals(req, res) {
  try {
    const query = `
  WITH all_documents AS (
    SELECT
      type::text as type,
      product_count
    FROM saved_documents

    UNION ALL

    SELECT
      type::text as type,
      product_count
    FROM saved_documents_archive
  )
  SELECT
    COUNT(DISTINCT u.id) as total_users,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN u.role = 'asesor' THEN 1 END) as asesores,
    (SELECT COUNT(*) FROM all_documents) as total_documents,
    (SELECT COALESCE(SUM(product_count), 0) FROM all_documents) as total_products,
    (SELECT COUNT(*) FROM all_documents WHERE type = 'quote') as total_quotes,
    (SELECT COUNT(*) FROM all_documents WHERE type = 'catalog') as total_catalogs
  FROM users u
`;

    const result = await pool.query(query);
    res.json({ success: true, totals: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo totales globales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAdminUsers(req, res) {
  try {
    const query = `
      SELECT id, username, email, full_name, role, is_active
      FROM users
      ORDER BY username
    `;
    const result = await pool.query(query);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteAllDocumentsKeepingStats(req, res) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const archivedBy = req.session?.username || req.session?.userId || 'admin';

    const moveQuery = `
      INSERT INTO saved_documents_archive (
        id,
        type,
        title,
        products,
        quote_meta,
        orientation,
        product_count,
        customer_name,
        pdf_url,
        user_id,
        created_at,
        updated_at,
        archived_at,
        archived_by
      )
      SELECT
        id,
        type,
        title,
        products,
        quote_meta,
        orientation,
        product_count,
        customer_name,
        pdf_url,
        user_id,
        created_at,
        updated_at,
        NOW(),
        $1
      FROM saved_documents
      RETURNING id
    `;

    const movedResult = await client.query(moveQuery, [archivedBy]);

    const deleteQuery = `DELETE FROM saved_documents`;
    await client.query(deleteQuery);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Todos los documentos fueron archivados y eliminados del listado actual.',
      affectedRows: movedResult.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archivando y eliminando documentos:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

module.exports = {
  getUserStats,
  getAdminSummary,
  getAdminStats,
  getGlobalTotals,
  getAdminUsers,
  deleteAllDocumentsKeepingStats
};