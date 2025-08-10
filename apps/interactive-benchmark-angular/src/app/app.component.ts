import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DataService, RowData } from './data.service';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: false
})
export class AppComponent implements AfterViewInit, OnDestroy {
  rowData: RowData[] = [];
  selectedRow: number | null = null;
  private gridApi!: GridApi;

  public gridOptions: GridOptions = {
    columnDefs: [
      { field: 'id', valueGetter: params => params.data.id, flex: 1 },
      { field: 'label', valueGetter: params => params.data.label, flex: 2 }
    ],
    rowSelection: 'single',
    getRowId: (params) => params.data.id,
    onGridReady: (params) => {
      this.gridApi = params.api;
    }
  };

  mainThreadCounter = 0;
  private counterInterval: any;
  private feedInterval: any;

  @ViewChild('heavyCalcOutput') heavyCalcOutput!: ElementRef;

  constructor(private dataService: DataService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.counterInterval = setInterval(() => {
      this.mainThreadCounter++;
      this.cdr.detectChanges(); // Manually trigger change detection
    }, 100);
  }

  ngOnDestroy() {
    clearInterval(this.counterInterval);
    if (this.feedInterval) {
      clearInterval(this.feedInterval);
    }
  }

  create10k() { this.rowData = this.dataService.buildData(10000); }
  create100k() { this.rowData = this.dataService.buildData(100000); }
  create1M() { this.rowData = this.dataService.buildData(1000000); }
  update() {
    const updatedData = this.dataService.updateData();
    this.gridApi.setGridOption('rowData', updatedData);
  }
  select() {
    if (this.gridApi && this.rowData.length > 0) {
      const visibleNodes = this.gridApi.getRenderedNodes();
      if (visibleNodes.length > 0) {
        const randomNode = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];
        randomNode.setSelected(true);
        this.selectedRow = randomNode.data.id;
        this.gridApi.ensureNodeVisible(randomNode);
      }
    }
  }
  swap() {
    if (this.gridApi && this.rowData.length > 1) {
      const visibleNodes = this.gridApi.getRenderedNodes();
      if (visibleNodes.length > 1) {
        const node1 = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];
        let node2 = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];
        while (node1.id === node2.id) {
          node2 = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];
        }

        const index1 = this.rowData.findIndex(d => d.id === node1.data.id);
        const index2 = this.rowData.findIndex(d => d.id === node2.data.id);

        const newData = [...this.rowData];
        [newData[index1], newData[index2]] = [newData[index2], newData[index1]];
        this.rowData = newData;
        this.gridApi.setGridOption('rowData', this.rowData);
      }
    }
  }
  remove() {
    if (this.rowData.length > 0) {
      const indexToRemove = Math.floor(Math.random() * this.rowData.length);
      const newData = [...this.rowData];
      newData.splice(indexToRemove, 1);
      this.rowData = newData;
      this.gridApi.setGridOption('rowData', this.rowData);
    }
  }
  clear() {
    this.rowData = this.dataService.clearData();
    this.selectedRow = null;
  }

  runHeavyCalculation() {
    // This will now be handled by the worker, but we can keep a main-thread version for comparison
    console.log('Heavy calculation started in Main Thread...');
    let result = 0;
    const iterations = 50000000;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
    }
    console.log('Heavy calculation finished in Main Thread. Result:', result);
    this.heavyCalcOutput.nativeElement.textContent = 'Finished!';
  }

  runHeavyTask() {
    console.log('Heavy calculation started in Task Worker...');
    const worker = new Worker(new URL('./heavy-computation.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      console.log('Heavy calculation finished in Task Worker. Result:', data);
      this.heavyCalcOutput.nativeElement.textContent = 'Finished!';
      worker.terminate();
    };
    worker.postMessage('start');
  }

  toggleFeed() {
    if (this.feedInterval) {
      clearInterval(this.feedInterval);
      this.feedInterval = null;
      console.log('Real-time feed stopped.');
    } else {
      console.log('Real-time feed started.');
      this.feedInterval = setInterval(() => {
        const updatedData = this.dataService.updateData();
        this.gridApi.setGridOption('rowData', updatedData);
      }, 5);
    }
  }
}