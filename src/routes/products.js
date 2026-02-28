const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, stock, version FROM products WHERE id=$1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

router.post('/reset', async (_, res) => {
  await pool.query(`
    UPDATE products SET stock =
      CASE id
        WHEN 1 THEN 100
        WHEN 2 THEN 50
      END,
      version = 1
  `);
  res.json({ message: 'Product inventory reset successfully.' });
});

module.exports = router;