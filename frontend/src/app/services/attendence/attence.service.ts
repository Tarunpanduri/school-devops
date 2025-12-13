import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  CurrentClass: string | number;
  CurrentSection: string;
}

export interface AttendanceData {
  [admissionNumber: string]: {
    [day: number]: boolean | null;
  };
}

export interface SubmissionCounts {
  [day: number]: number;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<{ classes: string[] }> {
    return this.http.get<{ classes: string[] }>(`${this.apiBaseUrl}/classes`);
  }

  getSections(currentClass: string): Observable<{ sections: string[] }> {
    return this.http.get<{ sections: string[] }>(
      `${this.apiBaseUrl}/classes/${currentClass}/sections`
    );
  }

  getStudents(
    grade: string,
    selectedClass: string,
    selectedSection: string
  ): Observable<{ students: Student[] }> {
    if (grade === 'LKG' || grade === 'UKG') {
      return this.http.get<{ students: Student[] }>(
        `${this.apiBaseUrl}/students`,
        {
          params: { grade },
        }
      );
    }

    return this.http.get<{ students: Student[] }>(
      `${this.apiBaseUrl}/students`,
      {
        params: {
          currentClass: selectedClass,
          currentSection: selectedSection,
        },
      }
    );
  }

  getAttendance(
    grade: string,
    month: string
  ): Observable<{ attendanceData: AttendanceData; submissionCounts: SubmissionCounts }> {
    return this.http.get<{
      attendanceData: AttendanceData;
      submissionCounts: SubmissionCounts;
    }>(`${this.apiBaseUrl}/attendance`, {
      params: { grade, month },
    });
  }

  submitAttendance(
    grade: string,
    month: string,
    attendanceData: AttendanceData,
    todayDay: number
  ): Observable<{
    message: string;
    attendanceData: AttendanceData;
    submissionCounts: SubmissionCounts;
    submissionCountToday: number;
  }> {
    return this.http.post<{
      message: string;
      attendanceData: AttendanceData;
      submissionCounts: SubmissionCounts;
      submissionCountToday: number;
    }>(`${this.apiBaseUrl}/attendance/submit`, {
      grade,
      month,
      attendanceData,
      todayDay,
    });
  }
}
