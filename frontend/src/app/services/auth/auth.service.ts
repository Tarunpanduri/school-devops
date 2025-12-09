import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FirebaseError } from '@angular/fire/app';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppUser {
  id: number;
  firebase_uid: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiBaseUrl = environment.apiBaseUrl;

  private currentUser: AppUser | null = null;

  // 🔹 Observable auth state for components like sidebar, guards, etc.
  private authStateSubject = new BehaviorSubject<AppUser | null>(null);

  constructor(
    private afAuth: AngularFireAuth,
    private http: HttpClient
  ) {
    // Try restore user from localStorage on service init
    const stored = localStorage.getItem('appUser');
    if (stored) {
      try {
        const user: AppUser = JSON.parse(stored);
        this.currentUser = user;
        this.authStateSubject.next(user);
      } catch {
        localStorage.removeItem('appUser');
      }
    }

    // Optional: also react to Firebase auth changes if needed later
    // this.afAuth.authState.subscribe(async firebaseUser => {
    //   if (!firebaseUser) {
    //     this.currentUser = null;
    //     this.authStateSubject.next(null);
    //   }
    // });
  }

  /**
   * Main login:
   * 1) Firebase email/password auth
   * 2) Get idToken
   * 3) Send to backend /auth/login
   * 4) Store returned user and emit auth state
   */
  async login(email: string, password: string): Promise<AppUser> {
    try {
      const cred = await this.afAuth.signInWithEmailAndPassword(email, password);

      if (!cred.user) {
        throw new Error('No Firebase user returned');
      }

      const idToken = await cred.user.getIdToken();

      const response = await this.http
        .post<{ user: AppUser }>(`${this.apiBaseUrl}/auth/login`, { idToken })
        .toPromise();

      if (!response?.user) {
        throw new Error('Backend did not return user');
      }

      this.currentUser = response.user;
      localStorage.setItem('appUser', JSON.stringify(response.user));

      // 🔹 Notify subscribers that auth state changed
      this.authStateSubject.next(response.user);

      return response.user;
    } catch (error: any) {
      if (error instanceof FirebaseError) {
        throw error;
      }

      console.error('Login error (non-Firebase):', error);
      throw new Error('BACKEND_LOGIN_FAILED');
    }
  }

  async logout(): Promise<void> {
    await this.afAuth.signOut();
    this.currentUser = null;
    localStorage.removeItem('appUser');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('rememberedPassword');

    // 🔹 Notify subscribers that user is logged out
    this.authStateSubject.next(null);
  }

  getCurrentUser(): AppUser | null {
    if (this.currentUser) return this.currentUser;

    const stored = localStorage.getItem('appUser');
    if (stored) {
      try {
        const user: AppUser = JSON.parse(stored);
        this.currentUser = user;
        return user;
      } catch {
        localStorage.removeItem('appUser');
      }
    }
    return null;
  }

  // ✅ Used by sidebar: auth.getAuthState().subscribe(...)
  getAuthState(): Observable<AppUser | null> {
    return this.authStateSubject.asObservable();
  }

  // ✅ Used by sidebar: auth.getCurrentUserRole()
  getCurrentUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role ?? null;
  }

  // ✅ Used by sidebar: auth.hasRole('admin')
  hasRole(role: string): boolean {
    const currentRole = this.getCurrentUserRole();
    return currentRole === role;
  }
}
