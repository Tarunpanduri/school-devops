import { Component, OnInit } from '@angular/core';
import { Database, ref, get, set } from '@angular/fire/database';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  teacherId: string;
  department?: string;
}

@Component({
  selector: 'app-teachersattendence',
  standalone: false,
  templateUrl: './teachersattendence.component.html',
  styleUrls: ['./teachersattendence.component.css']
})
export class TeachersattendenceComponent implements OnInit {
  selectedMonth: string = '';
  days: number[] = [];
  todayDay: number = 0;

  selectedDepartment: string = '';
  departmentList: string[] = [];

  teachers: Teacher[] = [];
  attendanceData: { [teacherId: string]: { [day: number]: boolean | null } } = {};
  submittedDates: { [teacherId: string]: { [day: number]: boolean | null } } = {};
  submissionCounts: { [department: string]: { [day: number]: number } } = {};

  modalVisible: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';

  clickCountMap: { [key: string]: number } = {};
  clickTimeoutMap: { [key: string]: any } = {};

  constructor(private db: Database) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.todayDay = now.getDate();
    this.updateDaysInMonth();
    this.loadDepartments();
    this.loadSubmissionCounts();
  }

  async loadSubmissionCounts() {
    const snapshot = await get(ref(this.db, 'teacherAttendance/submissionCounts'));
    if (snapshot.exists()) {
      this.submissionCounts = snapshot.val() || {};
    }
  }

  async saveSubmissionCounts() {
    try {
      await set(ref(this.db, 'teacherAttendance/submissionCounts'), this.submissionCounts);
    } catch (err) {
      console.error('Failed to save teacher submission counts:', err);
    }
  }

  updateDaysInMonth() {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    this.days = Array.from({ length: totalDays }, (_, i) => i + 1);
  }

  async loadDepartments() {
    const snapshot = await get(ref(this.db, 'teachers'));
    const departments = new Set<string>();

    if (snapshot.exists()) {
      const teachers = snapshot.val();
      Object.values(teachers).forEach((t: any) => {
        if (t.department) departments.add(t.department);
      });
    }

    this.departmentList = Array.from(departments).sort();
  }

  async loadTeachers() {
    this.teachers = [];
    if (!this.selectedDepartment) return;

    const teacherSnapshot = await get(ref(this.db, 'teachers'));
    const attendancePath = `teacherAttendance/${this.selectedDepartment}/${this.selectedMonth}`;
    const attendanceSnapshot = await get(ref(this.db, attendancePath));

    // Initialize department in submissionCounts if not exists
    if (!this.submissionCounts[this.selectedDepartment]) {
      this.submissionCounts[this.selectedDepartment] = {};
    }

    if (teacherSnapshot.exists()) {
      const allTeachers = teacherSnapshot.val();
      this.teachers = Object.entries(allTeachers)
        .map(([id, data]) => ({ id, ...(data as object) }))
        .filter((t: any) => t.department === this.selectedDepartment)
        .sort((a: any, b: any) => parseInt(a.teacherId || '0', 10)) as Teacher[];
    }

    if (attendanceSnapshot.exists()) {
      const data = attendanceSnapshot.val() || {};
      this.attendanceData = data;
      this.submittedDates = JSON.parse(JSON.stringify(data));
    } else {
      this.attendanceData = {};
      this.submittedDates = {};
    }

    // Initialize attendance data structure
    this.teachers.forEach(teacher => {
      if (!this.attendanceData[teacher.id]) {
        this.attendanceData[teacher.id] = {};
      }
      this.days.forEach(day => {
        if (!(day in this.attendanceData[teacher.id])) {
          this.attendanceData[teacher.id][day] = null;
        }
      });
    });
  }

  markPresent(teacherId: string, day: number, event: MouseEvent) {
    if (this.isCheckboxDisabled(teacherId, day)) return;
    this.attendanceData[teacherId][day] = true;
  }

  markAbsent(teacherId: string, day: number, event: MouseEvent) {
    if (this.isCheckboxDisabled(teacherId, day)) return;
    this.attendanceData[teacherId][day] = false;
  }

  trackClick(teacherId: string, day: number) {
    const key = `click-${day}`;
    this.clickCountMap[key] = (this.clickCountMap[key] || 0) + 1;

    if (this.clickTimeoutMap[key]) {
      clearTimeout(this.clickTimeoutMap[key]);
    }

    this.clickTimeoutMap[key] = setTimeout(() => {
      if (this.clickCountMap[key] >= 3) {
        this.toggleColumnAttendance(day);
      }
      this.clickCountMap[key] = 0;
    }, 400);
  }

  toggleColumnAttendance(day: number) {
    const allPresent = this.teachers.every(t => this.attendanceData[t.id][day] === true);
    const newValue = !allPresent;
    this.teachers.forEach(t => {
      if (!this.isCheckboxDisabled(t.id, day)) {
        this.attendanceData[t.id][day] = newValue;
      }
    });
  }

  async submitAttendance() {
    const today = this.todayDay;
    const dept = this.selectedDepartment;

    if (!dept) {
      this.showModal('Error', 'Please select a department first.');
      return;
    }

    // Initialize submission counts for this department if not exists
    if (!this.submissionCounts[dept]) {
      this.submissionCounts[dept] = {};
    }

    // Check submission limit for this department
    const deptCount = this.submissionCounts[dept][today] || 0;
    if (deptCount >= 2) {
      this.showModal('Limit Reached', 'Attendance has already been submitted twice today for this department.');
      return;
    }

    // Mark all unchecked as absent
    this.teachers.forEach(teacher => {
      const status = this.attendanceData[teacher.id]?.[today];
      if (status === null || status === undefined) {
        this.attendanceData[teacher.id][today] = false;
      }
    });

    // Save to database
    try {
      const path = `teacherAttendance/${dept}/${this.selectedMonth}`;
      await set(ref(this.db, path), this.attendanceData);

      // Update submission counts
      this.submissionCounts[dept][today] = deptCount + 1;
      await this.saveSubmissionCounts();

      this.submittedDates = JSON.parse(JSON.stringify(this.attendanceData));

      this.showModal(
        'Success',
        deptCount === 0
          ? 'Attendance submitted successfully.'
          : 'Attendance updated successfully. (Final chance)'
      );
    } catch (err) {
      console.error('Teacher attendance submission error:', err);
      this.showModal('Error', 'Failed to submit attendance. Please try again.');
    }
  }

  showModal(title: string, message: string) {
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
  }

  isToday(day: number): boolean {
    const today = new Date();
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    return today.toDateString() === target.toDateString();
  }

  isCheckboxDisabled(teacherId: string, day: number): boolean {
    if (!this.isToday(day)) return true;
    
    const dept = this.selectedDepartment;
    if (!dept || !this.submissionCounts[dept]) return false;
    
    return (this.submissionCounts[dept][day] || 0) >= 2;
  }
}