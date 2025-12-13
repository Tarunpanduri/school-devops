const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const classesRoutes = require("./routes/classes.routes");
const studentsRoutes = require("./routes/studends.routes");
const attendanceRoutes = require("./routes/attendence.routes");
const feesRoutes = require("./routes/fees.routes");
const homeworkRoutes = require("./routes/homework.routes");
const academicsRoutes = require("./routes/academics.routes");
const teachersRoutes = require("./routes/teachers.routes");
const teachersAttendanceRoutes = require('./routes/teachersAttendence.routes');
const salariesRoutes = require("./routes/salaries.routes");
const feeCollectionsRoutes = require("./routes/fee-collection.routes");






const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/classes", classesRoutes);
app.use("/students", studentsRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/fees", feesRoutes);
app.use("/homework", homeworkRoutes);
app.use("/academics", academicsRoutes);
app.use("/teachers", teachersRoutes);
app.use("/teachers-attendance", teachersAttendanceRoutes);
app.use("/salaries", salariesRoutes);
app.use("/fee-collections", feeCollectionsRoutes);







app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
