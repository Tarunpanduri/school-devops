import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface SubjectMarks {
  name: string;
  maxMarks: number;
  marksScored?: number;
  grade?: string;
  remarks?: string;
}

export interface ClassSubjectDef {
  name: string;
  defaultMaxMarks: number;
}

export interface SchoolProfile {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  examHeader: string;
}

@Injectable({
  providedIn: 'root',
})
export class AcademicsService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<{ classes: string[] }> {
    return this.http.get<{ classes: string[] }>(
      `${this.apiBaseUrl}/classes`
    );
  }

  getSections(clazz: string): Observable<{ sections: string[] }> {
    return this.http.get<{ sections: string[] }>(
      `${this.apiBaseUrl}/classes/${clazz}/sections`
    );
  }

  getStudentsForClassSection(
    clazz: string,
    section: string
  ): Observable<{ students: string[] }> {
    return this.http.get<{ students: string[] }>(
      `${this.apiBaseUrl}/academics/students`,
      { params: { class: clazz, section } }
    );
  }

  getExams(): Observable<{ exams: string[] }> {
    return this.http.get<{ exams: string[] }>(
      `${this.apiBaseUrl}/academics/exams`
    );
  }

  createExam(name: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiBaseUrl}/academics/exams`,
      { name }
    );
  }

  getClassSubjects(
    clazz: string
  ): Observable<{ subjects: ClassSubjectDef[] }> {
    return this.http.get<{ subjects: ClassSubjectDef[] }>(
      `${this.apiBaseUrl}/academics/subjects`,
      { params: { class: clazz } }
    );
  }

  getExamResult(
    exam: string,
    clazz: string,
    section: string,
    studentName: string
  ): Observable<{ subjects: SubjectMarks[] }> {
    return this.http.get<{ subjects: SubjectMarks[] }>(
      `${this.apiBaseUrl}/academics/results`,
      {
        params: { exam, class: clazz, section, studentName },
      }
    );
  }

  saveExamResult(
    exam: string,
    clazz: string,
    section: string,
    studentName: string,
    subjects: SubjectMarks[]
  ): Observable<{ subjects: SubjectMarks[] }> {
    return this.http.post<{ subjects: SubjectMarks[] }>(
      `${this.apiBaseUrl}/academics/results`,
      {
        exam,
        class: clazz,
        section,
        studentName,
        subjects,
      }
    );
  }

  // new: school profile
  getSchoolProfile(): Observable<SchoolProfile> {
    return this.http.get<SchoolProfile>(
      `${this.apiBaseUrl}/academics/school-profile`
    );
  }
}
