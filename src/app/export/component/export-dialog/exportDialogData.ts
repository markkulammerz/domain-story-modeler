export class ExportDialogData {
  public title: string;
  public options: ExportOption[];

  constructor(title: string, options: ExportOption[]) {
    this.title = title;
    this.options = options;
  }
}

export class ExportOption {
  public text: string;
  public fn: any;

  constructor(text: string, fn: any) {
    this.text = text;
    this.fn = fn;
  }
}
