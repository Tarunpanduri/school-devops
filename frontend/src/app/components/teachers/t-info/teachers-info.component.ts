import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  TeachersService,
  Teacher,
} from '../../../services/teachers/teachers.service';

@Component({
  selector: 'app-teachers-info',
  standalone: false,
  templateUrl: './teachers-info.component.html',
  styleUrls: ['./teachers-info.component.css'],
  providers: [DatePipe],
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
    id: undefined,
    teacherId: '',
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    joiningDate: '',
    department: '',
    phone: '',
    email: '',
    address: '',
  };

  departments: string[] = [];
  selectedDepartment: string = '';
  searchTerm: string = '';

  constructor(
    private teachersService: TeachersService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe
  ) { }

  ngOnInit() {
    this.fetchDepartments();
    this.fetchTeachers();
  }

  /* ---------- LOADERS ---------- */

  fetchDepartments() {
    this.teachersService.getDepartments().subscribe({
      next: res => {
        this.departments = (res.departments || []).sort((a, b) =>
          a.localeCompare(b)
        );
      },
      error: () => {
        this.showError('Failed to load departments');
      },
    });
  }

  fetchTeachers() {
    this.isLoading = true;
    this.teachersService.getTeachers().subscribe({
      next: res => {
        const list = res.teachers || [];

        // Normalize & format dates into yyyy-MM-dd for form controls
        this.teachers = list.map<Teacher>(t => ({
          ...t,
          dateOfBirth: this.formatDate(t.dateOfBirth),
          joiningDate: this.formatDate(t.joiningDate || null),
        }));

        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showError('Failed to fetch teachers');
        this.isLoading = false;
      },
    });
  }

  private formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    try {
      return this.datePipe.transform(dateString, 'yyyy-MM-dd') || '';
    } catch {
      return String(dateString);
    }
  }

  private formatDateForStorage(date: any): string | null {
    if (!date) return null;
    try {
      return this.datePipe.transform(date, 'yyyy-MM-dd') || null;
    } catch {
      return date;
    }
  }

  /* ---------- FILTERS ---------- */

  applyFilters() {
    this.filteredTeachers = this.teachers.filter(teacher => {
      const matchDept =
        !this.selectedDepartment ||
        teacher.department?.toLowerCase() ===
        this.selectedDepartment.toLowerCase();

      const search = this.searchTerm.toLowerCase();
      const matchSearch =
        !this.searchTerm ||
        teacher.teacherId?.toLowerCase().includes(search) ||
        teacher.firstName?.toLowerCase().includes(search) ||
        teacher.lastName?.toLowerCase().includes(search) ||
        `${teacher.firstName} ${teacher.lastName}`
          .toLowerCase()
          .includes(search);

      return matchDept && matchSearch;
    });
  }

  /* ---------- MODAL OPEN MODES ---------- */

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
      address: '',

      designation: '',
      bankName: '',
      bankAccount: '',
      bankIfsc: '',
      pan: '',
      uan: '',
      pfNumber: '',
      basicSalary: 0,
      allowance: 0,
      deductions: 0,
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

  /* ---------- DEPARTMENT CHANGE ---------- */

  onDepartmentChange(event: any) {
    if (event.value === '+add') {
      const newDept = prompt('Enter new department name:')?.trim();

      if (!newDept) {
        this.selectedTeacher.department = '';
        return;
      }

      const normalizedNew = newDept.toLowerCase();
      const isDuplicate = this.departments.some(
        d => d.toLowerCase() === normalizedNew
      );

      if (isDuplicate) {
        this.showError('Department already exists.');
        this.selectedTeacher.department = '';
        return;
      }

      this.teachersService.addDepartment(newDept).subscribe({
        next: res => {
          const savedName = res.name || newDept;
          this.departments.push(savedName);
          this.departments.sort((a, b) => a.localeCompare(b));
          this.selectedTeacher.department = savedName;
          this.showSuccess('Department added successfully.');
        },
        error: () => {
          this.showError('Failed to add department.');
          this.selectedTeacher.department = '';
        },
      });
    }
  }

  /* ---------- SUBMIT FORM ---------- */

  submitForm(form: NgForm) {
    if (!form.valid) return;

    this.isLoading = true;

    const payload: Teacher = {
      ...this.selectedTeacher,
      ...form.value,
      dateOfBirth: this.formatDateForStorage(form.value.dateOfBirth),
      joiningDate: this.formatDateForStorage(form.value.joiningDate),
    };

    if (this.isEditMode && this.selectedTeacher?.id != null) {
      // UPDATE
      this.teachersService
        .updateTeacher(this.selectedTeacher.id, payload)
        .subscribe({
          next: () => {
            this.showSuccess('Teacher updated successfully');
            this.fetchTeachers();
            this.closeModal();
          },
          error: () => {
            this.showError('Failed to update teacher');
            this.isLoading = false;
          },
        });
    } else {
      // CREATE
      this.teachersService.createTeacher(payload).subscribe({
        next: () => {
          this.showSuccess('Teacher added successfully');
          this.fetchTeachers();
          this.closeModal();
          form.resetForm();
        },
        error: () => {
          this.showError('Failed to add teacher');
          this.isLoading = false;
        },
      });
    }
  }

  /* ---------- DELETE ---------- */

  confirmDelete() {
    if (this.selectedTeacher?.id == null) return;

    this.isLoading = true;
    this.teachersService.deleteTeacher(this.selectedTeacher.id).subscribe({
      next: () => {
        this.showSuccess('Teacher deleted successfully');
        this.fetchTeachers();
        this.closeModal();
      },
      error: () => {
        this.showError('Failed to delete teacher');
        this.isLoading = false;
      },
    });
  }

  /* ---------- HELPERS ---------- */

  private resetModes() {
    this.isViewMode = false;
    this.isEditMode = false;
    this.isDeleteMode = false;
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar'],
    });
  }
}
