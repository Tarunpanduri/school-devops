// src/app/services/fee-collection/fee-collection.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeePayment {
  id?: number;
  studentId: string;
  feeType: string;
  academicYear: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank' | string;
  receiptNo?: string;
  collectedBy?: string;
  paidOn?: string | Date;
  amount: number;
  reference?: string;
}

export interface StudentSummary {
  studentId: string;
  academicYear: string;
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  updatedAt?: string;
}

export interface PaymentResponse {
  payment: any;
}

export interface PaymentsResponse {
  payments: any[];
}

export interface SummaryResponse {
  summary: StudentSummary;
}

@Injectable({
  providedIn: 'root'
})
export class FeeCollectionService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getPayments(studentId: string, academicYear: string): Observable<PaymentsResponse> {
    const params = new HttpParams()
      .set('studentId', studentId)  // No .toString() needed
      .set('academicYear', academicYear);

    return this.http.get<PaymentsResponse>(
      `${this.apiBaseUrl}/fee-collections`,
      { params }
    );
  }

  getSummary(studentId: string, academicYear: string): Observable<SummaryResponse> {
    const params = new HttpParams()
      .set('studentId', studentId)  // No .toString() needed
      .set('academicYear', academicYear);

    return this.http.get<SummaryResponse>(
      `${this.apiBaseUrl}/fee-collections/summary`,
      { params }
    );
  }

  collectPayment(paymentData: Partial<FeePayment>): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(
      `${this.apiBaseUrl}/fee-collections/collect`,
      paymentData
    );
  }

  deletePayment(paymentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiBaseUrl}/fee-collections/${paymentId}`
    );
  }
}
