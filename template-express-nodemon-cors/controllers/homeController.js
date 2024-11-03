function home(req, res) {
  res.json({
    msg: "Hi ya! this is the root route",
  });
}

module.exports = home;
