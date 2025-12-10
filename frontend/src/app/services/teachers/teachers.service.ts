// frontend/src/app/services/teachers/teachers.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Teacher {
  id?: number;
  teacherId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string | null;
  joiningDate?: string | null;
  department: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  designation?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  pan?: string | null;
  uan?: string | null;
  pfNumber?: string | null;
  basicSalary?: number | null;
  allowance?: number | null;
  deductions?: number | null;

}

@Injectable({
  providedIn: 'root',
})
export class TeachersService {
  private baseUrl = `${environment.apiBaseUrl}/teachers`;

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<{ departments: string[] }> {
    return this.http.get<{ departments: string[] }>(
      `${this.baseUrl}/departments`
    );
  }

  addDepartment(name: string): Observable<{ name: string }> {
    return this.http.post<{ name: string }>(`${this.baseUrl}/departments`, {
      name,
    });
  }

  getTeachers(): Observable<{ teachers: Teacher[] }> {
    return this.http.get<{ teachers: Teacher[] }>(this.baseUrl);
  }

  createTeacher(teacher: Teacher): Observable<{ teacher: Teacher }> {
    return this.http.post<{ teacher: Teacher }>(this.baseUrl, teacher);
  }

  updateTeacher(
    id: number | string,
    teacher: Teacher
  ): Observable<{ teacher: Teacher }> {
    return this.http.put<{ teacher: Teacher }>(
      `${this.baseUrl}/${id}`,
      teacher
    );
  }

  getTeachersByDepartment(
    department: string
  ): Observable<{ teachers: Teacher[] }> {
    const params = new HttpParams().set('department', department);
    return this.http.get<{ teachers: Teacher[] }>(this.baseUrl, { params });
  }

  deleteTeacher(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}