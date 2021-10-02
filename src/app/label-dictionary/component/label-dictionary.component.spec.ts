import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelDictionaryComponent } from 'src/app/label-dictionary/component/label-dictionary.component';
import { MockService } from 'ng-mocks';
import { LabelDictionaryService } from '../service/label-dictionary.service';

describe('LabelDictionaryComponent', () => {
  let component: LabelDictionaryComponent;
  let fixture: ComponentFixture<LabelDictionaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelDictionaryComponent],
      providers: [
        {
          provide: LabelDictionaryService,
          useValue: MockService(LabelDictionaryService),
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelDictionaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
