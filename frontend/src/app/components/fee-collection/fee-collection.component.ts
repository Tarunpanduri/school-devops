import {
  Component,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FeeStructureService, Fee } from '../../services/fees/fee-structure.service';
import { FeeCollectionService, FeePayment, StudentSummary } from '../../services/fee-collection/fee-collection.service';
import { StudentsService, Student } from '../../services/student-info/student-info.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-fee-collection',
  standalone: false,
  templateUrl: './fee-collection.component.html',
  styleUrls: ['./fee-collection.component.css'],
})
export class FeeCollectionComponent implements OnInit {
  // dynamic academic years
  academicYears: string[] = [];
  classes: string[] = [];

  // Selected filters
  selectedAcademicYear = '';
  selectedClass = '';

  // Students data
  students: Student[] = [];
  filteredStudents: Student[] = [];
  searchTerm = '';
  selectedStudent: Student | null = null;

  // Fee data
  feeItems: Fee[] = [];
  totalFee = 0;

  // Payment form
  paymentAmount: number | null = null;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | 'Cheque' | 'Card' = 'Cash';
  selectedFeeType = '';

  // Payment history and summary
  payments: FeePayment[] = [];
  summary: StudentSummary | null = null;

  // Maps for per-fee paid & remaining
  feePaidMap: Record<string, number> = {};
  feeRemainingMap: Record<string, number> = {};

  // UI states
  loading = false;
  message = '';
  private feeItemsLoading = false;

  // validation helper
  amountExceedsRemaining = false;

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

  // =================== ACADEMIC YEARS (NO HARDCODE) ===================
  async loadAcademicYears(): Promise<void> {
    // try API first if available in feeStrSvc
    try {
      if (typeof (this.feeStrSvc as any).getAcademicYears === 'function') {
        const res: any = await firstValueFrom((this.feeStrSvc as any).getAcademicYears());
        this.academicYears = res?.years || res?.academicYears || [];
      }
    } catch (err) {
      console.warn('getAcademicYears API failed, will fallback to generated years', err);
    }

    // fallback: generate a reasonable range: current-3 .. current+1 as "YYYY - YYYY"
    if (!this.academicYears || this.academicYears.length === 0) {
      const now = new Date();
      const year = now.getFullYear();
      const fallback: string[] = [];
      for (let y = year - 3; y <= year + 1; y++) {
        fallback.push(`${y} - ${y + 1}`);
      }
      // put newest first
      this.academicYears = fallback.reverse();
    }

    // default to first if not set
    if (!this.selectedAcademicYear && this.academicYears.length) {
      this.selectedAcademicYear = this.academicYears[0];
    }
  }

  // =================== DATA LOADING METHODS ===================
  loadClasses(): void {
    this.feeStrSvc.getClasses().subscribe({
      next: (res: any) => {
        this.classes = res.classes || [];
        if (!this.selectedClass && this.classes.length) {
          this.selectedClass = this.classes[0];
        }
        // load fees for initial selection
        this.loadFeeItems().catch(() => {});
      },
      error: () => {
        this.classes = [];
      }
    });
  }

  loadStudents(): void {
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

  async loadFeeItems(): Promise<void> {
    if (this.feeItemsLoading) {
      // wait for previous load to finish
      await new Promise(resolve => {
        const check = () => {
          if (!this.feeItemsLoading) return resolve(undefined);
          setTimeout(check, 40);
        };
        check();
      });
      return;
    }

    if (!this.selectedAcademicYear || !this.selectedClass) {
      this.feeItems = [];
      this.totalFee = 0;
      return;
    }

    this.feeItemsLoading = true;

    try {
      const res: any = await firstValueFrom(this.feeStrSvc.getFees(this.selectedAcademicYear, this.selectedClass));
      this.feeItems = (res.fees || []).map((f: any) => ({
        ...f,
        category: f.category ?? f.name ?? f.feeType ?? '',
        amount: Number(f.amount ?? f.feeAmount ?? f.value ?? 0)
      }));
      this.calculateTotalFee();

      if (this.feeItems.length && !this.selectedFeeType) {
        this.selectedFeeType = this.feeItems[0].category;
      }

      // recompute remaining if payments loaded
      this.updateFeePaidAndRemaining();
    } catch (err) {
      console.error('Failed to load fee items', err);
      this.feeItems = [];
      this.totalFee = 0;
    } finally {
      this.feeItemsLoading = false;
    }
  }

  // =================== FILTER AND SELECTION METHODS ===================
  filterStudents(): void {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      this.filteredStudents = [...this.students];
      return;
    }

    this.filteredStudents = this.students.filter(student => {
      return (
        (student.admissionNumber || '').toString().toLowerCase().includes(query) ||
        (`${student.firstName || ''} ${student.lastName || ''}`).toLowerCase().includes(query)
      );
    });
  }

