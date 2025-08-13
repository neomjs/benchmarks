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

  updateRandomData(): RowData[] {
    const updatedRecords: RowData[] = [];
    const len = this.data.length;
    const updateCount = 100;

    if (len === 0) {
      return [];
    }

    for (let i = 0; i < updateCount; i++) {
      const randomIndex = Math.floor(Math.random() * len);
      const record = this.data[randomIndex];
      const updatedRecord = { ...record, label: `updated ${record.id} at ${new Date().toLocaleTimeString()}` };

      this.data[randomIndex] = updatedRecord;
      updatedRecords.push(updatedRecord);
    }

    return updatedRecords;
  }

  clearData() {
    this.data = [];
    this.nextId = 1;
    return this.data;
  }
}
