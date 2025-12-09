import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AppUser } from '../../services/auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeItem: string = '';

  // Full user object coming from PostgreSQL via AuthService
  currentUser: AppUser | null = null;
  userRole: string | null = null;

  isOpen = {
    students: false,
    teachers: false,
    finance: false,
  };

  private authSub?: Subscription;

  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state so sidebar reacts to login / logout
    this.authSub = this.auth.getAuthState().subscribe(user => {
      this.currentUser = user || null;
      this.userRole = user?.role ?? null;
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  isAdmin(): boolean {
    return this.auth.hasRole('admin');
  }

  isSupAdmin(): boolean {
    return this.auth.hasRole('supadmin');
  }

  setActive(item: string) {
    this.activeItem = item;
  }

  toggleSection(section: 'students' | 'teachers' | 'finance') {
    this.isOpen[section] = !this.isOpen[section];
  }

  logout() {
    this.auth.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}