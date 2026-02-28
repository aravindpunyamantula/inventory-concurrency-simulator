async function optimisticOrder(client, productId, quantity) {
  const { rows } = await client.query(
    'SELECT stock, version FROM products WHERE id=$1',
    [productId]
  );

  if (!rows.length) throw 'NOT_FOUND';
  if (rows[0].stock < quantity) throw 'OUT_OF_STOCK';

  const result = await client.query(
    `UPDATE products
     SET stock = stock - $1, version = version + 1
     WHERE id=$2 AND version=$3`,
    [quantity, productId, rows[0].version]
  );

  if (result.rowCount === 0) throw 'CONFLICT';
}

module.exports = optimisticOrder;