import { Component, OnInit } from '@angular/core';
import { StudentsService, Student } from '../..//services/student-info/student-info.service';

@Component({
  selector: 'app-students-info',
  templateUrl: './students-info.component.html',
  styleUrls: ['./students-info.component.css'],
  standalone: false
})
export class StudentsInfoComponent implements OnInit {
  showForm = false;
  students: Student[] = [];
  filteredStudents: Student[] = [];
  selectedStudent: Student | any = {};
  isViewMode = false;
  isEditMode = false;

  classes: string[] = [];
  filterSections: string[] = [];

  selectedFilterClass: string = '';
  selectedFilterSection: string = '';
  searchTerm: string = '';

  constructor(private studentsService: StudentsService) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.studentsService.getStudents().subscribe({
      next: res => {
        this.students = res.students || [];
        this.buildClassesFromStudents();
        this.applyFilters();
      },
      error: err => {
        console.error('Failed to load students:', err);
      },
    });
  }

  // Build classes list from students (replaces Firebase sfs/classes)
  buildClassesFromStudents() {
    const set = new Set<string>();
    this.students.forEach(s => {
      if (s.currentClass) {
        set.add(s.currentClass);
      }
    });

    const classesArray = Array.from(set);

    const order = ['LKG', 'UKG'];
    classesArray.sort((a, b) => {
      const aIsSpecial = order.includes(a);
      const bIsSpecial = order.includes(b);

      if (aIsSpecial && bIsSpecial) {
        return order.indexOf(a) - order.indexOf(b);
      }
      if (aIsSpecial) return -1;
      if (bIsSpecial) return 1;

      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });

    this.classes = classesArray;
  }

  // Build sections list for selected class from students
  fetchSectionsForClass(classValue: string) {
    if (!classValue) {
      this.filterSections = [];
      this.selectedFilterSection = '';
      this.applyFilters();
      return;
    }

    const set = new Set<string>();
    this.students.forEach(s => {
      if (s.currentClass === classValue && s.currentSection) {
        set.add(s.currentSection);
      }
    });

    this.filterSections = Array.from(set).sort();
    this.selectedFilterSection = '';
    this.applyFilters();
  }

  onClassChange(event: Event) {
    const selectedClass = (event.target as HTMLSelectElement).value;
    this.selectedFilterClass = selectedClass;
    this.fetchSectionsForClass(selectedClass);
  }

  onSectionChange(event: Event) {
    this.selectedFilterSection = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredStudents = this.students.filter(student => {
      const matchesClass =
        !this.selectedFilterClass ||
        student.currentClass === this.selectedFilterClass;

      const matchesSection =
        !this.selectedFilterSection ||
        student.currentSection === this.selectedFilterSection;

      const matchesSearch =
        !this.searchTerm ||
        student.admissionNumber
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase());

      return matchesClass && matchesSection && matchesSearch;
    });
  }

  openForm() {
    this.showForm = true;
    this.selectedStudent = {
      id: undefined,
      admissionNumber: '',
      firstName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      currentClass: '',
      currentSection: '',
      phoneNumber: '',
      email: '',
      Place: '',
      fee: '',
      fatherName: '',
    } as Student;
    this.isViewMode = false;
    this.isEditMode = false;
  }

  closeForm() {
    this.showForm = false;
    this.selectedStudent = {};
    this.isViewMode = false;
    this.isEditMode = false;
  }

  submitForm(form: any) {
    if (!form.valid) return;

    const studentData: Student = this.selectedStudent;

    if (this.isEditMode && studentData.id) {
      this.studentsService.updateStudent(studentData).subscribe({
        next: () => {
          this.closeForm();
          this.loadStudents();
        },
        error: err => {
          console.error('Failed to update student:', err);
        },
      });
    } else {
      this.studentsService.createStudent(studentData).subscribe({
        next: () => {
          this.closeForm();
          form.resetForm();
          this.loadStudents();
        },
        error: err => {
          console.error('Failed to create student:', err);
        },
      });
    }
  }

  viewDetails(student: Student) {
    this.selectedStudent = { ...student };
    this.isViewMode = true;
    this.isEditMode = false;
    this.showForm = true;
  }

  editStudent(student: Student) {
    this.selectedStudent = { ...student };
    this.isEditMode = true;
    this.isViewMode = false;
    this.showForm = true;
  }

  deleteStudent(student: Student) {
    if (!student.id) return;
    if (
      confirm(
        `Are you sure you want to delete student: ${student.firstName} ${student.lastName}?`
      )
    ) {
      this.studentsService.deleteStudent(student.id).subscribe({
        next: () => {
          this.loadStudents();
        },
        error: err => {
          console.error('Failed to delete student:', err);
        },
      });
    }
  }
}