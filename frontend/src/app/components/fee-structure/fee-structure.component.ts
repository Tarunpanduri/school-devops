import { Component, OnDestroy, OnInit } from '@angular/core';
import { FeeStructureService, Fee } from '../../services/fees/fee-structure.service';

@Component({
  selector: 'app-fee-structure',
  templateUrl: './fee-structure.component.html',
  styleUrls: ['./fee-structure.component.css'],
  standalone: false
})
export class FeeStructureComponent implements OnInit {
  academicYears: string[] = [];
  classes: string[] = [];

  selectedClass: string = '';
  selectedYear: string = '';

  feeList: Fee[] = [];

  editingIndex: number | null = null;
  editedFee: (Fee & { isNew?: boolean }) = {
    category: '',
    description: '',
    frequency: '',
    amount: '',
  };

  constructor(private feeService: FeeStructureService) {}

  ngOnInit(): void {
    this.loadAcademicYears();
    this.loadClasses();
  }

  private generateDefaultAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // If academic year runs from April–March:
    if (month >= 4) {
      // e.g. June 2025 -> "2025 - 2026"
      return `${year} - ${year + 1}`;
    } else {
      // e.g. January 2025 -> "2024 - 2025"
      return `${year - 1} - ${year}`;
    }
  }

  loadAcademicYears() {
    this.feeService.getAcademicYears().subscribe({
      next: res => {
        this.academicYears = res.years;

        if (this.academicYears.length > 0) {
          this.selectedYear = this.academicYears[0];
        } else {
          // No data yet in DB: generate a sensible default academic year
          const defaultYear = this.generateDefaultAcademicYear();
          this.academicYears = [defaultYear];
          this.selectedYear = defaultYear;
        }
      },
      error: err => {
        console.error('Failed to load academic years:', err);
        // Fallback if backend fails
        const defaultYear = this.generateDefaultAcademicYear();
        this.academicYears = [defaultYear];
        this.selectedYear = defaultYear;
      },
    });
  }

  loadClasses() {
    this.feeService.getClasses().subscribe({
      next: res => {
        this.classes = res.classes || [];
        if (!this.selectedClass && this.classes.length > 0) {
          this.selectedClass = this.classes[0];
        }
      },
      error: err => {
        console.error('Failed to load classes:', err);
      },
    });
  }

  get selectedGrade(): string {
    return this.selectedClass;
  }

  searchFees() {
    if (!this.selectedYear || !this.selectedClass) {
      alert('Please select both Year and Class');
      return;
    }

    this.feeService.getFees(this.selectedYear, this.selectedGrade).subscribe({
      next: res => {
        this.feeList = res.fees || [];
        this.editingIndex = null;
        this.editedFee = {
          category: '',
          description: '',
          frequency: '',
          amount: '',
        };
      },
      error: err => {
        console.error('Failed to load fees:', err);
        this.feeList = [];
      },
    });
  }

  addNewFee() {
    const newFee: Fee & { isNew?: boolean } = {
      category: '',
      description: '',
      frequency: '',
      amount: '',
      isNew: true,
    };
    this.feeList.push(newFee);
    this.editingIndex = this.feeList.length - 1;
    this.editedFee = { ...newFee };
  }

  editFee(item: Fee, index: number) {
    this.editingIndex = index;
    this.editedFee = { ...item };
  }

  saveFee(index: number) {
    if (!this.selectedYear || !this.selectedClass) {
      alert('Please select both Year and Class');
      return;
    }

    const fee = this.editedFee;

    // Ensure amount is a number
    const amountNumber =
      typeof fee.amount === 'string' ? parseFloat(fee.amount) : fee.amount;

    if (!fee.category || !amountNumber || isNaN(amountNumber as number)) {
      alert('Please enter at least Category and valid Amount');
      return;
    }

    const payload: Fee = {
      category: fee.category,
      description: fee.description,
      frequency: fee.frequency,
      amount: amountNumber as number,
    };

    if (fee['isNew']) {
      // Create new fee
      this.feeService
        .createFee(this.selectedYear, this.selectedGrade, payload)
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.searchFees(); // reload list
          },
          error: err => {
            console.error('Failed to create fee:', err);
          },
        });
    } else {
      if (!fee.id) {
        console.error('Missing fee id for update');
        return;
      }

      this.feeService.updateFee(fee.id, payload).subscribe({
        next: () => {
          this.cancelEdit();
          this.searchFees(); // reload list
        },
        error: err => {
          console.error('Failed to update fee:', err);
        },
      });
    }
  }

  cancelEdit() {
    if (this.editingIndex !== null) {
      const currentRow = this.feeList[this.editingIndex];
      if (
        (currentRow as any).isNew &&
        !this.editedFee.category?.toString().trim() &&
        !this.editedFee.description?.toString().trim() &&
        !this.editedFee.frequency?.toString().trim() &&
        !this.editedFee.amount?.toString().trim()
      ) {
        this.feeList.splice(this.editingIndex, 1);
      }
    }

    this.editingIndex = null;
    this.editedFee = {
      category: '',
      description: '',
      frequency: '',
      amount: '',
    };
  }

  deleteFee(item: Fee) {
    if (!item.id) {
      return;
    }

    if (!confirm(`Delete fee "${item.category}"?`)) {
      return;
    }

    this.feeService.deleteFee(item.id).subscribe({
      next: () => {
        this.searchFees();
      },
      error: err => {
        console.error('Failed to delete fee:', err);
      },
    });
  }
}