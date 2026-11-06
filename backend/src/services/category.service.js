import { query } from '../config/database.js';

export class CategoryService {
  /**
   * Get all active categories for marketplace browsing
   */
  static async getActiveCategories() {
    const res = await query(
      `SELECT category_id, category_name, description, created_at 
       FROM categories 
       WHERE category_status = 'ACTIVE' 
       ORDER BY category_name ASC`
    );
    return res.rows;
  }

  /**
   * Admin: Get all categories including inactive ones
   */
  static async getAllCategories() {
    const res = await query(
      `SELECT c.*, COUNT(s.service_id) AS service_count
       FROM categories c
       LEFT JOIN services s ON c.category_id = s.category_id
       GROUP BY c.category_id
       ORDER BY c.created_at DESC`
    );
    return res.rows;
  }

  /**
   * Admin: Create a new category
   */
  static async createCategory({ category_name, description, category_status }) {
    const check = await query(
      'SELECT category_id FROM categories WHERE category_name ILIKE $1',
      [category_name.trim()]
    );
    if (check.rowCount > 0) {
      const err = new Error('Category with this name already exists');
      err.statusCode = 409;
      throw err;
    }

    const res = await query(
      `INSERT INTO categories (category_name, description, category_status)
       VALUES ($1, $2, COALESCE($3, 'ACTIVE'))
       RETURNING *`,
      [category_name.trim(), description ? description.trim() : null, category_status]
    );
    return res.rows[0];
  }

  /**
   * Admin: Update category
   */
  static async updateCategory(categoryId, { category_name, description, category_status }) {
    const res = await query(
      `UPDATE categories
       SET category_name = COALESCE($1, category_name),
           description = COALESCE($2, description),
           category_status = COALESCE($3, category_status)
       WHERE category_id = $4
       RETURNING *`,
      [category_name ? category_name.trim() : null, description ? description.trim() : null, category_status || null, categoryId]
    );

    if (res.rowCount === 0) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }
    return res.rows[0];
  }
}
