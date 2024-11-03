const healthcheck = require("../controllers/healthcheckController");
const healthcheckRouter = require("express").Router();

healthcheckRouter.get("/", healthcheck);

module.exports = { healthcheckRouter };
