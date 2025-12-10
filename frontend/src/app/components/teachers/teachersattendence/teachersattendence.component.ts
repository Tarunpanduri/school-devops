// frontend/src/app/components/teachers/teachersattendence/teachersattendence.component.ts
import { Component, OnInit } from '@angular/core';
import {
  TeachersService,
  Teacher,
} from '../../../services/teachers/teachers.service';
import { TeacherAttendanceService, TeacherAttendanceData, SubmissionCounts } from '../../../services/teachers-attendence/teaches-attendence.service';

// Local helper types (keys are teacher numeric IDs)
type AttendanceData = TeacherAttendanceData;

@Component({
  selector: 'app-teachersattendence',
  standalone: false,
  templateUrl: './teachersattendence.component.html',
  styleUrls: ['./teachersattendence.component.css'],
})
export class TeachersattendenceComponent implements OnInit {
  selectedMonth: string = '';
  days: number[] = [];
  todayDay: number = 0;

  selectedDepartment: string = '';
  departmentList: string[] = [];

  teachers: Teacher[] = [];
  attendanceData: AttendanceData = {};
  submissionCounts: SubmissionCounts = {};

  modalVisible: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';

  clickCountMap: { [key: string]: number } = {};
  clickTimeoutMap: { [key: string]: any } = {};

  constructor(
    private teachersService: TeachersService,
    private teacherAttendanceService: TeacherAttendanceService
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    this.todayDay = now.getDate();
    this.updateDaysInMonth();
    this.loadDepartments();
  }

  /* ---------- MONTH / DAYS ---------- */

  updateDaysInMonth() {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    this.days = Array.from({ length: totalDays }, (_, i) => i + 1);

    // Re-initialize attendance structure for new month
    this.teachers.forEach(t => {
      const tid = t.id != null ? Number(t.id) : undefined;
      if (tid == null) return;
      if (!this.attendanceData[tid]) {
        this.attendanceData[tid] = {};
      }
      this.days.forEach(day => {
        if (!(day in this.attendanceData[tid])) {
          this.attendanceData[tid][day] = null;
        }
      });
    });
  }

  /* ---------- LOAD DEPARTMENTS ---------- */

  loadDepartments() {
    this.teachersService.getDepartments().subscribe({
      next: res => {
        this.departmentList = (res.departments || []).sort((a: string, b: string) =>
          a.localeCompare(b)
        );
      },
      error: err => {
        console.error('Failed to load departments:', err);
      },
    });
  }

  /* ---------- LOAD TEACHERS + ATTENDANCE ---------- */

  loadTeachers() {
    if (!this.selectedDepartment) {
      this.teachers = [];
      this.attendanceData = {};
      this.submissionCounts = {};
      return;
    }


    this.teachersService
      .getTeachersByDepartment(this.selectedDepartment)
      .subscribe({
        next: tRes => {
          
          // normalize teacher ids to numbers and skip invalid ones
          this.teachers = (tRes.teachers || [])
            .filter(t => t.id != null && t.department === this.selectedDepartment)
            .map(t => ({ ...t, id: Number(t.id) }))
            .sort(
              (a, b) => Number(a.teacherId || 0) - Number(b.teacherId || 0)
            );

          
          // Load attendance data
          this.teacherAttendanceService
            .getAttendance(this.selectedDepartment, this.selectedMonth)
            .subscribe({
              next: aRes => {
                this.attendanceData = aRes.attendanceData || {};
                this.submissionCounts = aRes.submissionCounts || {};

                // Initialize for all teachers / days so template never hits undefined[day]
                this.teachers.forEach(t => {
                  const tid = t.id as number;
                  if (!this.attendanceData[tid]) {
                    this.attendanceData[tid] = {};
                  }
                  this.days.forEach(day => {
                    if (!(day in this.attendanceData[tid])) {
                      this.attendanceData[tid][day] = null;
                    }
                  });
                });
              },
              error: err => {
                console.error('Failed to load teacher attendance:', err);
                this.attendanceData = {};
                this.submissionCounts = {};

                // still initialize empty structure
                this.teachers.forEach(t => {
                  const tid = t.id as number;
                  this.attendanceData[tid] = {};
                  this.days.forEach(day => {
                    this.attendanceData[tid][day] = null;
                  });
                });
              },
            });
        },
        error: err => {
          console.error('Failed to load teachers:', err);
          this.teachers = [];
          this.attendanceData = {};
          this.submissionCounts = {};
        },
      });
  }

  /* ---------- CELL INTERACTIONS ---------- */

  markPresent(teacherId: number | undefined, day: number, event: MouseEvent) {
    if (teacherId == null) return;
    if (this.isCheckboxDisabled(teacherId, day)) return;
    if (!this.attendanceData[teacherId]) {
      this.attendanceData[teacherId] = {};
    }
    this.attendanceData[teacherId][day] = true;
  }

  markAbsent(teacherId: number | undefined, day: number, event: MouseEvent) {
    if (teacherId == null) return;
    if (this.isCheckboxDisabled(teacherId, day)) return;
    if (!this.attendanceData[teacherId]) {
      this.attendanceData[teacherId] = {};
    }
    this.attendanceData[teacherId][day] = false;
  }

  trackClick(teacherId: number | undefined, day: number) {
    if (teacherId == null) return;
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
    const allPresent = this.teachers.every(t => {
      const tid = t.id as number;
      return this.attendanceData[tid]?.[day] === true;
    });

    const newValue = !allPresent;

    this.teachers.forEach(t => {
      const tid = t.id as number;
      if (!this.isCheckboxDisabled(tid, day)) {
        if (!this.attendanceData[tid]) {
          this.attendanceData[tid] = {};
        }
        this.attendanceData[tid][day] = newValue;
      }
    });
  }

  /* ---------- SUBMIT ---------- */

  submitAttendance() {
    if (!this.selectedDepartment) {
      this.showModal('Error', 'Please select a department first.');
      return;
    }

    const today = this.todayDay;

    this.teachers.forEach(t => {
      const tid = t.id as number;
      if (!this.attendanceData[tid]) {
        this.attendanceData[tid] = {};
      }
      const status = this.attendanceData[tid][today];
      if (status === null || status === undefined) {
        this.attendanceData[tid][today] = false;
      }
    });

    this.teacherAttendanceService
      .submitAttendance(
        this.selectedDepartment,
        this.selectedMonth,
        this.attendanceData,
        today
      )
      .subscribe({
        next: res => {
          this.attendanceData = res.attendanceData || {};
          this.submissionCounts = res.submissionCounts || {};
          this.showModal(
            'Success',
            res.message || 'Attendance submitted successfully.'
          );
        },
        error: err => {
          if (err.status === 429) {
            this.showModal(
              'Limit Reached',
              'Attendance has already been submitted twice today for this department.'
            );
          } else {
            console.error('Teacher attendance submission error:', err);
            this.showModal(
              'Error',
              'Failed to submit attendance. Please try again.'
            );
          }
        },
      });
  }

  /* ---------- UI HELPERS ---------- */

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

  isCheckboxDisabled(_teacherId: number | undefined, day: number): boolean {
    if (!this.isToday(day)) return true;
    const count = this.submissionCounts[day] || 0;
    return count >= 2;
  }
}