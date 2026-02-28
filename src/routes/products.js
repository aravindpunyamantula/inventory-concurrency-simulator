const express = require('express');
const pool = require('../db');

const router = express.Router();

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, stock, version FROM products WHERE id = $1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/products/reset
 */
router.post('/reset', async (_req, res) => {
  try {
    await pool.query(`
      UPDATE products
      SET stock = 1000,
          version = 1
    `);

    res.json({ message: 'Product inventory reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset inventory' });
  }
});

module.exports = router;