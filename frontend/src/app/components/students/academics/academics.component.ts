import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import html2pdf from 'html2pdf.js';
import {
  AcademicsService,
  SubjectMarks,
  ClassSubjectDef,
  SchoolProfile,
} from '../../../services/academics/academics.service';

@Component({
  standalone: false,
  selector: 'app-academics',
  templateUrl: './academics.component.html',
  styleUrls: ['./academics.component.css'],
})
export class AcademicsComponent implements OnInit {
  // dropdown data
  exams: string[] = [];
  classes: string[] = [];
  sections: string[] = [];
  studentsList: string[] = [];

  // selected filters
  selectedExam: string = '';
  selectedClass: string = '';
  selectedSection: string = '';
  selectedStudent: string = '';

  // marks table
  subjects: SubjectMarks[] = [];
  editIndex: number | null = null;
  backupSubject: SubjectMarks | any = {};

  // school info (from PostgreSQL)
  schoolName: string = '';
  schoolCity: string = '';
  schoolState: string = '';
  examHeader: string = '';
  currentYear: number = new Date().getFullYear();

  constructor(
    private academicsService: AcademicsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSchoolProfile();
    this.loadClasses();
    this.loadExams();
  }

  /* ---------- LOADERS ---------- */

  loadSchoolProfile() {
    this.academicsService.getSchoolProfile().subscribe({
      next: (profile: SchoolProfile) => {
        this.schoolName = profile.name;
        this.schoolCity = profile.city || '';
        this.schoolState = profile.state || '';
        this.examHeader = profile.examHeader;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load school profile:', err);
        // fallback so template doesn't break
        this.schoolName = 'School Name';
        this.examHeader = 'School Examination';
      },
    });
  }

  loadClasses() {
    this.academicsService.getClasses().subscribe({
      next: res => {
        this.classes = res.classes || [];
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load classes:', err);
      },
    });
  }

  loadExams() {
    this.academicsService.getExams().subscribe({
      next: res => {
        this.exams = res.exams || [];
        this.exams.push('+add');
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load exams:', err);
      },
    });
  }

  fetchSections(className: string) {
    if (!className) {
      this.sections = [];
      return;
    }

    this.academicsService.getSections(className).subscribe({
      next: res => {
        this.sections = res.sections || [];
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load sections:', err);
      },
    });
  }

  onClassOrSectionChange() {
    if (!this.selectedClass || !this.selectedSection) {
      this.studentsList = [];
      this.selectedStudent = '';
      return;
    }

    this.academicsService
      .getStudentsForClassSection(this.selectedClass, this.selectedSection)
      .subscribe({
        next: res => {
          this.studentsList = res.students || [];
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('Failed to load students:', err);
        },
      });
  }

  /* ---------- EXAMS ---------- */

  onExamSelectChange() {
    if (this.selectedExam === '+add') {
      const newExam = prompt('Enter new Exam name');
      if (newExam) {
        this.academicsService.createExam(newExam).subscribe({
          next: () => {
            alert(`${newExam} created successfully`);
            this.selectedExam = newExam;
            this.loadExams();
          },
          error: err => {
            console.error('Failed to create exam:', err);
          },
        });
      } else {
        this.selectedExam = '';
      }
    } else {
      this.onExamChange();
    }
  }

  onExamChange() {
    this.loadMarks();
  }

  /* ---------- CLASS / SECTION / STUDENT FILTERS ---------- */

  onClassSelectChange() {
    this.selectedSection = '';
    this.sections = [];
    this.studentsList = [];
    this.selectedStudent = '';

    if (this.selectedClass === '+add') {
      const newClass = prompt('Enter new Class (like 11, 12)');
      if (newClass) {
        this.classes.push(newClass);
        this.selectedClass = newClass;
      } else {
        this.selectedClass = '';
      }
    } else {
      this.fetchSections(this.selectedClass);
    }
  }

  onSectionSelectChange() {
    this.selectedStudent = '';

    if (this.selectedSection === '+add') {
      const newSection = prompt('Enter new Section (like D, E)');
      if (newSection) {
        this.sections.push(newSection);
        this.selectedSection = newSection;
      } else {
        this.selectedSection = '';
      }
    } else {
      this.onClassOrSectionChange();
    }
  }

  onStudentChange() {
    this.loadMarks();
  }

  /* ---------- SUBJECTS + MARKS ---------- */

  private applyExamMaxMarks() {
    if (!this.selectedExam) return;

    const lowerExam = this.selectedExam.toLowerCase();
    let maxMarks = 100;

    if (lowerExam.startsWith('fa')) maxMarks = 20;
    else if (lowerExam.startsWith('sa')) maxMarks = 100;

    this.subjects = this.subjects.map(sub => ({
      ...sub,
      maxMarks: sub.maxMarks ?? maxMarks,
    }));
  }

