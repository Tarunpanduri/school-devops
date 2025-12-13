import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FeeStructureService, Fee } from '../../services/fees/fee-structure.service';
import { FeeCollectionService, FeePayment, StudentSummary } from '../../services/fee-collection/fee-collection.service';
import { StudentsService } from '../../services/student-info/student-info.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-fee-collection',
  standalone: false,
  templateUrl: './fee-collection.component.html',
  styleUrl: './fee-collection.component.css',
})
export class FeeCollectionComponent implements OnInit {
  academicYears: string[] = [];
  classes: string[] = [];

  selectedAcademicYear = '2024-2025';
  selectedClass = '';

  students: any[] = [];
  filteredStudents: any[] = [];
  search = '';

  selectedStudent: any | null = null;

  feeItems: Fee[] = [];
  totalFee = 0;

  paymentAmount: number | null = null;
  paymentMode: 'Cash' | 'UPI' | 'Bank' = 'Cash';
  selectedFeeType = '';

  payments: FeePayment[] = [];
  summary: StudentSummary | null = null;

  loading = false;
  message = '';

  // small local state to track if feeItems are currently loading
  private feeItemsLoading = false;

  constructor(
    private feeStrSvc: FeeStructureService,
    private feeCollSvc: FeeCollectionService,
    private studentsSvc: StudentsService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAcademicYears();
    this.loadClasses();
    this.loadStudents();
  }

  loadAcademicYears() {
    this.feeStrSvc.getAcademicYears().subscribe({
      next: res => {
        this.academicYears = res.years || [];
        if (this.academicYears.length && !this.academicYears.includes(this.selectedAcademicYear)) {
          this.selectedAcademicYear = this.academicYears[0];
        }
      },
      error: () => {
        // ignore - keep default year if API fails
      }
    });
  }

  loadClasses() {
    this.feeStrSvc.getClasses().subscribe({
      next: (res: any) => {
        this.classes = res.classes || [];
        // if no selected class, pick first
        if (!this.selectedClass && this.classes.length) {
          this.selectedClass = this.classes[0];
        }
        // load fee items for the initially selected class
        this.loadFeeItems().catch(() => {});
      },
      error: () => {}
    });
  }

  loadStudents() {
    this.studentsSvc.getStudents().subscribe({
      next: (res: any) => {
        this.students = res.students || [];
        this.filteredStudents = [...this.students];
      },
      error: () => {
        this.students = [];
        this.filteredStudents = [];
      }
    });
  }

