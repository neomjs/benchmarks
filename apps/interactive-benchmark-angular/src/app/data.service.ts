// apps/interactive-benchmark-angular/src/app/data.service.ts
import { Injectable } from '@angular/core';

export interface RowData {
  id: number;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private data: RowData[] = [];
  private nextId = 1;

  buildData(count = 1000): RowData[] {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: this.nextId++,
        label: 'row ' + this.nextId,
      });
    }
    this.data = data;
    return this.data;
  }

  updateData(): RowData[] {
    const newData = [...this.data];
    for (let i = 0; i < newData.length; i += 10) {
        newData[i] = { ...newData[i], label: newData[i].label + ' updated' };
    }
    this.data = newData;
    return this.data;
  }

  clearData() {
    this.data = [];
    this.nextId = 1;
    return this.data;
  }

  heavyCalculation() {
    console.log('Heavy calculation started in Main Thread...');
    let result = 0;
    const iterations = 50000000;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
    }
    console.log('Heavy calculation finished in Main Thread. Result:', result);
  }
}