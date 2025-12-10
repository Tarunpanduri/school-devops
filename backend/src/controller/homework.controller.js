// backend/src/controllers/homework.controller.js
const homeworkService = require("../services/homework.servces");

async function listHomework(req, res) {
  const { class: clazz, section, date } = req.query;

  if (!clazz || !section || !date) {
    return res
      .status(400)
      .json({ error: "class, section, and date are required" });
  }

  try {
    const homework = await homeworkService.getHomeworkByClassSectionDate(
      clazz,
      section,
      date
    );
    res.json({ homework });
  } catch (err) {
    console.error("listHomework error:", err);
    res.status(500).json({ error: "Failed to load homework" });
  }
}

async function createHomework(req, res) {
  const { class: clazz, section, homework } = req.body;

  if (!clazz || !section || !homework) {
    return res
      .status(400)
      .json({ error: "class, section, and homework are required" });
  }

  if (!homework.assignedDate) {
    return res
      .status(400)
      .json({ error: "homework.assignedDate is required" });
  }

  try {
    const created = await homeworkService.createHomework(
      clazz,
      section,
      homework
    );
    res.status(201).json({ homework: created });
  } catch (err) {
    console.error("createHomework error:", err);
    res.status(500).json({ error: "Failed to create homework" });
  }
}

async function updateHomework(req, res) {
  const id = Number(req.params.id);
  const { homework } = req.body;

  if (!id || !homework) {
    return res.status(400).json({ error: "id and homework are required" });
  }

  if (!homework.assignedDate) {
    return res
      .status(400)
      .json({ error: "homework.assignedDate is required" });
  }

  try {
    const updated = await homeworkService.updateHomework(id, homework);
    if (!updated) {
      return res.status(404).json({ error: "Homework not found" });
    }
    res.json({ homework: updated });
  } catch (err) {
    console.error("updateHomework error:", err);
    res.status(500).json({ error: "Failed to update homework" });
  }
}

async function removeHomework(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    await homeworkService.deleteHomework(id);
    res.status(204).send();
  } catch (err) {
    console.error("removeHomework error:", err);
    res.status(500).json({ error: "Failed to delete homework" });
  }
}

module.exports = {
  listHomework,
  createHomework,
  updateHomework,
  removeHomework,
};
