# Inventory Concurrency Control Simulator

## Overview

This project is a **database concurrency control simulator** for an inventory management system.
It demonstrates and compares **pessimistic locking** and **optimistic locking** strategies when handling **concurrent order requests**.

The system is implemented as a **REST API** using **Node.js, Express, and PostgreSQL**, fully containerized with **Docker and Docker Compose**. It is designed to model real-world high-contention scenarios commonly found in **e-commerce, finance, and retail systems**.

The project focuses on:

* Preventing race conditions
* Maintaining data integrity under concurrency
* Demonstrating transaction management and conflict handling
* Observing database-level locking behavior

---

## Technology Stack

* Node.js
* Express.js
* PostgreSQL 15
* Docker
* Docker Compose
* Bash (for concurrency and lock monitoring scripts)

---

## Architecture Summary

* The **API service** exposes endpoints for products and orders.
* The **database service** stores products and orders and enforces integrity constraints.
* All stock updates occur inside **explicit database transactions**.
* Two different concurrency control strategies are implemented:

  * **Pessimistic locking** using row-level locks (`SELECT ... FOR UPDATE`)
  * **Optimistic locking** using a `version` column and conditional updates

---

## Database Schema

The database is initialized automatically using a seed script.

### Products Table

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0),
    version INTEGER NOT NULL DEFAULT 1
);
```

* `stock` has a database-level constraint to prevent negative values.
* `version` is used for optimistic locking to detect concurrent modifications.

### Orders Table

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    quantity_ordered INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

* Each order records its final outcome:

  * `SUCCESS`
  * `FAILED_OUT_OF_STOCK`
  * `FAILED_CONFLICT`

---

## Concurrency Control Strategies

### Pessimistic Locking

* Assumes conflicts are likely.
* Uses `SELECT ... FOR UPDATE` to acquire a row-level lock on the product.
* Other transactions attempting to access the same row must wait until the lock is released.
* Implemented entirely within a single transaction.

Used when:

* Contention is high
* Failing a transaction is expensive

---

### Optimistic Locking

* Assumes conflicts are rare.
* No database locks are taken during reads.
* Uses a `version` column to detect concurrent updates.
* Stock updates are performed with a conditional statement:

  ```sql
  UPDATE products
  SET stock = stock - ?, version = version + 1
  WHERE id = ? AND version = ?
  ```
* If zero rows are affected, a conflict is detected.
* The transaction is retried up to a configurable number of attempts using exponential backoff.

Used when:

* Read concurrency is high
* Conflicts are infrequent
* Higher throughput is desired

---

## Running the Application

### Prerequisites

* Docker
* Docker Compose

No local database or Node.js installation is required.

---

### Environment Variables

A `.env.example` file is provided.
Create a `.env` file based on it if needed.

```env
API_PORT=8080
DATABASE_URL=postgresql://user:password@db:5432/inventory_db
MAX_OPTIMISTIC_RETRIES=3
```

---

### Build and Start the System

From the **root directory**:

```bash
docker-compose up --build
```

This will:

* Build the application image
* Start PostgreSQL
* Seed the database
* Start the API only after the database is healthy

---

### Health Check

```bash
GET /health
```

Expected response:

```
OK
```

---

## API Endpoints

### Reset Product Inventory

```http
POST /api/products/reset
```

Resets:

* Stock to initial values
* Version to `1`

Response:

```json
{
  "message": "Product inventory reset successfully."
}
```

---

### Get Product Details

```http
GET /api/products/{id}
```

Success:

```json
{
  "id": 1,
  "name": "Super Widget",
  "stock": 100,
  "version": 1
}
```

Not found:

```json
{
  "error": "Product not found"
}
```

---

### Create Order (Pessimistic Locking)

```http
POST /api/orders/pessimistic
```

Request:

```json
{
  "productId": 1,
  "quantity": 10,
  "userId": "user-1"
}
```

Success:

```json
{
  "orderId": 123,
  "productId": 1,
  "quantityOrdered": 10,
  "stockRemaining": 90
}
```

Failure (insufficient stock):

```json
{
  "error": "Insufficient stock"
}
```

---

### Create Order (Optimistic Locking)

```http
POST /api/orders/optimistic
```

Request:

```json
{
  "productId": 1,
  "quantity": 10,
  "userId": "user-2"
}
```

Success:

```json
{
  "orderId": 124,
  "productId": 1,
  "quantityOrdered": 10,
  "stockRemaining": 90,
  "newVersion": 2
}
```

Conflict after retries:

```json
{
  "error": "Failed to place order due to concurrent modification. Please try again."
}
```

---

### Order Statistics

```http
GET /api/orders/stats
```

Response:

```json
{
  "totalOrders": 40,
  "successfulOrders": 19,
  "failedOutOfStock": 0,
  "failedConflict": 21
}
```

This endpoint is the **primary verification mechanism** for concurrency correctness.

---

## Concurrency Testing

### Concurrent API Test Script

`concurrent-test.sh`

Purpose:

* Simulates high-contention concurrent requests
* Fires multiple requests in parallel
* Demonstrates oversell prevention and conflict handling

Usage:

```bash
./concurrent-test.sh pessimistic
./concurrent-test.sh optimistic
```

---

### Database Lock Monitoring Script

`monitor-locks.sh`

Purpose:

* Queries PostgreSQL system tables (`pg_locks`)
* Displays active locks in real time
* Used to verify pessimistic locking at the database level

Usage:

```bash
./monitor-locks.sh
```

Run this while executing pessimistic order requests to observe row-level locks.

---

## Transaction Management

* All write operations are executed inside explicit transactions.
* Transactions are committed only after successful validation and updates.
* On any error:

  * Transactions are rolled back
  * Database connections are released
* Connection pooling is handled correctly to prevent leaks.

---

## Error Handling

* `400 Bad Request` for insufficient stock
* `404 Not Found` for missing products
* `409 Conflict` for optimistic locking failures
* Meaningful error messages returned for all failure scenarios

---

## Stateless Design

* The API is fully stateless.
* All information required to process a request is provided in the request body.
* No session state is stored in memory.

---

## Containerization and Deployment

The repository includes:

* `Dockerfile`
* `docker-compose.yml`
* `.env.example`
* Database seed scripts
* All source code and test scripts

A single command is sufficient to run the entire system:

```bash
docker-compose up --build
```





