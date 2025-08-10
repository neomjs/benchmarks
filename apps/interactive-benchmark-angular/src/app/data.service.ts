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
  private adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
  private colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
  private nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];
  private nextId = 1;

  buildData(count = 1000): RowData[] {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push(this.buildRow());
    }
    this.data = data;
    return this.data;
  }

  updateData(): RowData[] {
    for (let i=0; i<this.data.length; i+=10) {
        this.data[i] = this.buildRow();
    }
    return this.data;
  }

  private buildRow(): RowData {
    return {
      id: this.nextId++,
      label: `${this.adjectives[this.random(this.adjectives.length)]} ${this.colours[this.random(this.colours.length)]} ${this.nouns[this.random(this.nouns.length)]}`
    };
  }

  private random(max: number): number {
    return Math.round(Math.random() * 1000) % max;
  }

  clearData() {
    this.data = [];
    return this.data;
  }
}
