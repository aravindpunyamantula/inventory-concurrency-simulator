require('dotenv').config();
const express = require('express');

const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.send('OK'));

app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);

const PORT = process.env.API_PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});