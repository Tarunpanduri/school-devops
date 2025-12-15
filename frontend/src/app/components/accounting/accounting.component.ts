import { Component,OnInit } from '@angular/core';
import { AccountsService, AccountTransaction } from '../../services/accounting/accounting.service';

@Component({
  selector: 'app-accounting',
  standalone: false,
  templateUrl: './accounting.component.html',
  styleUrl: './accounting.component.css',
})
export class AccountingComponent implements OnInit {
  summary: any = null;
  balanceList: { name: string; balance: number }[] = [];
  transactions: AccountTransaction[] = [];

  constructor(private acctSvc: AccountsService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.loadTransactions();
  }

  loadSummary(): void {
    this.acctSvc.getSummary().subscribe({
      next: res => {
        this.summary = res;
        this.balanceList = Object.keys(res.balances || {}).map(k => ({ name: k, balance: res.balances[k] }));
      },
      error: (err) => console.error(err)
    });
  }

  loadTransactions(): void {
    this.acctSvc.listTransactions({ limit: 50 }).subscribe({
      next: res => this.transactions = res.transactions || [],
      error: (err) => console.error(err)
    });
  }
}
