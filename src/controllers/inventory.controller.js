const SparePart = require("../models/SparePart");

exports.create = (req, res) =>
  SparePart.create(req.body).then((r) => res.json(r));

exports.getAll = (req, res) => SparePart.find().then((r) => res.json(r));
