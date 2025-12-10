import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeachersattendenceComponent } from './teachersattendence.component';

describe('TeachersattendenceComponent', () => {
  let component: TeachersattendenceComponent;
  let fixture: ComponentFixture<TeachersattendenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeachersattendenceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeachersattendenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
