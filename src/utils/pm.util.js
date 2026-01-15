function normalizeDate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

exports.calculateNextRun = (current, frequency) => {
  const base = normalizeDate(current);
  const next = new Date(base);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;

    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;

    case "MONTHLY": {
      const day = next.getDate();
      next.setDate(1); // tránh tràn
      next.setMonth(next.getMonth() + 1);

      const lastDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();

      next.setDate(Math.min(day, lastDay));
      break;
    }

    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
};
