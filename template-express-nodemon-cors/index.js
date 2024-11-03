const express = require("express");
const cors = require("cors");
const app = express();

// imports
const home = require("./controllers/homeController");
const { healthcheckRouter } = require("./routes/healthcheck");

// middlewares
app.use(express.json());
app.use(cors());

// routes
app.get("/", home);
app.use("/healthcheck", healthcheckRouter);

app.listen(3000, () => {
  console.log("express server listening on PORT 3000...");
});
