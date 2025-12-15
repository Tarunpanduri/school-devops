// frontend/src/app/services/accounts/accounts.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccountTransaction {
  id?: number;
  kind: 'income'|'expense'|'adjustment';
  source: string;
  reference_id?: string|null;
  amount: number;
  currency?: string;
  payment_mode?: string;
  account_name?: string;
  details?: any;
  created_by?: number|null;
  created_at?: string;
}

export interface AccountsSummary {
  summary: { income: number; expense: number; adjustment: number; };
  balances: { [accountName: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private base = `${environment.apiBaseUrl}/api/accounts`;

  constructor(private http: HttpClient) {}

  listTransactions(params?: { limit?: number; offset?: number; kind?: string; account_name?: string; fromDate?: string; toDate?: string; }) {
    let p = new HttpParams();
    if (params) {
      Object.keys(params).forEach(k => {
        const v = (params as any)[k];
        if (v !== undefined && v !== null) p = p.set(k, String(v));
      });
    }
    return this.http.get<{ transactions: AccountTransaction[] }>(`${this.base}/transactions`, { params: p });
  }

  postTransaction(tx: AccountTransaction) {
    return this.http.post<{ transaction: AccountTransaction }>(`${this.base}/transactions`, tx);
  }

  getSummary(fromDate?: string, toDate?: string) {
    let p = new HttpParams();
    if (fromDate) p = p.set('fromDate', fromDate);
    if (toDate) p = p.set('toDate', toDate);
    return this.http.get<AccountsSummary>(`${this.base}/summary`, { params: p });
  }
}