  filterStudents() {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.filteredStudents = [...this.students];
      return;
    }
    this.filteredStudents = this.students.filter(s =>
      (s.admissionNumber || '').toString().toLowerCase().includes(q) ||
      (`${s.firstName || ''} ${s.lastName || ''}`).toLowerCase().includes(q) ||
      (s.studentId && s.studentId.toString().includes(q))
    );
  }

  // Important: returns a Promise that resolves when feeItems are loaded (or immediately if already loaded)
  loadFeeItems(): Promise<void> {
    // If already loading, wait until loaded (polling simple guard)
    if (this.feeItemsLoading) {
      return new Promise((resolve) => {
        const check = () => {
          if (!this.feeItemsLoading) return resolve();
          setTimeout(check, 40);
        };
        check();
      });
    }

    // If no academicYear/class chosen, ensure empty state
    if (!this.selectedAcademicYear || !this.selectedClass) {
      this.feeItems = [];
      this.totalFee = 0;
      return Promise.resolve();
    }

    this.feeItemsLoading = true;

    return new Promise((resolve, reject) => {
      this.feeStrSvc.getFees(this.selectedAcademicYear, this.selectedClass).subscribe({
        next: (res: any) => {
          this.feeItems = (res.fees || []).map((f: Fee) => ({
            ...f,
            amount: Number(f.amount || 0)
          }));
          // Recompute totalFee from loaded fee items (prevents stale/zero totals)
          this.totalFee = this.feeItems.reduce((s, fi) => s + Number(fi.amount || 0), 0);
          // if no selectedFeeType, set a sane default
          if (this.feeItems.length && !this.selectedFeeType) {
            this.selectedFeeType = this.feeItems[0].category;
          }
          this.feeItemsLoading = false;
          resolve();
        },
        error: (err) => {
          console.error('Failed to load fee items', err);
          this.feeItems = [];
          this.totalFee = 0;
          this.feeItemsLoading = false;
          // fail gracefully but resolve so callers don't hang forever
          resolve();
        }
      });
    });
  }

  // Called when user changes academic year or class
  onAcademicClassChange() {
    // reload fee items then if a student is selected re-load summary/payments
    this.loadFeeItems()
      .then(() => {
        if (this.selectedStudent) {
          // if selected student's class differs from current selectedClass, do NOT auto-change student class;
          // rather we keep selectedClass as user-chosen and re-calc summary
          this.loadPaymentsAndSummary();
        }
      })
      .catch(() => {
        if (this.selectedStudent) this.loadPaymentsAndSummary();
      });
  }

  // selectStudent now awaits fee items to be ready before computing totals
  async selectStudent(student: any) {
    this.selectedStudent = student;

    // If student's class exists and is different, prefer reloading feeItems for that class
    // but don't force UI class selector change unless you want that UX
    const studentClass = student?.currentClass ? String(student.currentClass) : null;

    // If feeItems are not loaded or they don't belong to student's class+year, reload
    const needReload =
      !this.feeItems ||
      this.feeItems.length === 0 ||
      (studentClass && String(this.selectedClass) !== studentClass);

    if (needReload && studentClass) {
      // Change selectedClass to student's class and reload fee items
      // NOTE: if you prefer to *not* auto-change the class selector, comment the next line and call loadFeeItems() with explicit args
      this.selectedClass = studentClass;
    }

    await this.loadFeeItems();

    // After fee items are guaranteed loaded, fetch payments & summary
    await this.loadPaymentsAndSummary();
  }

  // wait for fee items + payments before computing summary
  async loadPaymentsAndSummary() {
    if (!this.selectedStudent) return;

    // Ensure fee items are loaded
    await this.loadFeeItems();

    const sid = this.selectedStudent.id;
    const year = this.selectedAcademicYear;

    // Fetch payments (and optionally server summary); run both in parallel
    const paymentsPromise = new Promise<void>((resolve) => {
      this.feeCollSvc.getPayments(sid, year).subscribe({
        next: res => {
          this.payments = (res && res.payments) || [];
          resolve();
        },
        error: () => {
          this.payments = [];
          resolve();
        }
      });
    });

    const summaryPromise = new Promise<void>((resolve) => {
      this.feeCollSvc.getSummary(sid, year).subscribe({
        next: res => {
          if (res && res.summary) {
            // server provided summary: trust it, but ensure numeric fields
            this.summary = {
              studentId: Number(res.summary.studentId || sid),
              academicYear: res.summary.academicYear || year,
              totalFee: Number(res.summary.totalFee || this.totalFee),
              totalPaid: Number(res.summary.totalPaid || 0),
              totalDue: Number(res.summary.totalDue ?? (Number(res.summary.totalFee || this.totalFee) - Number(res.summary.totalPaid || 0)))
            };
          }
          resolve();
        },
        error: () => {
          // server summary not available — we'll compute after payments resolved
          resolve();
        }
      });
    });

    // wait both
    await Promise.all([paymentsPromise, summaryPromise]);

    // if no server summary, compute from payments + current feeItems
    if (!this.summary || this.summary.studentId !== sid) {
      this.computeSummaryFromPayments();
    } else {
      // server summary exists: but still compute totalFee from loaded feeItems to keep UI consistent
      this.summary.totalFee = Number(this.totalFee || this.summary.totalFee || 0);
      this.summary.totalDue = Number((this.summary.totalFee - this.summary.totalPaid).toFixed(2));
    }

    // ensure UI update
    this.cd.markForCheck();
  }

  private computeSummaryFromPayments() {
    const totalPaid = this.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalFee = Number(this.totalFee || this.feeItems.reduce((s, f) => s + Number(f.amount || 0), 0));
    const totalDue = Number((totalFee - totalPaid).toFixed(2));
    this.summary = {
      studentId: this.selectedStudent?.id,
      academicYear: this.selectedAcademicYear,
      totalFee,
      totalPaid,
      totalDue
    };
    this.cd.markForCheck();
  }

  canSubmitPayment(): boolean {
    return !!this.selectedStudent && this.paymentAmount !== null && this.paymentAmount >= 0 && !!this.selectedFeeType;
  }

  submitPayment() {
    if (!this.canSubmitPayment() || !this.selectedStudent) return;
    this.loading = true;
    this.message = '';

    const payload: FeePayment = {
      studentId: this.selectedStudent.id,
      academicYear: this.selectedAcademicYear,
      feeType: this.selectedFeeType,
      amount: Number(this.paymentAmount || 0),
      paymentMode: this.paymentMode,
      collectedBy: 'SYSTEM_ADMIN'
    };

    this.feeCollSvc.collectPayment(payload).subscribe({
      next: (res) => {
        const saved = res.payment;
        this.payments = [saved, ...this.payments];
        this.computeSummaryFromPayments();
        this.paymentAmount = null;
        this.message = 'Payment recorded successfully';
        this.loading = false;
        setTimeout(() => this.generateReceiptPdf(saved), 200);
      },
      error: (err) => {
        console.error('collect error', err);
        this.message = 'Failed to record payment';
        this.loading = false;
      }
    });
  }

  // existing receipt generation code (unchanged)
  async generateReceiptPdf(payment: FeePayment) {
    try {
      const receiptRoot = document.createElement('div');
      receiptRoot.style.position = 'fixed';
      receiptRoot.style.left = '-9999px';
      receiptRoot.style.top = '0';
      receiptRoot.style.width = '800px';
      receiptRoot.style.padding = '20px';
      receiptRoot.style.background = 'white';
      receiptRoot.innerHTML = this.buildReceiptHtml(payment);
      document.body.appendChild(receiptRoot);
      await new Promise(r => setTimeout(r, 80));
      // dynamically import to avoid SSR issues if any
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(receiptRoot, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filename = `Receipt_${this.selectedStudent?.admissionNumber || this.selectedStudent?.id}_${payment.receiptNo || Date.now()}.pdf`;
      doc.save(filename);
      document.body.removeChild(receiptRoot);
    } catch (err) {
      console.error('Receipt PDF error', err);
    }
  }

  buildReceiptHtml(payment: FeePayment): string {
    const studentName = `${this.selectedStudent?.firstName || ''} ${this.selectedStudent?.lastName || ''}`;
    const adm = this.selectedStudent?.admissionNumber || this.selectedStudent?.id || '';
    const paidOn = payment.paidOn ? new Date(payment.paidOn).toLocaleString() : new Date().toLocaleString();
    const receiptNo = payment.receiptNo || `RCPT-${Date.now()}`;

    return `
      <div style="font-family:Helvetica, Arial, sans-serif; color:#111; width:760px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:10px;">
          <div>
            <h2 style="margin:0;">SFS SCHOOL</h2>
            <div style="font-size:12px; color:#555;">Pitapuram, Andhra Pradesh</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#555;">Receipt No: <strong>${receiptNo}</strong></div>
            <div style="font-size:12px; color:#555;">Date: <strong>${paidOn}</strong></div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div><strong>Student:</strong> ${studentName}</div>
          <div><strong>Admission No:</strong> ${adm}</div>
          <div><strong>Academic Year:</strong> ${payment.academicYear}</div>
          <div><strong>Class:</strong> ${this.selectedClass}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #ddd; padding-bottom:6px;">Particulars</th>
              <th style="text-align:right; border-bottom:1px solid #ddd; padding-bottom:6px;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 0;">${payment.feeType}</td>
              <td style="text-align:right; padding:8px 0;">${Number(payment.amount).toFixed(2)}</td>
            </tr>

            <tr>
              <td style="padding:8px 0; border-top:1px solid #eee;"><strong>Total Paid</strong></td>
              <td style="text-align:right; padding:8px 0; border-top:1px solid #eee;"><strong>${Number(payment.amount).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="font-size:12px; color:#666;">
          <div>Payment Mode: <strong>${payment.paymentMode}</strong></div>
          <div>Collected By: <strong>${payment.collectedBy || ''}</strong></div>
        </div>

        <div style="margin-top:24px; font-size:11px; color:#444;">
          <em>This is a system-generated receipt and does not require signature.</em>
        </div>
      </div>
    `;
  }

  trackById(_: number, item: any) {
    return item.id || item.studentId || item.admissionNumber;
  }
}