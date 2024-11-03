const express = require("express");
const cors = require("cors");
const app = express();

// imports
const home = require("./controllers/homeController");
const { healthcheckRouter } = require("./routes/healthcheck");

// middlewares
app.use(express.json());
app.use(cors()); // WARN: cors() with no config means all origins are allowed. In production specifiy allowed origins

// routes
app.get("/", home);
app.use("/healthcheck", healthcheckRouter); // NOTE: using express.Router example

app.listen(3000, () => {
  console.log("express server listening on PORT 3000...");
});
