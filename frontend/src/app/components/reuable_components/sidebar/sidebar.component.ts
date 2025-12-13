import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AppUser } from '../../../services/auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeItem: string = '';
  currentUser: AppUser | null = null;
  userRole: string | null = null;
  
  // For superadmins, students section starts collapsed
  // For others, it starts expanded but can be toggled
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
    this.authSub = this.auth.getAuthState().subscribe(user => {
      this.currentUser = user || null;
      this.userRole = user?.role ?? null;
      
      // Initialize based on role
      this.initializeSectionStates();
    });
  }

  private initializeSectionStates(): void {
    // For non-superadmins, expand students section by default
    // For superadmins, keep all collapsed by default
    if (!this.isSupAdmin()) {
      this.isOpen.students = true;
    } else {
      this.isOpen.students = false;
    }
    this.isOpen.teachers = false;
    this.isOpen.finance = false;
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
    // Always allow toggling regardless of role
    this.isOpen[section] = !this.isOpen[section];
  }

  logout() {
    this.auth.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}