import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Student {
  id?: number; 
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  currentClass: string;
  currentSection: string;
  phoneNumber?: string;
  email?: string;
  Place?: string;
  fee?: string;
  fatherName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StudentsService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getStudents(): Observable<{ students: Student[] }> {
    return this.http.get<{ students: Student[] }>(
      `${this.apiBaseUrl}/students`
    );
  }

  createStudent(student: Student): Observable<{ student: Student }> {
    return this.http.post<{ student: Student }>(
      `${this.apiBaseUrl}/students`,
      student
    );
  }

  updateStudent(student: Student): Observable<{ student: Student }> {
    if (!student.id) {
      throw new Error('Student id is required for update');
    }
    return this.http.put<{ student: Student }>(
      `${this.apiBaseUrl}/students/${student.id}`,
      student
    );
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/students/${id}`);
  }
}
