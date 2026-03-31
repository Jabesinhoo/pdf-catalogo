const pool = require('../config/db'); // ✅ SOLO ESTO

// Función auxiliar para mapear de snake_case a camelCase
function mapDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    products: row.products,
    quoteMeta: row.quote_meta,
    orientation: row.orientation,
    createdAt: row.created_at,
    productCount: row.product_count,
    customerName: row.customer_name,
    pdfUrl: row.pdf_url,
    userId: row.user_id,
    updatedAt: row.updated_at
  };
}

const db = {
  async saveDocument(document) {
    const query = `
      INSERT INTO saved_documents (
        id, type, title, products, quote_meta, orientation, 
        product_count, customer_name, pdf_url, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      document.id,
      document.type,
      document.title,
      JSON.stringify(document.products || []),
      JSON.stringify(document.quoteMeta || {}),
      document.orientation || 'portrait',
      document.productCount || 0,
      document.customerName || null,
      document.pdfUrl || null,
      document.userId || 'default',
      document.createdAt || new Date().toISOString()
    ];

    const result = await pool.query(query, values);
    return mapDocument(result.rows[0]);
  },

  async getDocumentsByUser(userId, options = {}) {
    let query = 'SELECT * FROM saved_documents WHERE user_id = $1';
    const values = [userId];
    let paramIndex = 2;

    if (options.type && options.type !== 'all') {
      query += ` AND type = $${paramIndex}`;
      values.push(options.type);
      paramIndex++;
    }

    if (options.searchTerm) {
      query += ` AND (title ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`;
      values.push(`%${options.searchTerm}%`);
      paramIndex++;
    }

    switch (options.sortBy) {
      case 'name':
        query += ' ORDER BY title ASC';
        break;
      case 'products':
        query += ' ORDER BY product_count DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, values);
    return result.rows.map(mapDocument);
  },

  async getDocumentById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM saved_documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return mapDocument(result.rows[0]);
  },

  async searchDocuments({ searchTerm, type, sortBy = 'date', userId, limit = 100 }) {
    let query = 'SELECT * FROM saved_documents WHERE user_id = $1';
    const values = [userId];
    let paramIndex = 2;

    if (type && type !== 'all') {
      query += ` AND type = $${paramIndex}`;
      values.push(type);
      paramIndex++;
    }

    if (searchTerm) {
      query += ` AND (title ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`;
      values.push(`%${searchTerm}%`);
      paramIndex++;
    }

    switch (sortBy) {
      case 'name':
        query += ' ORDER BY title ASC';
        break;
      case 'products':
        query += ' ORDER BY product_count DESC';
        break;
      default:
        query += ' ORDER BY created_at DESC';
    }

    query += ` LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.map(mapDocument);
  },

  async deleteDocument(id, userId) {
    const result = await pool.query(
      'DELETE FROM saved_documents WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rows.length > 0;
  },

  async updateDocument(id, userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.title) {
      fields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }
    if (updates.products) {
      fields.push(`products = $${paramIndex}`);
      values.push(JSON.stringify(updates.products));
      paramIndex++;
    }
    if (updates.pdfUrl) {
      fields.push(`pdf_url = $${paramIndex}`);
      values.push(updates.pdfUrl);
      paramIndex++;
    }

    if (fields.length === 0) return null;

    values.push(id, userId);

    const query = `
      UPDATE saved_documents 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return mapDocument(result.rows[0]);
  },

  async getAllUsers() {
    const result = await pool.query(
      'SELECT DISTINCT user_id FROM saved_documents ORDER BY user_id'
    );
    return result.rows.map(row => row.user_id);
  },

  async close() {
    await pool.end(); // ✅ solo si lo usas manualmente
  }
};

module.exports = db;