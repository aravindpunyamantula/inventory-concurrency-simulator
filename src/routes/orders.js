const express = require('express');
const pool = require('../db');

const pessimisticOrder = require('../services/pessimisticService');
const optimisticOrder = require('../services/optimisticService');

const router = express.Router();

/**
 * POST /api/orders/pessimistic
 */
router.post('/pessimistic', async (req, res) => {
  const { productId, quantity, userId } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await pessimisticOrder(client, productId, quantity);

    const orderResult = await client.query(
      `INSERT INTO orders (product_id, quantity_ordered, user_id, status)
       VALUES ($1, $2, $3, 'SUCCESS') RETURNING id`,
      [productId, quantity, userId]
    );

    const product = await client.query(
      'SELECT stock FROM products WHERE id=$1',
      [productId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      orderId: orderResult.rows[0].id,
      productId,
      quantityOrdered: quantity,
      stockRemaining: product.rows[0].stock
    });

  } catch (err) {
    await client.query('ROLLBACK');

    let status = 'FAILED_OUT_OF_STOCK';
    let code = 400;
    let message = 'Insufficient stock';

    if (err === 'NOT_FOUND') {
      code = 404;
      message = 'Product not found';
    }

    await pool.query(
      `INSERT INTO orders (product_id, quantity_ordered, user_id, status)
       VALUES ($1, $2, $3, $4)`,
      [productId, quantity, userId, status]
    );

    res.status(code).json({ error: message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/orders/optimistic
 */
router.post('/optimistic', async (req, res) => {
  const { productId, quantity, userId } = req.body;
  const maxRetries = Number(process.env.MAX_OPTIMISTIC_RETRIES || 3);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await optimisticOrder(client, productId, quantity);

      const orderResult = await client.query(
        `INSERT INTO orders (product_id, quantity_ordered, user_id, status)
         VALUES ($1, $2, $3, 'SUCCESS') RETURNING id`,
        [productId, quantity, userId]
      );

      const product = await client.query(
        'SELECT stock, version FROM products WHERE id=$1',
        [productId]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        orderId: orderResult.rows[0].id,
        productId,
        quantityOrdered: quantity,
        stockRemaining: product.rows[0].stock,
        newVersion: product.rows[0].version
      });

    } catch (err) {
      await client.query('ROLLBACK');
      client.release();

      if (err === 'CONFLICT' && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 50 * attempt)); // exponential backoff
        continue;
      }

      let status = 'FAILED_CONFLICT';
      let code = 409;
      let message = 'Failed to place order due to concurrent modification. Please try again.';

      if (err === 'OUT_OF_STOCK') {
        status = 'FAILED_OUT_OF_STOCK';
        code = 400;
        message = 'Insufficient stock';
      }

      await pool.query(
        `INSERT INTO orders (product_id, quantity_ordered, user_id, status)
         VALUES ($1, $2, $3, $4)`,
        [productId, quantity, userId, status]
      );

      return res.status(code).json({ error: message });
    }
  }
});

/**
 * GET /api/orders/stats
 */
router.get('/stats', async (_, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='SUCCESS') AS success,
      COUNT(*) FILTER (WHERE status='FAILED_OUT_OF_STOCK') AS out_of_stock,
      COUNT(*) FILTER (WHERE status='FAILED_CONFLICT') AS conflict
    FROM orders
  `);

  res.json({
    totalOrders: Number(rows[0].total),
    successfulOrders: Number(rows[0].success),
    failedOutOfStock: Number(rows[0].out_of_stock),
    failedConflict: Number(rows[0].conflict)
  });
});

module.exports = router;