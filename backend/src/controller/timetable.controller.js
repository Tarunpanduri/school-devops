const timetableService = require("../services/timetable.services");

async function getTimetable(req, res) {
  const { class: clazz, section } = req.query;

  if (!clazz || !section) {
    return res.status(400).json({
      error: "class and section are required",
    });
  }

  try {
    const timetable = await timetableService.getTimetable(clazz, section);
    res.json({ timetable });
  } catch (err) {
    console.error("getTimetable error:", err);
    res.status(500).json({ error: "Failed to load timetable" });
  }
}

module.exports = {
  getTimetable,
};

