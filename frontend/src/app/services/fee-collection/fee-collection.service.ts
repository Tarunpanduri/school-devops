// frontend/src/app/services/fees/fee-collection.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeePayment {
  id?: number;
  studentId: number;
  academicYear: string;
  feeType: string;
  amount: number;
  paymentMode?: string;
  collectedBy?: string;
  reference?: string;
  receiptNo?: string;
  paidOn?: string;
  createdAt?: string;
}

export interface StudentSummary {
  studentId: number;
  academicYear: string;
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FeeCollectionService {
  private baseUrl = `${environment.apiBaseUrl}/fee-collections`;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    // If your auth middleware expects "Bearer <token>" do:
    return new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' });
    // If it expects raw token: return new HttpHeaders({ Authorization: token });
  }

  // Payment history for a student (make sure backend implements GET /)
  getPayments(studentId: number, academicYear: string): Observable<{ payments: FeePayment[] }> {
    const params = new HttpParams()
      .set('studentId', String(studentId))
      .set('academicYear', academicYear);
    return this.http.get<{ payments: FeePayment[] }>(this.baseUrl, { headers: this.authHeaders(), params });
  }

  // Summary (existing backend route)
  getSummary(studentId: number, academicYear: string): Observable<{ summary: StudentSummary | null }> {
    const params = new HttpParams()
      .set('studentId', String(studentId))
      .set('academicYear', academicYear);
    return this.http.get<{ summary: StudentSummary | null }>(`${this.baseUrl}/summary`, { headers: this.authHeaders(), params });
  }

  // Collect payment (existing backend route)
  collectPayment(payload: {
    studentId: number;
    academicYear: string;
    feeType: string;
    amount: number;
    paymentMode?: string;
    collectedBy?: string;
    reference?: string;
  }): Observable<{ payment: FeePayment }> {
    return this.http.post<{ payment: FeePayment }>(`${this.baseUrl}/collect`, payload, { headers: this.authHeaders() });
  }
}
