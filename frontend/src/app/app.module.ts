import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponent } from './components/reuable_components/sidebar/sidebar.component';
import { LoginComponent } from './components/login/login.component';
import { HeaderComponent } from './components/reuable_components/header/header.component';

import { AttendenceComponent } from './components/students/attendence/attendence.component';
import { MainLayoutComponent } from './components/reuable_components/layout/main-layout/main-layout.component';
import { TeachersattendenceComponent } from './components/teachers/teachersattendence/teachersattendence.component';
import { StudentsInfoComponent } from './components/students/students-info/students-info.component';
import { AcademicsComponent } from './components/students/academics/academics.component';
import { FeeStructureComponent } from './components/students/fee-structure/fee-structure.component';
import { HomeworkComponent } from './components/students/homework/homework.component';
import { SalariesComponent } from './components/teachers/salaries/salaries.component';
import { PaymentsComponent } from './components/payments/payments.component';
import { TeachersInfoComponent } from './components/teachers/t-info/teachers-info.component';

// Firebase compat imports (match AngularFireAuth + compat DB usage)
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

import { environment } from '../environments/environment';
import { AuthInterceptor } from './interceptors/auth-interceptor.service';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@NgModule({
  declarations: [
    TeachersInfoComponent,
    AppComponent,
    SidebarComponent,
    LoginComponent,
    HeaderComponent,
    AttendenceComponent,
    MainLayoutComponent,
    TeachersattendenceComponent,
    StudentsInfoComponent,
    AcademicsComponent,
    FeeStructureComponent,
    HomeworkComponent,
    SalariesComponent,
    PaymentsComponent,
    DashboardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // Angular Material
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatTooltipModule,

    // ✅ Firebase compat setup
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireDatabaseModule,
    AngularFireStorageModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
