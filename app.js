const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const contactsRoutes = require("./routes/contacts");
const subscriptionsRoutes = require("./routes/subscriptions");
const userSubscriptionsRoutes = require("./routes/userSubscriptions");
const shippingZonesRoutes = require("./routes/shippingZones");
const jwtRoutes = require("./routes/jwt");

const app = express();
app.use(express.json());

app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/user-subscriptions", userSubscriptionsRoutes);
app.use("/api/shipping-zones", shippingZonesRoutes);
app.use("/api/jwt", jwtRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
