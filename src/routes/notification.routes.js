const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const Notification = require("../models/Notification");

// list
router.get("/", auth, async (req, res) => {
  const data = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(data);
});

// unread count
router.get("/unread-count", auth, async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    isRead: false,
  });
  res.json({ count });
});

// mark read
router.patch("/:id/read", auth, async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { isRead: true },
  );
  res.sendStatus(204);
});

// mark all read
router.patch("/read-all", auth, async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true },
  );
  res.sendStatus(204);
});

module.exports = router;
