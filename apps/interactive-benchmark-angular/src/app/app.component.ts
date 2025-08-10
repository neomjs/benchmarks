import { Component } from '@angular/core';
import { DataService, RowData } from './data.service';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  rowData: RowData[] = [];

  colDefs: ColDef[] = [
    { field: 'id' },
    { field: 'label' }
  ];

  constructor(private dataService: DataService) {}

  create1k() {
    this.rowData = this.dataService.buildData(1000);
  }
  create10k() {
    this.rowData = this.dataService.buildData(10000);
  }
  update() {
    this.rowData = this.dataService.updateData();
  }
  select() { console.log('select'); }
  swap() { console.log('swap'); }
  remove() { console.log('remove'); }
  clear() {
    this.rowData = this.dataService.clearData();
  }
  startFeed() { console.log('startFeed'); }
  runHeavyCalculation() { console.log('runHeavyCalculation'); }
}