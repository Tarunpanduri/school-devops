// backend/src/controllers/classes.controller.js
const classesService = require("../services/classes.services");

async function listClasses(req, res) {
  try {
    const classes = await classesService.getClasses();
    res.json({ classes });
  } catch (err) {
    console.error("listClasses error:", err);
    res.status(500).json({ error: "Failed to load classes" });
  }
}

async function listSections(req, res) {
  const currentClass = req.params.class;
  if (!currentClass) {
    return res.status(400).json({ error: "Class is required" });
  }

  try {
    const sections = await classesService.getSectionsByClass(currentClass);
    res.json({ sections });
  } catch (err) {
    console.error("listSections error:", err);
    res.status(500).json({ error: "Failed to load sections" });
  }
}

module.exports = {
  listClasses,
  listSections,
};
