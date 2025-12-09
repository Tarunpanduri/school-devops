const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const classesRoutes = require("./routes/classes.routes");
const studentsRoutes = require("./routes/studends.routes");
const attendanceRoutes = require("./routes/attendence.routes");
const feesRoutes = require("./routes/fees.routes");



const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/classes", classesRoutes);
app.use("/students", studentsRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/fees", feesRoutes);


app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
