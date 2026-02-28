async function pessimisticOrder(client, productId, quantity) {
  const result = await client.query(
    'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
    [productId]
  );

  if (!result.rows.length) throw 'NOT_FOUND';
  if (result.rows[0].stock < quantity) throw 'OUT_OF_STOCK';

  // 👇 DEMO DELAY so lock stays visible
  await new Promise(resolve => setTimeout(resolve, 3000));

  await client.query(
    'UPDATE products SET stock = stock - $1 WHERE id = $2',
    [quantity, productId]
  );
}

module.exports = pessimisticOrder;