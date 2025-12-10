import { TestBed } from '@angular/core/testing';

import { SchoolProfileService } from './school-profile.service';

describe('SchoolProfileService', () => {
  let service: SchoolProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SchoolProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
