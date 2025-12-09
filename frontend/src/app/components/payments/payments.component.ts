import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Database, ref, child, get, push, set } from '@angular/fire/database';
import { formatDate } from '@angular/common';
import html2pdf from 'html2pdf.js';

@Component({
  standalone: false,
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit {
  searchForm!: FormGroup;
  paymentForm!: FormGroup;

  tuitionFeeTotal: number = 0;
  tuitionFeeDue: number = 0;

  showFeeConcessionModal = false;
  editableFeeStructure: any[] = [];
  editIndex: number | null = null;
  studentFeeStructure: any[] = [];

  years: string[] = [];
  selectedYear: string = '';
  selectedStudent: any = null;
  studentId: string = '';
  paymentHistory: any[] = [];
  feeStructure: any[] = [];
  showConfirmModal: boolean = false;
  allPaymentsDone: boolean = false;
  receiptItem: any = null;
  selectedPayment: any = null;

  @ViewChild('receiptRef', { static: false }) receiptRef!: ElementRef;

  paidMap: { [description: string]: number } = {};
  totalFeeMap: { [description: string]: number } = {};

  constructor(private fb: FormBuilder, private db: Database) {}

  ngOnInit(): void {
    this.searchForm = this.fb.group({
      admissionNumber: [''],
      year: ['']
    });

    this.paymentForm = this.fb.group({
      mode: ['', Validators.required],
      description: ['', Validators.required],
      amountPaid: ['', [Validators.required, Validators.min(1)]],
      totalFee: ['', Validators.required]
    });

    this.loadYearsFromFeeStructure();
  }


  

  loadYearsFromFeeStructure(): void {
    const dbRef = ref(this.db);
    get(child(dbRef, 'feeStructure')).then(snapshot => {
      if (snapshot.exists()) {
        this.years = Object.keys(snapshot.val());
      }
    });
  }

  onSearch(): void {
    const admissionNumber = this.searchForm.value.admissionNumber;
    this.selectedYear = this.searchForm.value.year;

    const dbRef = ref(this.db);
    get(child(dbRef, 'students')).then(snapshot => {
      if (snapshot.exists()) {
        const students = snapshot.val();
        const matchedEntry = Object.entries(students).find(([key, student]: any) => student.admissionNumber === admissionNumber);
        if (matchedEntry) {
          const [id, student] = matchedEntry;
          this.selectedStudent = student;
          this.studentId = id;
          this.fetchFeeStructure(); // This will also trigger fetching payment history & updating summary
        } else {
          this.selectedStudent = null;
          alert('No student found!');
        }
      }
    });
  }

  // Main source-of-truth: get "active" fee heads for dropdowns/summary
  getActiveFeeStructure(): any[] {
    return (this.studentFeeStructure && this.studentFeeStructure.length)
      ? this.studentFeeStructure
      : this.feeStructure;
  }

  fetchFeeStructure(): void {
    if (!this.selectedYear || !this.selectedStudent?.currentClass || !this.selectedStudent?.currentSection) return;

    const classKey = this.selectedStudent.currentClass;
    const section = this.selectedStudent.currentSection;
    const studentId = this.studentId;
    const year = this.selectedYear;

    const dbRef = ref(this.db);

    // Fetch class structure
    get(child(dbRef, `feeStructure/${year}/${classKey}`)).then(snapshot => {
      let classStructure: any[] = [];
      if (snapshot.exists()) {
        const feeData = snapshot.val();
        classStructure = Object.entries(feeData).map(([id, data]: any) => ({ id, ...data }));
      }

      // Fetch student concession (if any)
      get(child(dbRef, `studentFeeConcessions/${year}/${classKey}${section}/${studentId}`)).then(snap => {
        if (snap.exists()) {
          const studentFeeData = snap.val();
          this.studentFeeStructure = Object.entries(studentFeeData).map(([id, data]: any) => ({ id, ...data }));
        } else {
          this.studentFeeStructure = [];
        }
        this.feeStructure = classStructure || [];
        // always rebuild totalFeeMap for ALL heads (for roles/calculations)
        const active = this.getActiveFeeStructure();
        this.totalFeeMap = {};
        for (let fee of active) this.totalFeeMap[fee.category] = +fee.amount || 0;
        this.updateAllPaymentsDoneStatus();
        // Now fetch payment history and update tuition summary when both are loaded/fresh
        this.fetchPaymentHistory();
      });
    });
  }

  fetchPaymentHistory(): void {
    if (!this.selectedStudent?.currentClass || !this.selectedStudent?.currentSection) return;
    const dbRef = ref(this.db, `payments/${this.selectedYear}/${this.selectedStudent.currentClass}${this.selectedStudent.currentSection}/${this.studentId}`);
    get(dbRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.paymentHistory = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          paymentType: value.paymentType || 'Fee',
          ...value
        }));
        this.calculatePaidPerDescription();
        this.updateAllPaymentsDoneStatus();
      } else {
        this.paymentHistory = [];
        this.paidMap = {};
      }
      // update tuition summary (now that both structure and paidMap are available)
      this.updateTuitionSummary();
    });
  }

  calculatePaidPerDescription(): void {
    this.paidMap = {};
    for (let payment of this.paymentHistory) {
      const desc = payment.description;
      const amount = +payment.amountPaid || 0;
      if (!this.paidMap[desc]) this.paidMap[desc] = 0;
      this.paidMap[desc] += amount;
    }
  }

  onDescriptionChange(event: Event): void {
    const selectedCategory = (event.target as HTMLSelectElement).value;
    const matchedFee = this.getActiveFeeStructure().find(fee => fee.category === selectedCategory);

    this.paymentForm.patchValue({
      totalFee: matchedFee?.amount || '',
      amountPaid: ''
    });
  }

  onPayNow(): void {
    if (this.paymentForm.invalid) {
      alert('Please fill all payment fields.');
      return;
    }
    this.showConfirmModal = true;
  }

  confirmDummyPayment(): void {
    this.showConfirmModal = false;

    const { mode, description, amountPaid, totalFee } = this.paymentForm.value;
    const alreadyPaid = this.paidMap[description] || 0;
    const newPaidAmount = +amountPaid || 0;
    const newTotalPaid = alreadyPaid + newPaidAmount;
    const balanceFee = +totalFee - newTotalPaid;

    const date = formatDate(new Date(), 'dd/MM/yyyy', 'en-IN');

    const payment = {
      date,
      paymentType: description,
      description,
      amountPaid: newPaidAmount,
      paymentMode: mode,
      totalFee,
      balanceFee
    };

    const paymentRef = ref(this.db, `payments/${this.selectedYear}/${this.selectedStudent.currentClass}${this.selectedStudent.currentSection}/${this.studentId}`);
    const newPaymentRef = push(paymentRef);

    set(newPaymentRef, payment).then(() => {
      this.fetchPaymentHistory();
      alert('Payment recorded successfully!');
      this.paymentForm.reset();
    });
  }

  getBalance(): number {
    const desc = this.paymentForm.value.description;
    const total = +this.paymentForm.value.totalFee || 0;
    const current = +this.paymentForm.value.amountPaid || 0;
    const alreadyPaid = this.paidMap[desc] || 0;
    return total - alreadyPaid - current;
  }

  updateAllPaymentsDoneStatus(): void {
    const active = this.getActiveFeeStructure();
    this.allPaymentsDone = active.every(fee => {
      const paid = this.paidMap[fee.category] || 0;
      const total = +fee.amount || 0;
      return paid >= total;
    });
  }

  viewReceipt(item: any): void {
    this.receiptItem = item;
  }

  generateReceipt(payment: any): void {
    this.selectedPayment = payment;
    setTimeout(() => {
      const element = this.receiptRef.nativeElement;
      const prevDisplay = element.style.display;
      const prevPosition = element.style.position;
      element.style.display = 'block';
      element.style.position = 'static';
      const options = {
        margin: 10,
        filename: `Receipt_${payment.description}_${payment.date}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(options).from(element).save().then(() => {
        element.style.display = prevDisplay;
        element.style.position = prevPosition;
      });
    }, 200);
  }


  
  // Fee Concession Modal Logic
  openFeeConcessionModal() {
    const active = this.getActiveFeeStructure();
    this.editableFeeStructure = active.map(f => ({ ...f }));
    this.editIndex = null;
    this.showFeeConcessionModal = true;
  }
  closeFeeConcessionModal() {
    this.showFeeConcessionModal = false;
    this.editIndex = null;
  }
  editFeeRow(i: number) { this.editIndex = i; }
  cancelFeeEdit() { this.editIndex = null; }
  saveFeeEdit(i: number) { this.editIndex = null; }
  deleteFeeRow(i: number) { this.editableFeeStructure.splice(i, 1); }

  saveFeeStructureChanges() {
    if (
      !(
        this.selectedYear &&
        this.selectedStudent?.currentClass &&
        this.selectedStudent?.currentSection &&
        this.studentId
      )
    ) return;
    const year = this.selectedYear;
    const classKey = this.selectedStudent.currentClass;
    const section = this.selectedStudent.currentSection;
    const studentId = this.studentId;
    const concessionPath = `studentFeeConcessions/${year}/${classKey}${section}/${studentId}`;
    const toSave: any = {};
    for (let item of this.editableFeeStructure) {
      toSave[item.category] = { amount: item.amount, category: item.category };
    }
    const dbRef = ref(this.db, concessionPath);
    set(dbRef, toSave).then(() => {
      this.closeFeeConcessionModal();
      this.fetchFeeStructure();
      alert("Fee concession applied for ONLY this student.");
    });
  }

  updateTuitionSummary() {
    const active = this.getActiveFeeStructure();
    const tuitionObj = active.find(fee => fee.category && fee.category.toLowerCase().includes('tuition'));
    const category = tuitionObj ? tuitionObj.category : (active[0]?.category || '');
    this.tuitionFeeTotal = tuitionObj ? +tuitionObj.amount : 0;
    const paid = (this.paidMap && this.paidMap[category]) ? this.paidMap[category] : 0;
    this.tuitionFeeDue = Math.max(this.tuitionFeeTotal - paid, 0);
  }

  // (Optional) Reset Concession for the current student
  resetFeeConcession() {
    if (
      !(this.selectedYear && this.selectedStudent?.currentClass && this.selectedStudent?.currentSection && this.studentId)
    ) return;
    const year = this.selectedYear;
    const classKey = this.selectedStudent.currentClass;
    const section = this.selectedStudent.currentSection;
    const studentId = this.studentId;
    const concessionPath = `studentFeeConcessions/${year}/${classKey}${section}/${studentId}`;
    const dbRef = ref(this.db, concessionPath);
    set(dbRef, null).then(() => {
      alert('Fee concession has been reset. Now using latest class fee structure.');
      this.fetchFeeStructure();
    });
  }
}