  onAcademicClassChange(): void {
    this.loadFeeItems()
      .then(() => {
        if (this.selectedStudent) {
          this.loadPaymentsAndSummary().catch(() => {});
        }
      })
      .catch(() => {
        if (this.selectedStudent) this.loadPaymentsAndSummary().catch(() => {});
      });
  }

  async selectStudent(student: Student): Promise<void> {
    this.selectedStudent = student;
    this.message = '';

    // Update selected class to match student's class
    if (student.currentClass && this.selectedClass !== student.currentClass) {
      this.selectedClass = student.currentClass;
    }

    await this.loadFeeItems();
    await this.loadPaymentsAndSummary();
  }

  // =================== PAYMENT METHODS ===================
  async loadPaymentsAndSummary(): Promise<void> {
    if (!this.selectedStudent || !this.selectedStudent.admissionNumber) {
      // nothing to load
      this.payments = [];
      this.summary = null;
      this.feePaidMap = {};
      this.feeRemainingMap = {};
      return;
    }

    const studentId = this.selectedStudent.admissionNumber;
    const academicYear = this.selectedAcademicYear;

    try {
      const [paymentsRes, summaryRes]: any = await Promise.all([
        firstValueFrom(this.feeCollSvc.getPayments(studentId, academicYear)),
        firstValueFrom(this.feeCollSvc.getSummary(studentId, academicYear))
      ]);

      this.payments = (paymentsRes?.payments || []).map((p: any) => this.normalizePayment(p));

      if (summaryRes?.summary) {
        this.summary = summaryRes.summary;
      } else {
        this.calculateSummaryFromPayments();
      }

      // build paid & remaining maps
      this.updateFeePaidAndRemaining();

      this.cd.markForCheck();
    } catch (error) {
      console.error('Failed to load payments and summary:', error);
      this.payments = [];
      this.summary = null;
      this.feePaidMap = {};
      this.feeRemainingMap = {};
    }
  }

  onFeeTypeChange(): void {
    // clear entered amount to avoid accidental overpay
    this.paymentAmount = null;
    this.amountExceedsRemaining = false;
  }

  canSubmitPayment(): boolean {
    if (!this.selectedStudent || !this.selectedStudent.admissionNumber) return false;
    if (this.paymentAmount === null || isNaN(Number(this.paymentAmount))) return false;
    if (!this.selectedFeeType) return false;
    const remaining = this.getRemainingForFeeType(this.selectedFeeType);
    if (remaining <= 0) return false; // nothing to collect
    if (Number(this.paymentAmount) <= 0) return false;
    // prevent overpay on that fee type
    if (Number(this.paymentAmount) > remaining) return false;
    return true;
  }

  validateAmountAgainstRemaining(): void {
    this.amountExceedsRemaining = false;
    if (!this.selectedFeeType) return;
    const remaining = this.getRemainingForFeeType(this.selectedFeeType);
    if (this.paymentAmount !== null && Number(this.paymentAmount) > remaining) {
      this.amountExceedsRemaining = true;
    }
  }

  resetPaymentForm(): void {
    this.paymentAmount = null;
    this.selectedFeeType = this.feeItems.length ? this.feeItems[0].category : '';
    this.paymentMode = 'Cash';
    this.amountExceedsRemaining = false;
  }

