import { Component, OnInit } from '@angular/core';
import { Database, ref, onValue, push, update, remove ,set} from '@angular/fire/database';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';

interface Teacher {
  id?: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  joiningDate?: string;
  department: string;
  phone?: string;
  email?: string;
  address?: string;
}

@Component({
  selector: 'app-teachers-info',
  standalone: false,
  templateUrl: './teachers-info.component.html',
  styleUrl: './teachers-info.component.css',
  providers: [DatePipe]
})
export class TeachersInfoComponent implements OnInit {
  modalVisible = false;
  isViewMode = false;
  isEditMode = false;
  isDeleteMode = false;
  modalTitle = '';
  isLoading = false;

  teachers: Teacher[] = [];
  filteredTeachers: Teacher[] = [];
  selectedTeacher: Teacher = {
    teacherId: '',
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    joiningDate: '',
    department: '',
    phone: '',
    email: '',
    address: ''
  };

  departments: string[] = [];
  selectedDepartment: string = '';
  searchTerm: string = '';

  constructor(
    private db: Database,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.fetchDepartments();
    this.fetchTeachers();
  }

  fetchDepartments() {
    const deptRef = ref(this.db, 'sfs/departments');
    onValue(deptRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.departments = Object.keys(data).sort();
      }
    }, () => {
      this.showError('Failed to load departments');
    });
  }

  fetchTeachers() {
    this.isLoading = true;
    const teacherRef = ref(this.db, 'teachers/');
    onValue(teacherRef, (snapshot) => {
      const data = snapshot.val();
      this.teachers = [];

      if (data) {
        for (let key in data) {
          const teacher = {
            id: key,
            ...data[key],
            dateOfBirth: this.formatDate(data[key].dateOfBirth),
            joiningDate: this.formatDate(data[key].joiningDate)
          };
          this.teachers.push(teacher);
        }
      }

      this.applyFilters();
      this.isLoading = false;
    }, () => {
      this.showError('Failed to fetch teachers');
      this.isLoading = false;
    });
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return this.datePipe.transform(dateString, 'yyyy-MM-dd') || '';
    } catch {
      return dateString;
    }
  }

  applyFilters() {
    this.filteredTeachers = this.teachers.filter(teacher => {
      const matchDept = !this.selectedDepartment ||
        teacher.department?.toLowerCase() === this.selectedDepartment.toLowerCase();
      const matchSearch = !this.searchTerm ||
        teacher.teacherId?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        teacher.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        teacher.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (`${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(this.searchTerm.toLowerCase()));
      return matchDept && matchSearch;
    });
  }

  openForm() {
    this.resetModes();
    this.modalTitle = 'Add New Teacher';
    this.selectedTeacher = {
      teacherId: '',
      firstName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      joiningDate: '',
      department: '',
      phone: '',
      email: '',
      address: ''
    };
    this.modalVisible = true;
  }

  viewDetails(teacher: Teacher) {
    this.resetModes();
    this.modalTitle = 'View Teacher';
    this.selectedTeacher = { ...teacher };
    this.isViewMode = true;
    this.modalVisible = true;
  }

  editTeacher(teacher: Teacher) {
    this.resetModes();
    this.modalTitle = 'Edit Teacher';
    this.selectedTeacher = { ...teacher };
    this.isEditMode = true;
    this.modalVisible = true;
  }

  promptDelete(teacher: Teacher) {
    this.resetModes();
    this.modalTitle = 'Delete Teacher';
    this.selectedTeacher = { ...teacher };
    this.isDeleteMode = true;
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
    this.resetModes();
  }

onDepartmentChange(event: any) {
  if (event.value === '+add') {
    const newDept = prompt('Enter new department name:')?.trim();

    if (newDept) {
      const normalizedDept = newDept.toLowerCase();

      const isDuplicate = this.departments.some(
        dept => dept.toLowerCase() === normalizedDept
      );

      if (isDuplicate) {
        this.showError('Department already exists.');
        this.selectedTeacher.department = '';
        return;
      }

      this.departments.push(newDept);
      this.departments.sort((a, b) => a.localeCompare(b));
      this.selectedTeacher.department = newDept;

      const deptRef = ref(this.db, `sfs/departments/${newDept}`);
      set(deptRef, true)  // ✅ Store in correct format
        .then(() => this.showSuccess('Department added successfully.'))
        .catch(() => this.showError('Failed to add department.'));
    }
  }
}

  submitForm(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      const data: Teacher = {
        ...form.value,
        dateOfBirth: this.formatDateForStorage(form.value.dateOfBirth),
        joiningDate: this.formatDateForStorage(form.value.joiningDate)
      };

      if (this.isEditMode && this.selectedTeacher?.id) {
        const tRef = ref(this.db, `teachers/${this.selectedTeacher.id}`);
        update(tRef, data).then(() => {
          this.showSuccess('Teacher updated successfully');
          this.fetchTeachers();
          this.closeModal();
        }).catch(() => {
          this.showError('Failed to update teacher');
          this.isLoading = false;
        });
      } else {
        const tRef = ref(this.db, 'teachers/');
        push(tRef, data).then(() => {
          this.showSuccess('Teacher added successfully');
          this.fetchTeachers();
          this.closeModal();
          form.resetForm();
        }).catch(() => {
          this.showError('Failed to add teacher');
          this.isLoading = false;
        });
      }
    }
  }

  private formatDateForStorage(date: any): string {
    if (!date) return '';
    try {
      return this.datePipe.transform(date, 'yyyy-MM-dd') || '';
    } catch {
      return date;
    }
  }

  confirmDelete() {
    if (this.selectedTeacher?.id) {
      this.isLoading = true;
      const tRef = ref(this.db, `teachers/${this.selectedTeacher.id}`);
      remove(tRef).then(() => {
        this.showSuccess('Teacher deleted successfully');
        this.fetchTeachers();
        this.closeModal();
      }).catch(() => {
        this.showError('Failed to delete teacher');
        this.isLoading = false;
      });
    }
  }

  private resetModes() {
    this.isViewMode = false;
    this.isEditMode = false;
    this.isDeleteMode = false;
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }
}
