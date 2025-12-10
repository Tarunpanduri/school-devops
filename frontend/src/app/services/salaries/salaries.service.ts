// frontend/src/app/services/salaries/salaries.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TeacherSalary {
  id: number;
  teacherId: string;
  fullName: string;
  department: string;
  designation: string | null;
  joiningDate: string | null;
  basicSalary: number;
  allowance: number;
  deductions: number;
  netSalary: number;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  pan?: string | null;
  uan?: string | null;
  pfNumber?: string | null;
}

export interface SalaryListResponse {
  month: string;
  department?: string | null;
  teachers: TeacherSalary[];
}

export interface SaveSalaryRequest {
  teacherId: number;       // teachers.id (numeric PK)
  month: string;           // 'YYYY-MM'
  basicSalary: number;
  allowance: number;
  deductions: number;
}

export interface SaveSalaryResponse {
  message: string;
  salary: {
    id: number;
    teacherId: number;
    month: string;
    basicSalary: number;
    allowance: number;
    deductions: number;
    netSalary: number;
  };
}

@Injectable({ providedIn: 'root' })
export class SalariesService {
  private baseUrl = `${environment.apiBaseUrl}/salaries`;

  constructor(private http: HttpClient) {}

  getSalaries(month: string, department?: string): Observable<SalaryListResponse> {
    let params = new HttpParams().set('month', month);
    if (department && department !== 'All') {
      params = params.set('department', department);
    }

    return this.http.get<SalaryListResponse>(this.baseUrl, { params });
  }

  saveSalary(body: SaveSalaryRequest): Observable<SaveSalaryResponse> {
    return this.http.post<SaveSalaryResponse>(this.baseUrl, body);
  }
}
