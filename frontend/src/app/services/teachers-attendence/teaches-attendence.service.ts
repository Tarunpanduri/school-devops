// frontend/src/app/services/teachers-attendence/teaches-attendence.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TeacherAttendanceData {
  [teacherId: number]: {
    [day: number]: boolean | null;
  };
}

export interface SubmissionCounts {
  [day: number]: number;
}

@Injectable({ providedIn: 'root' })
export class TeacherAttendanceService {
  private baseUrl = `${environment.apiBaseUrl}/teachers-attendance`;

  constructor(private http: HttpClient) {}

  getAttendance(
    department: string,
    month: string
  ): Observable<{
    attendanceData: TeacherAttendanceData;
    submissionCounts: SubmissionCounts;
  }> {
    return this.http.get<{
      attendanceData: TeacherAttendanceData;
      submissionCounts: SubmissionCounts;
    }>(this.baseUrl, {
      params: { department, month },
    });
  }

  submitAttendance(
    department: string,
    month: string,
    attendanceData: TeacherAttendanceData,
    day: number
  ): Observable<{
    attendanceData: TeacherAttendanceData;
    submissionCounts: SubmissionCounts;
    message: string;
  }> {
    return this.http.post<{
      attendanceData: TeacherAttendanceData;
      submissionCounts: SubmissionCounts;
      message: string;
    }>(this.baseUrl, {
      department,
      month,
      day,
      attendanceData,
    });
  }
}