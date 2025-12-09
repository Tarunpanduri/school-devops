import { TestBed } from '@angular/core/testing';

import { AttenceService } from './attence.service';

describe('AttenceService', () => {
  let service: AttenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttenceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
