import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  it('cria a tela com o editor', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('pe-editor')).not.toBeNull();
  });
});
