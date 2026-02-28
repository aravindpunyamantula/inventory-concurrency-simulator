async function optimisticOrder(client, productId, quantity) {
  const { rows } = await client.query(
    'SELECT stock, version FROM products WHERE id = $1',
    [productId]
  );

  if (!rows.length) throw 'NOT_FOUND';
  if (rows[0].stock < quantity) throw 'OUT_OF_STOCK';

  // 🔥 Strong artificial delay to FORCE overlap
  // Simulates validation, pricing, fraud checks, etc.
  await new Promise(resolve => setTimeout(resolve, 200));

  const update = await client.query(
    `UPDATE products
     SET stock = stock - $1,
         version = version + 1
     WHERE id = $2 AND version = $3`,
    [quantity, productId, rows[0].version]
  );

  if (update.rowCount === 0) {
    throw 'CONFLICT';
  }
}

module.exports = optimisticOrder;