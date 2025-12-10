import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SchoolProfile {
  name: string;
  address: string;
  city: string;
  state: string;
  examHeader: string;
}

@Injectable({ providedIn: 'root' })
export class SchoolProfileService {
  // Adjust this if your backend path is different
  private baseUrl = `${environment.apiBaseUrl}/academics/school-profile`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<SchoolProfile> {
    return this.http.get<SchoolProfile>(this.baseUrl);
  }
}
