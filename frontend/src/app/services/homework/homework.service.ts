import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface HomeworkItem {
  id?: number;
  class?: string;
  section?: string;
  subject: string;
  task: string;
  assignedDate: string;  // 'YYYY-MM-DD'
  dueDate?: string;      // 'YYYY-MM-DD'
}

@Injectable({
  providedIn: 'root',
})
export class HomeworkService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<{ classes: string[] }> {
    return this.http.get<{ classes: string[] }>(`${this.apiBaseUrl}/classes`);
  }

  getSections(clazz: string): Observable<{ sections: string[] }> {
    return this.http.get<{ sections: string[] }>(
      `${this.apiBaseUrl}/classes/${clazz}/sections`
    );
  }

  getHomework(
    clazz: string,
    section: string,
    date: string
  ): Observable<{ homework: HomeworkItem[] }> {
    return this.http.get<{ homework: HomeworkItem[] }>(
      `${this.apiBaseUrl}/homework`,
      {
        params: {
          class: clazz,
          section,
          date,
        },
      }
    );
  }

  createHomework(
    clazz: string,
    section: string,
    homework: HomeworkItem
  ): Observable<{ homework: HomeworkItem }> {
    return this.http.post<{ homework: HomeworkItem }>(
      `${this.apiBaseUrl}/homework`,
      {
        class: clazz,
        section,
        homework,
      }
    );
  }

  updateHomework(id: number, homework: HomeworkItem): Observable<{ homework: HomeworkItem }> {
    return this.http.put<{ homework: HomeworkItem }>(
      `${this.apiBaseUrl}/homework/${id}`,
      { homework }
    );
  }

  deleteHomework(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/homework/${id}`);
  }
}
