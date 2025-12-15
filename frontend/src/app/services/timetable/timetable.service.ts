// frontend/src/app/services/timetable/timetable.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TimetableEntry {
  day: string;
  period: number;
  subject: string;
  teacher: string;
  room?: string;
}

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private baseUrl = `${environment.apiBaseUrl}/api/timetable`;

  constructor(private http: HttpClient) {}

  getTimetable(
    className: string,
    section: string
  ): Observable<TimetableEntry[]> {
    return this.http.get<TimetableEntry[]>(this.baseUrl, {
      params: { class: className, section },
    });
  }
}
