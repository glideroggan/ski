export class InputHandler {
  // Using separate sets for keyCode and key for correct comparison
  private keysCodeDown: Set<number> = new Set();
  private keysDown: Set<string> = new Set();
  private touchLeft: boolean = false;
  private touchRight: boolean = false;
  private touchDown: boolean = false;
  
  constructor() {
    // Initialize input handling
  }
  
  public setKeyDown(keyCode: number, key: string): void {
    if (keyCode) this.keysCodeDown.add(keyCode);
    if (key) this.keysDown.add(key);
  }
  
  public setKeyUp(keyCode: number, key: string): void {
    if (keyCode) this.keysCodeDown.delete(keyCode);
    if (key) this.keysDown.delete(key);
  }
  
  public isKeyDown(key?: string, keyCode?: number): boolean {
    if (keyCode !== undefined && this.keysCodeDown.has(keyCode)) {
      return true;
    }
    if (key !== undefined && this.keysDown.has(key)) {
      return true;
    }
    return false;
  }
  
  public clearKeys(): void {
    this.keysCodeDown.clear();
    this.keysDown.clear();
  }
}