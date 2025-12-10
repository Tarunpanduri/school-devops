import { Component, OnDestroy, OnInit } from '@angular/core';
import { HomeworkService, HomeworkItem } from '../../../services/homework/homework.service';

@Component({
  selector: 'app-homework',
  templateUrl: './homework.component.html',
  styleUrls: ['./homework.component.css'],
  standalone: false,
})
export class HomeworkComponent implements OnInit, OnDestroy {
  selectedDate: string = '';
  selectedClass: string = '';
  selectedSection: string = '';
  selectedGrade: string = '';

  classList: string[] = [];
  sectionList: string[] = [];

  homeworkList: HomeworkItem[] = [];
  editingIndex: number | null = null;
  editedHomework: HomeworkItem | any = {};

  // left here just to satisfy interface, but not used anymore
  private currentListenerRef: any = null;

  constructor(private homeworkService: HomeworkService) {}

  ngOnInit(): void {
    // Default selectedDate: today
    const today = new Date();
    this.selectedDate = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    this.loadClassesAndSections();
  }

  loadClassesAndSections() {
    // Load classes from backend (derived from students table)
    this.homeworkService.getClasses().subscribe({
      next: res => {
        this.classList = res.classes || [];
        if (this.classList.length > 0 && !this.selectedClass) {
          this.selectedClass = this.classList[0];
        }

        if (this.selectedClass) {
          this.updateSections(this.selectedClass);
        }
      },
      error: err => {
        console.error('Failed to load classes:', err);
      },
    });
  }

  onClassChange() {
    if (this.selectedClass) {
      this.updateSections(this.selectedClass);
    }
  }

  updateSections(classKey: string) {
    this.homeworkService.getSections(classKey).subscribe({
      next: res => {
        this.sectionList = res.sections || [];
        if (this.sectionList.length > 0) {
          this.selectedSection = this.sectionList[0];
        } else {
          this.selectedSection = '';
        }
      },
      error: err => {
        console.error('Failed to load sections:', err);
        this.sectionList = [];
        this.selectedSection = '';
      },
    });
  }

  // kept for compatibility, but now you can just use selectedDate directly
  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear().toString().slice(2);
    return `${dd}-${mm}-${yyyy}`;
  }

  searchHomework() {
    if (!this.selectedDate || !this.selectedClass || !this.selectedSection) {
      alert('Please select date, class, and section');
      return;
    }

    this.selectedGrade = `${this.selectedClass}-${this.selectedSection}`;

    this.homeworkService
      .getHomework(this.selectedClass, this.selectedSection, this.selectedDate)
      .subscribe({
        next: res => {
          this.homeworkList = res.homework || [];
          this.editingIndex = null;
          this.editedHomework = {};
        },
        error: err => {
          console.error('Failed to load homework:', err);
          this.homeworkList = [];
        },
      });
  }

  openAddHomeworkModal() {
    const newHomework: HomeworkItem & { isNew?: boolean } = {
      subject: '',
      task: '',
      assignedDate: this.selectedDate || '',
      dueDate: '',
      isNew: true,
    };
    this.homeworkList.push(newHomework);
    this.editingIndex = this.homeworkList.length - 1;
    this.editedHomework = { ...newHomework };
  }

  editHomework(hw: HomeworkItem, index: number) {
    this.editingIndex = index;
    this.editedHomework = { ...hw };
  }

  saveHomework(index: number) {
    if (!this.selectedClass || !this.selectedSection) {
      alert('Please select class and section');
      return;
    }

    if (!this.selectedDate) {
      alert('Please select a date');
      return;
    }

    const hw = this.editedHomework as HomeworkItem & { isNew?: boolean };

    // Ensure required fields
    if (!hw.subject || !hw.task) {
      alert('Please enter subject and homework task');
      return;
    }

    // If assignedDate is empty, default to selectedDate
    if (!hw.assignedDate) {
      hw.assignedDate = this.selectedDate;
    }

    const payload: HomeworkItem = {
      subject: hw.subject,
      task: hw.task,
      assignedDate: hw.assignedDate,
      dueDate: hw.dueDate || '',
    };

    if (hw.isNew) {
      // Create new homework
      this.homeworkService
        .createHomework(this.selectedClass, this.selectedSection, payload)
        .subscribe({
          next: () => {
            this.editingIndex = null;
            this.editedHomework = {};
            this.searchHomework(); // reload list
          },
          error: err => {
            console.error('Failed to create homework:', err);
          },
        });
    } else {
      if (!hw.id) {
        console.error('Missing homework id for update');
        return;
      }

      this.homeworkService.updateHomework(hw.id, payload).subscribe({
        next: () => {
          this.editingIndex = null;
          this.editedHomework = {};
          this.searchHomework(); // reload list
        },
        error: err => {
          console.error('Failed to update homework:', err);
        },
      });
    }
  }

  cancelEdit() {
    if (this.editingIndex !== null) {
      const currentRow: any = this.homeworkList[this.editingIndex];
      if (
        currentRow.isNew &&
        !this.editedHomework.subject?.toString().trim() &&
        !this.editedHomework.task?.toString().trim() &&
        !this.editedHomework.assignedDate?.toString().trim() &&
        !this.editedHomework.dueDate?.toString().trim()
      ) {
        this.homeworkList.splice(this.editingIndex, 1);
      }
    }
    this.editingIndex = null;
    this.editedHomework = {};
  }

  deleteHomework(hw: HomeworkItem) {
    if (!hw.id) {
      return;
    }

    if (!confirm(`Delete homework "${hw.subject}"?`)) {
      return;
    }

    this.homeworkService.deleteHomework(hw.id).subscribe({
      next: () => {
        this.homeworkList = this.homeworkList.filter(h => h.id !== hw.id);
      },
      error: err => {
        console.error('Failed to delete homework:', err);
      },
    });
  }

  notifyParents() {
    // Placeholder for later integration with SMS / notifications service
    console.log('Notifying parents...');
  }

  ngOnDestroy(): void {
    // No realtime listeners anymore, but kept for compatibility
    if (this.currentListenerRef) {
      // was: off(this.currentListenerRef);
    }
  }
}