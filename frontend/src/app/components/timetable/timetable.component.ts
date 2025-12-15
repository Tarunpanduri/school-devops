import { Component } from '@angular/core';
import { TimetableService, TimetableEntry } from '../../services/timetable/timetable.service';

@Component({
  selector: 'app-timetable',
  standalone: false,
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.css',
})
export class TimetableComponent {
  selectedClass = '';
  selectedSection = '';

  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  periods: number[] = [];

  timetable: TimetableEntry[] = [];
  timetableGrid: { [day: string]: { [period: number]: TimetableEntry } } = {};

  constructor(private timetableService: TimetableService) {}

  loadTimetable() {
    if (!this.selectedClass || !this.selectedSection) return;

    this.timetableService
      .getTimetable(this.selectedClass, this.selectedSection)
      .subscribe(entries => {
        this.timetable = entries;
        this.buildGrid();
      });
  }

  buildGrid() {
    this.timetableGrid = {};
    this.periods = [];

    this.timetable.forEach(entry => {
      if (!this.timetableGrid[entry.day]) {
        this.timetableGrid[entry.day] = {};
      }

      this.timetableGrid[entry.day][entry.period] = entry;

      if (!this.periods.includes(entry.period)) {
        this.periods.push(entry.period);
      }
    });

    this.periods.sort((a, b) => a - b);
  }
}