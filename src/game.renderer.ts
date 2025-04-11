import p5 from "p5";
import { Game } from "./game";

export class GameRenderer extends Game {
    private constructor(p: p5) { super(p); }

    public static render(game:Game): void {
        // g.p.background(135, 206, 235); // Sky blue background
        // TODO: can we do some nice refactoring here so that we can extract some code from the game class?

    }
}