  private loadDefaultSubjectsForClass() {
    if (!this.selectedClass) {
      this.subjects = [];
      return;
    }

    this.academicsService.getClassSubjects(this.selectedClass).subscribe({
      next: res => {
        const defs: ClassSubjectDef[] = res.subjects || [];
        this.subjects = defs.map(def => ({
          name: def.name,
          maxMarks: def.defaultMaxMarks,
          marksScored: undefined,
          grade: '',
          remarks: '',
        }));
        this.applyExamMaxMarks();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load class subjects:', err);
        this.subjects = [];
      },
    });
  }

  loadMarks() {
    if (
      !this.selectedClass ||
      !this.selectedSection ||
      !this.selectedStudent ||
      !this.selectedExam
    ) {
      this.subjects = [];
      return;
    }

    this.academicsService
      .getExamResult(
        this.selectedExam,
        this.selectedClass,
        this.selectedSection,
        this.selectedStudent
      )
      .subscribe({
        next: res => {
          const loaded = res.subjects || [];
          if (loaded.length > 0) {
            this.subjects = loaded;
            this.applyExamMaxMarks();
          } else {
            this.loadDefaultSubjectsForClass();
          }
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('Failed to load exam result:', err);
          this.loadDefaultSubjectsForClass();
        },
      });
  }

  editRow(index: number) {
    this.editIndex = index;
    this.backupSubject = { ...this.subjects[index] };
  }

  saveEdit(index: number) {
    this.editIndex = null;
    this.backupSubject = {};
    this.saveMarks();
  }

  cancelEdit() {
    if (this.editIndex !== null) {
      this.subjects[this.editIndex] = { ...this.backupSubject };
    }
    this.editIndex = null;
  }

  deleteRow(index: number) {
    this.subjects.splice(index, 1);
    this.saveMarks();
  }

  addMarksRow() {
    let maxMarks = 100;
    const lowerExam = this.selectedExam?.toLowerCase() || '';
    if (lowerExam.startsWith('fa')) maxMarks = 20;
    else if (lowerExam.startsWith('sa')) maxMarks = 100;

    this.subjects.push({
      name: '',
      maxMarks,
      marksScored: undefined,
      grade: '',
      remarks: '',
    });
    this.editIndex = this.subjects.length - 1;
  }

  validateMarks(subject: any) {
    if (subject.marksScored > subject.maxMarks) {
      alert(`Marks for ${subject.name} cannot exceed ${subject.maxMarks}`);
      subject.marksScored = subject.maxMarks;
    }
  }

  saveMarks() {
    if (
      !this.selectedExam ||
      !this.selectedClass ||
      !this.selectedSection ||
      !this.selectedStudent
    ) {
      return;
    }

    this.academicsService
      .saveExamResult(
        this.selectedExam,
        this.selectedClass,
        this.selectedSection,
        this.selectedStudent,
        this.subjects
      )
      .subscribe({
        next: () => {
          // saved successfully
        },
        error: err => {
          console.error('Failed to save exam result:', err);
        },
      });
  }

  /* ---------- PDF / PRINT ---------- */

  exportPDF() {
    const printable = document.getElementById('pdf-marksheet');
    if (printable) {
      printable.style.display = 'block';
      printable.classList.add('pdf-export');
      html2pdf()
        .from(printable)
        .set({
          margin: 0.5,
          filename: `${this.selectedStudent}_Marksheet.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .save()
        .then(() => {
          printable.style.display = 'none';
          printable.classList.remove('pdf-export');
        });
    }
  }

  print() {
    const printable = document.getElementById('pdf-marksheet');
    if (printable) {
      printable.style.display = 'block';
      setTimeout(() => {
        window.print();
        printable.style.display = 'none';
      }, 200);
    }
  }

  /* ---------- PASS/FAIL + TOTAL & VISIBILITY ---------- */

  get hasFullSelection(): boolean {
    return !!(
      this.selectedExam &&
      this.selectedClass &&
      this.selectedSection &&
      this.selectedStudent
    );
  }

  isPassed(): boolean {
    return this.subjects.every(sub => {
      const min = Math.ceil((sub.maxMarks || 0) * 0.35);
      const score = sub.marksScored ?? 0;
      return Number(score) >= min;
    });
  }

  getGrandTotal(): number {
    return this.subjects.reduce((sum, subj) => {
      const score = subj.marksScored ?? 0;
      return sum + Number(score);
    }, 0);
  }
}
