import { Component, OnInit } from '@angular/core';
import { Database, ref, onValue, update } from '@angular/fire/database';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  standalone: false,
  selector: 'app-salaries',
  templateUrl: './salaries.component.html',
  styleUrls: ['./salaries.component.css']
})
export class SalariesComponent implements OnInit {
  selectedMonthYear: string = '';
  selectedMonth: string = '';
  selectedYear: number = 0;

  teachers: any[] = [];
  filteredTeachers: any[] = [];

  departments: string[] = [];
  selectedDepartment: string = 'All';
  searchTerm: string = '';

  showPayslipModal: boolean = false;
  showEditModal: boolean = false;
  selectedTeacher: any = null;

  basicSalary: number = 0;
  allowance: number = 0;
  deductions: number = 0;

  constructor(private db: Database) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  onMonthSelect() {
    if (this.selectedMonthYear) {
      const [year, monthNum] = this.selectedMonthYear.split('-');
      this.selectedYear = parseInt(year);
      this.selectedMonth = new Date(0, parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
      this.filterTeachers();
    } else {
      this.filteredTeachers = [];
    }
  }

  loadTeachers() {
    const teachersRef = ref(this.db, 'teachers');
    onValue(teachersRef, (snapshot) => {
      const data = snapshot.val();
      this.teachers = [];
      this.departments = [];
      for (let key in data) {
        const teacher = data[key];
        this.teachers.push({
          key,
          id: teacher.teacherId,  // also fix capitalization here from Teacherid -> teacherId
          name: `${teacher.firstName} ${teacher.lastName}`,
          department: teacher.department,
          joiningDate: teacher.joiningDate, // ✅ FIXED FIELD
          designation: "Teacher",
          basicSalary: teacher.basicSalary || 30000,
          allowance: teacher.allowance || 2000,
          deductions: teacher.deductions || 1000
        });

        if (!this.departments.includes(teacher.department)) {
          this.departments.push(teacher.department);
        }
      }
      this.filterTeachers();
    });
  }

  filterTeachers() {
    if (!this.selectedMonthYear) return;

    const selectedDate = new Date(`${this.selectedMonthYear}-01`);

    this.filteredTeachers = this.teachers.filter(teacher => {
      const [year, month, day] = teacher.joiningDate.split('-');
      const joiningDate = new Date(+year, +month - 1, +day);

      const matchesDept = this.selectedDepartment === 'All' || teacher.department === this.selectedDepartment;
      const matchesSearch = !this.searchTerm ||
        teacher.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        teacher.id.toLowerCase().includes(this.searchTerm.toLowerCase());

      return joiningDate <= selectedDate && matchesDept && matchesSearch;
    });
  }

  viewPayslip(teacher: any) {
    this.selectedTeacher = teacher;
    this.showPayslipModal = true;
  }

  openEditModal(teacher: any) {
    this.selectedTeacher = teacher;
    this.basicSalary = teacher.basicSalary;
    this.allowance = teacher.allowance;
    this.deductions = teacher.deductions;
    this.showEditModal = true;
  }

  savePayslip() {
    update(ref(this.db, `teachers/${this.selectedTeacher.key}`), {
      basicSalary: this.basicSalary,
      allowance: this.allowance,
      deductions: this.deductions
    }).then(() => {
      this.showEditModal = false;
      this.loadTeachers();
    });
  }

  async downloadPayslip(teacher: any) {
    this.selectedTeacher = teacher;
    this.showPayslipModal = true;

    setTimeout(async () => {
      const modal = document.querySelector('.modal-content') as HTMLElement;
      const canvas = await html2canvas(modal);
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`Payslip_${teacher.name}_${this.selectedMonth}_${this.selectedYear}.pdf`);
      this.closeModal();
    }, 200);
  }

  closeModal() {
    this.showPayslipModal = false;
    this.showEditModal = false;
  }
}
