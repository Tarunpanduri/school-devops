const { pool } = require("../db");

async function getTimetable(className, section) {
  const result = await pool.query(
    `SELECT
       t.id,
       t.day_of_week,
       t.period_number,
       t.subject,
       t.start_time,
       t.end_time,
       te.first_name || ' ' || te.last_name AS teacher_name
     FROM timetable_entries t
     LEFT JOIN teachers te ON te.id = t.teacher_id
     WHERE t.class = $1 AND t.section = $2
     ORDER BY
       CASE t.day_of_week
         WHEN 'Monday' THEN 1
         WHEN 'Tuesday' THEN 2
         WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4
         WHEN 'Friday' THEN 5
         WHEN 'Saturday' THEN 6
       END,
       t.period_number`,
    [className, section]
  );

  return result.rows;
}

module.exports = {
  getTimetable,
};
