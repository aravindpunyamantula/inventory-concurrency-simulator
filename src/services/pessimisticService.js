async function pessimisticOrder(client, productId, quantity) {
  const product = await client.query(
    'SELECT stock FROM products WHERE id=$1 FOR UPDATE',
    [productId]
  );

  if (!product.rows.length) throw 'NOT_FOUND';
  if (product.rows[0].stock < quantity) throw 'OUT_OF_STOCK';

  await client.query(
    'UPDATE products SET stock = stock - $1 WHERE id=$2',
    [quantity, productId]
  );
}

module.exports = pessimisticOrder;