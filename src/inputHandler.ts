export class InputHandler {
  private keysDown: Set<{keyCode?:number, key?:string}> = new Set();
  private touchLeft: boolean = false;
  private touchRight: boolean = false;
  private touchDown: boolean = false;
  
  constructor() {
    // Initialize input handling
  }
  
  public setKeyDown(keyCode: number, key:string): void {
    this.keysDown.add({keyCode, key});
  }
  
  public setKeyUp(keyCode: number, key:string): void {
    this.keysDown.delete({keyCode, key});
  }
  
  public isKeyDown(key?:string, keyCode?: number): boolean {
    return this.keysDown.has({keyCode, key});
  }
  
  public clearKeys(): void {
    this.keysDown.clear();
  }
}