import { Touch } from './game';

export class InputHandler {
  private keysDown: Set<number> = new Set();
  private touchLeft: boolean = false;
  private touchRight: boolean = false;
  private touchDown: boolean = false;
  
  constructor() {
    // Initialize input handling
  }
  
  public setKeyDown(keyCode: number): void {
    this.keysDown.add(keyCode);
  }
  
  public setKeyUp(keyCode: number): void {
    this.keysDown.delete(keyCode);
  }
  
  public isKeyDown(keyCode: number): boolean {
    return this.keysDown.has(keyCode);
  }
  
  public clearKeys(): void {
    this.keysDown.clear();
  }
}