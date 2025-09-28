const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const contactsRoutes = require("./routes/contacts");

const app = express();
app.use(express.json());

app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/contacts", contactsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