  submitPayment(): void {
    if (!this.canSubmitPayment() || !this.selectedStudent || !this.selectedStudent.admissionNumber) {
      return;
    }

    // Final safety check
    const remaining = this.getRemainingForFeeType(this.selectedFeeType);
    if (Number(this.paymentAmount) > remaining) {
      this.message = 'Failed: Entered amount exceeds remaining for selected fee type';
      return;
    }

    this.loading = true;
    this.message = '';

    const paymentData = {
      studentId: this.selectedStudent.admissionNumber,
      academicYear: this.selectedAcademicYear,
      feeType: this.selectedFeeType,
      amount: Number(this.paymentAmount),
      paymentMode: this.paymentMode
    };

    this.feeCollSvc.collectPayment(paymentData).subscribe({
      next: (response: any) => {
        const raw = response.payment || response;
        const savedPayment = this.normalizePayment(raw);

        // prepend new payment
        this.payments = [savedPayment, ...this.payments];

        // recalc summary & maps
        this.calculateSummaryFromPayments();
        this.updateFeePaidAndRemaining();

        this.paymentAmount = null;
        this.message = 'Payment recorded successfully';
        this.loading = false;

        // Generate receipt (non blocking)
        this.generateReceiptPdf(savedPayment).catch(err => console.error(err));
      },
      error: (error) => {
        console.error('Failed to submit payment:', error);
        this.message = (error.error && error.error.error) ? error.error.error : 'Failed to record payment';
        this.loading = false;
      }
    });
  }

  // =================== CALCULATION METHODS ===================

