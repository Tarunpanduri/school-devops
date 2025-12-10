import { TestBed } from '@angular/core/testing';

import { TeachesAttendenceService } from './teaches-attendence.service';

describe('TeachesAttendenceService', () => {
  let service: TeachesAttendenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeachesAttendenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
