import { Component, OnDestroy, OnInit } from '@angular/core';
import { Database, ref, onValue, set, remove, update, push, off } from '@angular/fire/database';

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

  homeworkList: any[] = [];
  editingIndex: number | null = null;
  editedHomework: any = {};
  private currentListenerRef: any = null;

  constructor(private db: Database) {}

  ngOnInit(): void {
    this.loadClassesAndSections();
  }

  loadClassesAndSections() {
    const classRef = ref(this.db, 'sfs/classes');
    onValue(classRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.classList = [];
        for (const key in data) {
          this.classList.push(key);
        }

        // Set default class and section
        this.selectedClass = this.classList[0];
        this.updateSections(this.selectedClass);
      }
    });
  }

  onClassChange() {
    if (this.selectedClass) {
      this.updateSections(this.selectedClass);
    }
  }

  updateSections(classKey: string) {
    const sectionRef = ref(this.db, `sfs/classes/${classKey}/sections`);
    onValue(sectionRef, (snapshot) => {
      const sections = snapshot.val();
      if (sections) {
        this.sectionList = Object.keys(sections);
        this.selectedSection = this.sectionList[0];
      } else {
        this.sectionList = [];
        this.selectedSection = '';
      }
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear().toString().slice(-2);
    return `${dd}-${mm}-${yyyy}`;
  }

  searchHomework() {
    if (!this.selectedDate || !this.selectedClass || !this.selectedSection) {
      alert('Please select date, class, and section');
      return;
    }

    this.selectedGrade = `${this.selectedClass}-${this.selectedSection}`;
    const formattedDate = this.formatDate(this.selectedDate);
    const path = `homework/${this.selectedGrade}/${formattedDate}`;

    if (this.currentListenerRef) {
      off(this.currentListenerRef);
    }

    const dbRef = ref(this.db, path);
    this.currentListenerRef = dbRef;

    onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      this.homeworkList = data
        ? Object.entries(data).map(([id, value]) => ({
            id,
            ...(typeof value === 'object' && value !== null ? value : {})
          }))
        : [];
    });
  }

  openAddHomeworkModal() {
    const newHomework = {
      subject: '',
      task: '',
      assignedDate: '',
      dueDate: ''
    };
    this.homeworkList.push(newHomework);
    this.editingIndex = this.homeworkList.length - 1;
    this.editedHomework = { ...newHomework };
  }

  editHomework(hw: any, index: number) {
    this.editingIndex = index;
    this.editedHomework = { ...hw };
  }

  saveHomework(index: number) {
    const formattedDate = this.formatDate(this.selectedDate);
    const gradePath = `${this.selectedClass}-${this.selectedSection}`;
    const basePath = `homework/${gradePath}/${formattedDate}`;
    const hw = this.editedHomework;

    if (hw.id) {
      const updateRef = ref(this.db, `${basePath}/${hw.id}`);
      update(updateRef, {
        subject: hw.subject,
        task: hw.task,
        assignedDate: hw.assignedDate,
        dueDate: hw.dueDate
      });
    } else {
      const newRef = push(ref(this.db, basePath));
      set(newRef, {
        subject: hw.subject,
        task: hw.task,
        assignedDate: hw.assignedDate,
        dueDate: hw.dueDate
      });
    }

    this.editingIndex = null;
    this.editedHomework = {};
  }

  cancelEdit() {
    if (this.editingIndex !== null) {
      const currentRow = this.homeworkList[this.editingIndex];
      // If new row with empty values, remove it
      if (!currentRow.id &&
          !this.editedHomework.subject.trim() &&
          !this.editedHomework.task.trim() &&
          !this.editedHomework.assignedDate.trim() &&
          !this.editedHomework.dueDate.trim()) {
        this.homeworkList.splice(this.editingIndex, 1);
      }
    }
    this.editingIndex = null;
    this.editedHomework = {};
  }

  deleteHomework(hw: any) {
    const formattedDate = this.formatDate(this.selectedDate);
    const gradePath = `${this.selectedClass}-${this.selectedSection}`;
    const path = `homework/${gradePath}/${formattedDate}/${hw.id}`;
    const hwRef = ref(this.db, path);
    remove(hwRef).then(() => {
      this.homeworkList = this.homeworkList.filter(item => item.id !== hw.id);
    });
  }

  notifyParents() {
    console.log('Notifying parents...');
  }

  ngOnDestroy(): void {
    if (this.currentListenerRef) {
      off(this.currentListenerRef);
    }
  }
}