  private calculateTotalFee(): void {
    this.totalFee = this.feeItems.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  private calculateSummaryFromPayments(): void {
    if (!this.selectedStudent || !this.selectedStudent.admissionNumber) return;

    const totalPaid = this.payments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    const totalDue = this.totalFee - totalPaid;

    this.summary = {
      studentId: this.selectedStudent.admissionNumber,
      academicYear: this.selectedAcademicYear,
      totalFee: this.totalFee,
      totalPaid,
      totalDue,
      updatedAt: new Date().toISOString()
    };

    this.cd.markForCheck();
  }

  getTotalPaid(): number {
    if (this.summary && this.summary.totalPaid !== undefined) {
      return this.summary.totalPaid;
    }
    return this.payments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  }

  getBalance(): number {
    return this.totalFee - this.getTotalPaid();
  }

  getBalanceClass(): string {
    const balance = this.getBalance();
    if (balance > 0) {
      return 'text-red-600';
    } else if (balance < 0) {
      return 'text-blue-600';
    }
    return 'text-green-600';
  }

  getBalanceText(): string {
    const balance = this.getBalance();
    if (balance > 0) return 'Due';
    if (balance < 0) return 'Overpaid';
    return 'Paid';
  }

  // =================== PER-FEE MAPS ===================
  private updateFeePaidAndRemaining(): void {
    // initialize maps
    this.feePaidMap = {};
    this.feeRemainingMap = {};

    // initialize paid sums for known fee categories to 0
    for (const f of this.feeItems) {
      this.feePaidMap[f.category] = 0;
    }

    // aggregate payments by feeType
    for (const p of this.payments) {
      const key = p.feeType || p.feeType || 'Unknown';
      const amt = Number(p.amount || 0);
      this.feePaidMap[key] = (this.feePaidMap[key] || 0) + amt;
    }

    // compute remaining per fee item
    for (const f of this.feeItems) {
      const paid = this.feePaidMap[f.category] || 0;
      const remaining = Math.max(0, (Number(f.amount) || 0) - paid);
      this.feeRemainingMap[f.category] = remaining;
    }

    // if there are payments for categories not present in feeItems, store them too
    for (const key of Object.keys(this.feePaidMap)) {
      if (!this.feeRemainingMap.hasOwnProperty(key)) {
        // unknown category (maybe ad-hoc payment) -> mark remaining as 0
        this.feeRemainingMap[key] = 0;
      }
    }

    // ensure selectedFeeType exists; if not, pick first available
    if (this.feeItems.length && !this.selectedFeeType) {
      this.selectedFeeType = this.feeItems[0].category;
    }

    this.cd.markForCheck();
  }

  getRemainingForFeeType(feeType: string): number {
    if (!feeType) return 0;
    return this.feeRemainingMap[feeType] ?? 0;
  }

  // =================== RECEIPT GENERATION (UNCHANGED) ===================
  async generateReceiptPdf(payment: FeePayment): Promise<void> {
    try {
      const receiptHtml = this.buildReceiptHtml(payment);
      const receiptElement = document.createElement('div');

      receiptElement.style.position = 'fixed';
      receiptElement.style.left = '-9999px';
      receiptElement.style.top = '0';
      receiptElement.style.width = '800px';
      receiptElement.style.padding = '20px';
      receiptElement.style.background = 'white';
      receiptElement.innerHTML = receiptHtml;

      document.body.appendChild(receiptElement);

      await new Promise(resolve => setTimeout(resolve, 100));
      await document.fonts.ready;

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const imageData = canvas.toDataURL('image/png');
      pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const studentId = this.selectedStudent?.admissionNumber || this.selectedStudent?.id;
      const receiptNumber = payment.receiptNo || `RCPT-${Date.now()}`;
      const filename = `Receipt_${studentId}_${receiptNumber}.pdf`;

      pdf.save(filename);

      document.body.removeChild(receiptElement);

    } catch (error) {
      console.error('Error generating receipt PDF:', error);
    }
  }

  private buildReceiptHtml(payment: FeePayment): string {
    const studentName = `${this.selectedStudent?.firstName || ''} ${this.selectedStudent?.lastName || ''}`;
    const admissionNo = this.selectedStudent?.admissionNumber || 'N/A';
    const paidDate = payment.paidOn
      ? new Date(payment.paidOn).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const receiptNo = payment.receiptNo || `RCPT-${Date.now()}`;
    const amount = Number(payment.amount || 0);

    const schoolName = environment.schoolName || 'Little Buds School';
    const schoolAddress = environment.schoolAddress || 'Kakinada, Andhra Pradesh';
    const schoolPhone = environment.schoolPhone || '+91 1234567890';
    const schoolEmail = environment.schoolEmail || 'info@sfsschool.edu.in';

    return `
  <!-- Google Fonts: Merriweather for print-friendly serif, Patrick Hand for signature -->
  <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Patrick+Hand&display=swap" rel="stylesheet">

  <div style="font-family: 'Merriweather', serif; color: #000; max-width: 800px; margin: 0 auto; padding: 20px;">
    <!-- Print-friendly meta -->
    <style>
      /* Ensure crisp thin lines when printed */
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body, html { background: #fff; }
      .receipt { width: 100%; border: 1px solid #000; padding: 20px; }
      .header { text-align: center; padding-bottom: 12px; border-bottom: 1.5px solid #000; margin-bottom: 14px; }
      .school-name { font-size: 26px; font-weight: 700; letter-spacing: 0.4px; }
      .meta { font-size: 12px; color: #000; opacity: 0.85; margin-top: 4px; }
      .row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .col { flex: 1; }
      .info-box { border: 1px solid #000; padding: 12px; border-radius: 4px; background: #fff; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #000; padding: 10px 12px; font-size: 13px; }
      thead th { font-weight: 700; background: #f5f5f5; }
      .totals { margin-top: 8px; display: flex; justify-content: flex-end; gap: 8px; }
      .totals .label { font-weight: 700; }
      .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
      .signature { margin-top: 28px; display:flex; justify-content:space-between; align-items:flex-end; }
      .sig-line { border-top: 1px dashed #000; width: 220px; text-align: center; padding-top: 8px; font-size: 13px; }
      .paid-badge { display:inline-block; border: 1px solid #000; padding: 6px 12px; font-weight:700; font-size:13px; }
      .small { font-size: 12px; color: #000; opacity: 0.85; }
      .amount-words { font-size: 13px; font-style: italic; margin-top: 6px; }
      @media print {
        .receipt { border: none; padding: 0; }
        .header { margin-bottom: 8px; }
      }
    </style>

    <div class="receipt" role="document" aria-label="Payment Receipt">
      <!-- Header -->
      <div class="header">
        <div class="school-name">${schoolName}</div>
        <div class="meta">${schoolAddress}</div>
        <div class="meta">Phone: ${schoolPhone} | Email: ${schoolEmail}</div>
      </div>

      <!-- Receipt & Student meta -->
      <div class="row" style="margin-top:10px;">
        <div class="col">
          <div style="font-size:13px;">
            <div style="font-weight:700; margin-bottom:4px;">PAYMENT RECEIPT</div>
            <div class="small"><strong>Receipt No:</strong> ${receiptNo}</div>
            <div class="small"><strong>Date:</strong> ${paidDate}</div>
          </div>
        </div>

        <div style="flex:0 0 auto; text-align:right;">
          <div class="paid-badge">PAID</div>
        </div>
      </div>

      <!-- Student Info -->
      <div style="margin-top:14px;">
        <div class="info-box">
          <div style="font-weight:700; margin-bottom:8px;">Student Information</div>
          <div class="info-grid">
            <div>
              <div style="font-size:13px;"><strong>Student Name:</strong> ${studentName}</div>
              <div style="font-size:13px;"><strong>Admission No:</strong> ${admissionNo}</div>
            </div>
            <div>
              <div style="font-size:13px;"><strong>Academic Year:</strong> ${payment.academicYear}</div>
              <div style="font-size:13px;"><strong>Class:</strong> ${this.selectedClass}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Table -->
      <table aria-label="Payment details">
        <thead>
          <tr>
            <th style="text-align:left">Description</th>
            <th style="text-align:right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:left">${payment.feeType}</td>
            <td style="text-align:right">₹${amount.toFixed(2)}</td>
          </tr>

          <tr>
            <td style="text-align:left; font-weight:700">TOTAL PAID</td>
            <td style="text-align:right; font-weight:700">₹${amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Payment Info & Amount in words -->
      <div class="details">
        <div style="border:1px solid #000; padding:10px; border-radius:4px;">
          <div style="font-weight:700; margin-bottom:8px;">Payment Information</div>
          <div class="small"><strong>Payment Mode:</strong> ${payment.paymentMode}</div>
          <div class="small"><strong>Collected By:</strong> ${payment.collectedBy || 'System'}</div>
        </div>

        <div style="border:1px solid #000; padding:10px; border-radius:4px;">
          <div style="font-weight:700; margin-bottom:8px;">Amount in Words</div>
          <div class="amount-words">${this.amountInWords(amount)}</div>
        </div>
      </div>

      <!-- Signature and footer -->
      <div class="signature">
        <div style="flex:1;">
          <div style="font-size:12px; color:#000; opacity:0.85;">
            <div>Generated on: ${new Date().toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style="flex:0 0 auto; text-align:center;">
          <div class="sig-line" style="font-family: 'Patrick Hand', cursive;">Collector / Teacher</div>
        </div>
      </div>
    </div>
  </div>
`;
  }

  private amountInWords(amount: number): string {
    if (!amount) return 'Zero Rupees Only';
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = '';
    if (rupees > 0) words += this.convertNumberToWords(rupees) + ' Rupees';
    if (paise > 0) words += (words ? ' and ' : '') + this.convertNumberToWords(paise) + ' Paise';
    return words + ' Only';
  }

  private convertNumberToWords(num: number): string {
    if (num < 10) return this.getUnitWord(num);
    if (num < 20) return this.getTeenWord(num - 10);
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      return this.getTenWord(ten) + (unit > 0 ? ' ' + this.getUnitWord(unit) : '');
    }
    // fallback for larger numbers - for production use a library
    return num.toString();
  }

