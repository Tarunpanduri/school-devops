import { Component, OnInit } from '@angular/core';
import {
  AttendanceService,
  AttendanceData,
  SubmissionCounts,
} from '../../services/attendence/attence.service';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  Studentid: string;
  CurrentClass: string | number;
  CurrentSection: string;
}

@Component({
  selector: 'app-attendence',
  standalone: false,
  templateUrl: './attendence.component.html',
  styleUrls: ['./attendence.component.css'],
})
export class AttendenceComponent implements OnInit {
  selectedMonth: string = '';
  selectedClass: string = '';
  selectedSection: string = '';
  selectedGrade: string = '';

  classList: string[] = [];
  sectionList: string[] = [];

  students: Student[] = [];
  attendanceData: AttendanceData = {};
  submittedDates: AttendanceData = {};
  submissionCounts: SubmissionCounts = {};

  days: number[] = [];
  todayDay: number = 0;

  modalVisible: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';

  clickCountMap: { [key: string]: number } = {};
  clickTimeoutMap: { [key: string]: any } = {};

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    this.todayDay = now.getDate();
    this.updateDaysInMonth();
    this.loadAllClasses();
  }

  updateDaysInMonth() {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    this.days = Array.from({ length: totalDays }, (_, i) => i + 1);
  }

  loadAllClasses() {
    this.attendanceService.getClasses().subscribe({
      next: res => {
        this.classList = res.classes;
      },
      error: err => {
        console.error('Failed to load classes:', err);
      },
    });
  }

  onClassChange() {
    this.sectionList = [];
    this.selectedSection = '';
    this.selectedGrade = '';

    if (this.selectedClass === 'LKG' || this.selectedClass === 'UKG') {
      this.selectedGrade = this.selectedClass;
    } else {
      this.attendanceService.getSections(this.selectedClass).subscribe({
        next: res => {
          this.sectionList = res.sections;
        },
        error: err => {
          console.error('Failed to load sections:', err);
        },
      });
    }
  }

  updateSelectedGrade() {
    if (this.selectedClass && this.selectedSection) {
      this.selectedGrade = `${this.selectedClass}_${this.selectedSection}`;
    }
  }

  searchStudents() {
    this.updateDaysInMonth();
    this.students = [];

    if (!this.selectedGrade) {
      this.showModal('Error', 'Please select class and section first.');
      return;
    }

    this.attendanceService
      .getStudents(this.selectedGrade, this.selectedClass, this.selectedSection)
      .subscribe({
        next: res => {
          this.students = res.students;

          this.attendanceService
            .getAttendance(this.selectedGrade, this.selectedMonth)
            .subscribe({
              next: att => {
                this.attendanceData = att.attendanceData || {};
                this.submissionCounts = att.submissionCounts || {};
                this.submittedDates = JSON.parse(
                  JSON.stringify(this.attendanceData)
                );

                // Initialize attendance data structure
                this.students.forEach(student => {
                  if (!this.attendanceData[student.id]) {
                    this.attendanceData[student.id] = {};
                  }
                  this.days.forEach(day => {
                    if (
                      !(
                        day in
                        (this.attendanceData[student.id] ||
                          ({} as { [day: number]: boolean | null }))
                      )
                    ) {
                      this.attendanceData[student.id][day] = null;
                    }
                  });
                });
              },
              error: err => {
                console.error('Failed to load attendance:', err);
                this.attendanceData = {};
                this.submissionCounts = {};
              },
            });
        },
        error: err => {
          console.error('Failed to load students:', err);
        },
      });
  }

  markPresent(studentId: string, day: number, event: MouseEvent) {
    if (this.isCheckboxDisabled(studentId, day)) return;
    if (!this.attendanceData[studentId]) {
      this.attendanceData[studentId] = {};
    }
    this.attendanceData[studentId][day] = true;
  }

  markAbsent(studentId: string, day: number, event: MouseEvent) {
    if (this.isCheckboxDisabled(studentId, day)) return;
    if (!this.attendanceData[studentId]) {
      this.attendanceData[studentId] = {};
    }
    this.attendanceData[studentId][day] = false;
  }

  trackClick(studentId: string, day: number) {
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
    const allPresent = this.students.every(
      s => this.attendanceData[s.id]?.[day] === true
    );
    const newValue = !allPresent;
    this.students.forEach(s => {
      if (!this.isCheckboxDisabled(s.id, day)) {
        if (!this.attendanceData[s.id]) {
          this.attendanceData[s.id] = {};
        }
        this.attendanceData[s.id][day] = newValue;
      }
    });
  }

  submitAttendance() {
    const today = this.todayDay;
    const grade = this.selectedGrade;

    if (!grade) {
      this.showModal('Error', 'Please select a class/section first.');
      return;
    }

    // Mark all unchecked as absent for today
    this.students.forEach(student => {
      const status = this.attendanceData[student.id]?.[today];
      if (status === null || status === undefined) {
        if (!this.attendanceData[student.id]) {
          this.attendanceData[student.id] = {};
        }
        this.attendanceData[student.id][today] = false;
      }
    });

    this.attendanceService
      .submitAttendance(grade, this.selectedMonth, this.attendanceData, today)
      .subscribe({
        next: res => {
          this.attendanceData = res.attendanceData || {};
          this.submissionCounts = res.submissionCounts || {};
          this.submittedDates = JSON.parse(
            JSON.stringify(this.attendanceData)
          );
          this.showModal('Success', res.message);
        },
        error: err => {
          if (err.status === 429) {
            this.showModal(
              'Limit Reached',
              'Attendance has already been submitted twice for today for this section.'
            );
          } else {
            console.error('Attendance submission error:', err);
            this.showModal(
              'Error',
              'Failed to submit attendance. Please try again.'
            );
          }
        },
      });
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

  isCheckboxDisabled(studentId: string, day: number): boolean {
    if (!this.isToday(day)) return true;

    const count =
      this.submissionCounts && this.submissionCounts[day]
        ? this.submissionCounts[day]
        : 0;

    return count >= 2;
  }
}
