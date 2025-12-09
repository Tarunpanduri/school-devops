import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Fee {
  id?: number;
  academicYear?: string;
  class?: string;
  category: string;
  description?: string;
  frequency?: string;
  amount: number | string;
}

@Injectable({
  providedIn: 'root',
})
export class FeeStructureService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getAcademicYears(): Observable<{ years: string[] }> {
    return this.http.get<{ years: string[] }>(`${this.apiBaseUrl}/fees/years`);
  }

  getClasses(): Observable<{ classes: string[] }> {
    return this.http.get<{ classes: string[] }>(`${this.apiBaseUrl}/classes`);
  }

  getFees(academicYear: string, clazz: string): Observable<{ fees: Fee[] }> {
    return this.http.get<{ fees: Fee[] }>(`${this.apiBaseUrl}/fees`, {
      params: {
        academicYear,
        class: clazz,
      },
    });
  }

  createFee(academicYear: string, clazz: string, fee: Fee): Observable<{ fee: Fee }> {
    return this.http.post<{ fee: Fee }>(`${this.apiBaseUrl}/fees`, {
      academicYear,
      class: clazz,
      fee,
    });
  }

  updateFee(id: number, fee: Fee): Observable<{ fee: Fee }> {
    return this.http.put<{ fee: Fee }>(`${this.apiBaseUrl}/fees/${id}`, {
      fee,
    });
  }

  deleteFee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/fees/${id}`);
  }
}
