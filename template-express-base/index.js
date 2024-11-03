const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    msg: "Hi this is the root page"
  })
})

app.listen(3000, () => {
  console.log("express server listening on PORT 3000...");
});