  private getUnitWord(num: number): string {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    return units[num] || '';
  }

  private getTeenWord(num: number): string {
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    return teens[num] || '';
  }

  private getTenWord(num: number): string {
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    return tens[num] || '';
  }

  // =================== HELPERS / UTIL ===================

  private normalizePayment(p: any): FeePayment {
    const paidAmount = Number(p.paid_amount ?? p.paidAmount ?? p.amount ?? p.paid ?? 0);
    const receiptNo = p.receipt_no ?? p.receiptNo ?? p.receipt ?? (`RCPT-${p.id ?? Date.now()}`);
    const paidOn = p.paid_on ?? p.paidOn ?? p.paidOnDate ?? p.paid_on_date ?? p.created_at ?? p.createdAt ?? null;
    const studentId = p.student_id ?? p.studentId;

    return {
      id: p.id,
      studentId: studentId,
      feeType: p.fee_type ?? p.feeType ?? p.particular ?? '',
      academicYear: p.academic_year ?? p.academicYear ?? this.selectedAcademicYear,
      paymentMode: p.payment_mode ?? p.paymentMode ?? 'Cash',
      receiptNo,
      collectedBy: p.collected_by ?? p.collectedBy ?? null,
      paidOn,
      amount: paidAmount,
      reference: p.reference ?? null,
      // @ts-ignore
      _raw: p
    };
  }

  getPaymentModeClass(mode?: string): string {
    if (!mode) return 'bg-gray-100 text-gray-800';
    const m = mode.toLowerCase();
    if (m === 'cash') return 'bg-yellow-100 text-yellow-800';
    if (m === 'upi') return 'bg-green-100 text-green-800';
    if (m.includes('bank') || m === 'bank transfer') return 'bg-blue-100 text-blue-800';
    if (m === 'cheque') return 'bg-indigo-100 text-indigo-800';
    if (m === 'card') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  }

  trackById(index: number, item: any): any {
    return item.id || item.studentId || item.admissionNumber || index;
  }
}
