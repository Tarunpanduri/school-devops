import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { FirebaseError } from '@angular/fire/app';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  rememberMe = false;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      this.email = savedEmail;
      this.password = savedPassword;
      this.rememberMe = true;
    }
  }

  async login() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const user = await this.auth.login(this.email, this.password);

      if (this.rememberMe) {
        localStorage.setItem('rememberedEmail', this.email);
        localStorage.setItem('rememberedPassword', this.password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // Role-based routing
      await this.routeBasedOnRole(user);
    } catch (error: unknown) {
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private async routeBasedOnRole(user: any) {
    // Get user role from auth service or user object
    const role = user?.role || await this.auth.getCurrentUserRole();
    
    switch (role?.toLowerCase()) {
      case 'supadmin':
        await this.router.navigate(['/dashboard']);
        break;
      case 'admin':
        await this.router.navigate(['/students-info']);
        break;
      case 'teacher':
        await this.router.navigate(['/students-info']);
        break;
      case 'student':
        await this.router.navigate(['/students-info']);
        break;
      case 'parent':
        await this.router.navigate(['/students-info']);
        break;
      default:
        // Default route for any role
        await this.router.navigate(['/students-info']);
    }
  }

  private handleAuthError(error: unknown) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email format.';
          break;
        case 'auth/user-disabled':
          this.errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          this.errorMessage = 'Invalid email or password.';
          break;
        default:
          this.errorMessage = 'Authentication failed. Please try again.';
          console.error('Auth error:', error);
      }
      return;
    }

    if (error instanceof Error && error.message === 'BACKEND_LOGIN_FAILED') {
      this.errorMessage = 'Login succeeded, but backend sync failed. Please try again.';
      return;
    }

    this.errorMessage = 'An unexpected error occurred.';
    console.error('Unexpected error:', error);
  }
}