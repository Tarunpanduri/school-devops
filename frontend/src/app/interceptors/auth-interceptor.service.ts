// src/app/interceptors/auth-interceptor.service.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private afAuth: AngularFireAuth) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only attach token for API calls to our backend, not everything
    if (!req.url.startsWith(this.apiBaseUrl)) {
      return next.handle(req);
    }

    return from(this.afAuth.currentUser).pipe(
      switchMap(user => {
        if (!user) {
          // Not logged in – just pass through
          return next.handle(req);
        }

        return from(user.getIdToken()).pipe(
          switchMap(token => {
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            return next.handle(authReq);
          })
        );
      })
    );
  }
}
