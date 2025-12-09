import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Database, ref, onValue, set } from '@angular/fire/database';
import { inject } from '@angular/core';
import html2pdf from 'html2pdf.js';

@Component({
  standalone: false,
  selector: 'app-academics',
  templateUrl: './academics.component.html',
  styleUrls: ['./academics.component.css'],
})
export class AcademicsComponent implements OnInit {
  db = inject(Database);
  cdr = inject(ChangeDetectorRef);

  exams: string[] = [];
  classes: string[] = [];
  sections: string[] = [];
  studentsList: string[] = [];

  selectedExam: string = '';
  selectedClass: string = '';
  selectedSection: string = '';
  selectedStudent: string = '';

  subjects: any[] = [];
  editIndex: number | null = null;
  backupSubject: any = {};

  ngOnInit(): void {
    this.initDefaultSubjects();
    this.fetchClasses();
    this.fetchExams();
  }

  fetchClasses() {
    const classesRef = ref(this.db, 'sfs/classes');
    onValue(classesRef, snapshot => {
      const data = snapshot.val();
      this.classes = data ? Object.keys(data) : [];
      this.cdr.detectChanges();
    });
  }

  fetchExams() {
    const examsRef = ref(this.db, 'academics');
    onValue(examsRef, snapshot => {
      const data = snapshot.val();
      this.exams = data ? Object.keys(data) : [];
      this.exams.push('+add');
      this.cdr.detectChanges();
    });
  }

  onExamSelectChange() {
    if (this.selectedExam === '+add') {
      const newExam = prompt('Enter new Exam name');
      if (newExam) {
        this.createExamInFirebase(newExam);
      } else {
        this.selectedExam = '';
      }
    } else {
      this.onExamChange();
    }
  }

  createExamInFirebase(newExam: string) {
    const newExamRef = ref(this.db, `academics/${newExam}`);
    set(newExamRef, { init: "placeholder" })
      .then(() => {
        alert(`${newExam} created successfully`);
        this.fetchExams();
        this.selectedExam = newExam;
      })
      .catch(error => console.error("Error creating exam:", error));
  }

  fetchSections(className: string) {
    if (!className) return;
    const sectionsRef = ref(this.db, `sfs/classes/${className}/sections`);
    onValue(sectionsRef, snapshot => {
      const data = snapshot.val();
      this.sections = data ? Object.keys(data) : [];
      this.cdr.detectChanges();
    });
  }

  onClassSelectChange() {
    if (this.selectedClass === '+add') {
      const newClass = prompt('Enter new Class (like 11, 12)');
      if (newClass) {
        this.classes.push(newClass);
        this.selectedClass = newClass;
      } else {
        this.selectedClass = '';
      }
    } else {
      this.selectedSection = '';
      this.sections = [];
      this.studentsList = [];
      this.fetchSections(this.selectedClass);
      this.onClassOrSectionChange();
    }
  }

  onSectionSelectChange() {
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

  onClassOrSectionChange() {
    if (!this.selectedClass || !this.selectedSection) {
      this.studentsList = [];
      return;
    }
    const studentsRef = ref(this.db, 'students');
    onValue(studentsRef, snapshot => {
      const studentsData = snapshot.val();
      const studentsArray = Object.values(studentsData || {});
      this.studentsList = studentsArray
        .filter((student: any) =>
          student.currentClass == this.selectedClass &&
          student.currentSection == this.selectedSection)
        .map((student: any) => student.firstName);
      this.cdr.detectChanges();
    });
  }

  onStudentChange() { this.loadMarks(); }
  onExamChange() { 
    this.loadMarks(); 
    this.updateSubjectMaxMarks();
  }

  loadMarks() {
    if (!this.selectedClass || !this.selectedSection || !this.selectedStudent || !this.selectedExam) return;
    const path = `academics/${this.selectedExam}/${this.selectedClass} - ${this.selectedSection}/${this.selectedStudent}`;
    const marksRef = ref(this.db, path);

    onValue(marksRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.subjects) {
        this.subjects = data.subjects;
      } else {
        this.initDefaultSubjects();
      }
      this.updateSubjectMaxMarks();
      this.cdr.detectChanges();
    });
  }

  updateSubjectMaxMarks() {
    if (!this.selectedExam) return;
    const lowerExam = this.selectedExam.toLowerCase();
    let maxMarks = 100;
    if (lowerExam.startsWith('fa')) maxMarks = 20;
    else if (lowerExam.startsWith('sa')) maxMarks = 100;

    this.subjects = this.subjects.map(sub => ({
      ...sub,
      maxMarks
    }));
  }

  initDefaultSubjects() {
    this.subjects = [
      { name: 'Telugu', maxMarks: 100 },
      { name: 'Hindi', maxMarks: 100 },
      { name: 'English', maxMarks: 100 },
      { name: 'Maths', maxMarks: 100 },
      { name: 'Science', maxMarks: 100 },
      { name: 'Social Studies', maxMarks: 100 },
    ];
    this.updateSubjectMaxMarks();
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
    const lowerExam = this.selectedExam.toLowerCase();
    if (lowerExam.startsWith('fa')) maxMarks = 20;
    else if (lowerExam.startsWith('sa')) maxMarks = 100;

    this.subjects.push({
      name: '',
      maxMarks,
      marksScored: '',
      grade: '',
      remarks: ''
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
    const path = `academics/${this.selectedExam}/${this.selectedClass} - ${this.selectedSection}/${this.selectedStudent}`;
    import('@firebase/database').then(db => {
      db.set(ref(this.db, path), { subjects: this.subjects });
    });
  }

  exportPDF() {
    const printable = document.getElementById('pdf-marksheet');
    if (printable) {
      printable.style.display = 'block';
      printable.classList.add('pdf-export');
      html2pdf().from(printable).set({
        margin: 0.5,
        filename: `${this.selectedStudent}_Marksheet.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).save().then(() => {
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

  isPassed(): boolean {
    return this.subjects.every(sub => {
      const min = Math.ceil(sub.maxMarks * 0.35);
      return (+sub.marksScored || 0) >= min;
    });
  }

  getGrandTotal(): number {
    return this.subjects.reduce((sum, subj) => sum + (+subj.marksScored || 0), 0);
  }
}
