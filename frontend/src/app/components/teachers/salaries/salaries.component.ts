import { Component, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { TeachersService } from '../../../services/teachers/teachers.service';
import {
  SalariesService,
  TeacherSalary,
} from '../../../services/salaries/salaries.service';
import {
  SchoolProfileService,
  SchoolProfile,
} from '../../../services/school/school-profile.service';

@Component({
  standalone: false,
  selector: 'app-salaries',
  templateUrl: './salaries.component.html',
  styleUrls: ['./salaries.component.css']
})
export class SalariesComponent implements OnInit {
  selectedMonthYear = '';        // 'YYYY-MM'
  selectedMonth = '';            // 'December'
  selectedYear = 0;

  departments: string[] = [];
  selectedDepartment: string = 'All';
  searchTerm: string = '';

  teachers: TeacherSalary[] = [];
  filteredTeachers: TeacherSalary[] = [];

  showPayslipModal = false;
  showEditModal = false;
  selectedTeacher: TeacherSalary | null = null;

  basicSalary = 0;
  allowance = 0;
  deductions = 0;

  schoolProfile: SchoolProfile | null = null;
  isLoading = false;

  constructor(
    private teachersService: TeachersService,
    private salariesService: SalariesService,
    private schoolProfileService: SchoolProfileService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadSchoolProfile();
  }

  /* ---------- LOADERS ---------- */

  private loadDepartments(): void {
    this.teachersService.getDepartments().subscribe({
      next: res => {
        this.departments = (res.departments || []).sort((a, b) =>
          a.localeCompare(b)
        );
      },
      error: err => {
        console.error('Failed to load departments:', err);
      },
    });
  }

  private loadSchoolProfile(): void {
    this.schoolProfileService.getProfile().subscribe({
      next: profile => {
        this.schoolProfile = profile;
      },
      error: err => {
        console.error('Failed to load school profile:', err);
      },
    });
  }

  private loadSalaries(): void {
    if (!this.selectedMonthYear) {
      this.teachers = [];
      this.filteredTeachers = [];
      return;
    }

    this.isLoading = true;
    this.salariesService
      .getSalaries(this.selectedMonthYear, this.selectedDepartment)
      .subscribe({
        next: res => {
          this.teachers = res.teachers || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: err => {
          console.error('Failed to load salaries:', err);
          this.teachers = [];
          this.filteredTeachers = [];
          this.isLoading = false;
        },
      });
  }

  /* ---------- MONTH + FILTERS ---------- */

  onMonthSelect(): void {
    if (this.selectedMonthYear) {
      const [yearStr, monthStr] = this.selectedMonthYear.split('-');
      this.selectedYear = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      this.selectedMonth = new Date(0, monthIndex).toLocaleString('default', {
        month: 'long',
      });

      this.loadSalaries();
    } else {
      this.selectedMonth = '';
      this.selectedYear = 0;
      this.teachers = [];
      this.filteredTeachers = [];
    }
  }

  filterTeachers(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    const search = this.searchTerm.toLowerCase().trim();

    this.filteredTeachers = (this.teachers || []).filter(t => {
      const matchDept =
        this.selectedDepartment === 'All' ||
        t.department === this.selectedDepartment;

      const idMatch = t.teacherId.toLowerCase().includes(search);
      const nameMatch = t.fullName.toLowerCase().includes(search);

      const matchSearch = !search || idMatch || nameMatch;

      return matchDept && matchSearch;
    });
  }

  /* ---------- PAYSLIP VIEW / EDIT ---------- */

  get selectedNetSalary(): number {
    if (!this.selectedTeacher) return 0;
    return (
      Number(this.selectedTeacher.basicSalary || 0) +
      Number(this.selectedTeacher.allowance || 0) -
      Number(this.selectedTeacher.deductions || 0)
    );
  }

  viewPayslip(teacher: TeacherSalary): void {
    this.selectedTeacher = teacher;
    this.showEditModal = false;
    this.showPayslipModal = true;
  }


  

  openEditModal(teacher: TeacherSalary): void {
    this.selectedTeacher = teacher;
    this.basicSalary = Number(teacher.basicSalary || 0);
    this.allowance = Number(teacher.allowance || 0);
    this.deductions = Number(teacher.deductions || 0);
    this.showEditModal = true;
    this.showPayslipModal = true;
  }

  savePayslip(): void {
    if (!this.selectedTeacher || !this.selectedMonthYear) {
      return;
    }

    const body = {
      teacherId: this.selectedTeacher.id, // numeric PK from backend
      month: this.selectedMonthYear,
      basicSalary: this.basicSalary,
      allowance: this.allowance,
      deductions: this.deductions,
    };

    this.salariesService.saveSalary(body).subscribe({
      next: () => {
        // refresh list so UI stays in sync
        this.loadSalaries();
        this.closeModal();
      },
      error: err => {
        console.error('Failed to save salary:', err);
      },
    });
  }

  /* ---------- DOWNLOAD PAYSLIP ---------- */

async downloadPayslip(teacher: TeacherSalary): Promise<void> {
  if (!this.selectedMonthYear) return;

  this.selectedTeacher = teacher;
  this.showEditModal = false;
  this.showPayslipModal = true;

  // Wait for modal to render
  await new Promise(resolve => setTimeout(resolve, 300));

  // NEW: Use the correct selector for your Tailwind modal
  const modal = document.querySelector('.bg-white.rounded-lg.w-\\[550px\\]') as HTMLElement;
  
  if (!modal) {
    console.error('Payslip modal element not found');
    this.closeModal();
    return;
  }

  try {
    const canvas = await html2canvas(modal);
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const monthLabel = this.selectedMonth || this.selectedMonthYear;
    doc.save(`Payslip_${teacher.fullName}_${monthLabel}_${this.selectedYear}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    this.closeModal();
  }
}

  /* ---------- MODAL UTILS ---------- */

  closeModal(): void {
    this.showPayslipModal = false;
    this.showEditModal = false;
    this.selectedTeacher = null;
  }
}