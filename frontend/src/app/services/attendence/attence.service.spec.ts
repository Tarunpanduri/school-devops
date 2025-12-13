import { TestBed } from '@angular/core/testing';

import { AttendanceService } from './attence.service';

describe('AttenceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
