import { TestBed } from '@angular/core/testing';

import { FeeCollectionService } from './fee-collection.service';

describe('FeeCollectionService', () => {
  let service: FeeCollectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeeCollectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
