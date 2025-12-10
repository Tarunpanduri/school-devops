import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AttendenceComponent } from './components/students/attendence/attendence.component';
import { MainLayoutComponent } from './components/reuable_components/layout/main-layout/main-layout.component'
import { TeachersInfoComponent } from './components/teachers/t-info/teachers-info.component';
import { TeachersattendenceComponent } from './components/teachers/teachersattendence/teachersattendence.component';
import { AcademicsComponent } from './components/students/academics/academics.component';
import { HomeworkComponent } from './components/students/homework/homework.component';
import { StudentsInfoComponent } from './components/students/students-info/students-info.component';  
import { FeeStructureComponent } from './components/students/fee-structure/fee-structure.component';
import { SalariesComponent } from './components/teachers/salaries/salaries.component';
// import { CalendarComponent } from './components/calendar/calendar.component';
// import { TimeTableComponent } from './components/time-table/time-table.component';
// import { MessagingComponent } from './components/messaging/messaging.component';
// import { TransportComponent } from './components/transport/transport.component';
import { PaymentsComponent } from './components/payments/payments.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: MainLayoutComponent,  
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'attendence', component: AttendenceComponent },
      { path: 'teachersattendence', component: TeachersattendenceComponent },
      { path: 'academics', component: AcademicsComponent },
      { path: 'homework', component: HomeworkComponent },
      { path: 'students-info', component: StudentsInfoComponent },
      { path: 'fee-structure', component: FeeStructureComponent },
      { path: 'salaries', component: SalariesComponent },
      // { path: 'calendar', component: CalendarComponent},
      // { path: 'time-table', component: TimeTableComponent},
      // { path: 'messaging', component: MessagingComponent},
      // { path: 'Transport', component: TransportComponent},
      { path: 'payments', component: PaymentsComponent},
      { path: 'teachers-info', component: TeachersInfoComponent },
    ]
  }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
