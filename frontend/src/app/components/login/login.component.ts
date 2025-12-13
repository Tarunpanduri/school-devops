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
  showPassword = false;
  currentYear = new Date().getFullYear();

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      this.email = savedEmail;
      this.password = atob(savedPassword); // Decode from base64
      this.rememberMe = true;
    }
    
    // Focus email input on page load
    setTimeout(() => {
      const emailInput = document.querySelector('input[type="email"]') as HTMLElement;
      if (emailInput) emailInput.focus();
    }, 100);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    // Clear previous errors
    this.errorMessage = null;
    
    // Validate inputs
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    
    if (!this.password.trim()) {
      this.errorMessage = 'Please enter your password.';
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;

    try {
      const user = await this.auth.login(this.email, this.password);

      // Save credentials if "Remember me" is checked
      if (this.rememberMe) {
        localStorage.setItem('rememberedEmail', this.email);
        // Store password encoded for security
        localStorage.setItem('rememberedPassword', btoa(this.password));
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Role-based routing
      await this.routeBasedOnRole(user);
    } catch (error: unknown) {
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private async routeBasedOnRole(user: any) {
    try {
      // Get user role from auth service or user object
      const role = user?.role || await this.auth.getCurrentUserRole();
      
      // Navigation logic
      switch (role?.toLowerCase()) {
        case 'supadmin':
          await this.router.navigate(['/dashboard']);
          break;
        case 'admin':
        case 'teacher':
        case 'student':
        case 'parent':
        default:
          await this.router.navigate(['/students-info']);
          break;
      }
    } catch (error) {
      console.error('Error during role-based routing:', error);
      // Fallback to default route
      await this.router.navigate(['/students-info']);
    }
  }

  private handleAuthError(error: unknown) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email format. Please check your email address.';
          break;
        case 'auth/user-disabled':
          this.errorMessage = 'This account has been disabled. Please contact your administrator.';
          break;
        case 'auth/user-not-found':
          this.errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          this.errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          this.errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          this.errorMessage = 'Network error. Please check your internet connection.';
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

    // Generic error handler
    this.errorMessage = 'An unexpected error occurred. Please try again.';
    console.error('Unexpected error:', error);
  }

  // Optional: Clear form
  clearForm() {
    this.email = '';
    this.password = '';
    this.errorMessage = null;
  }
}