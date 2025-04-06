import { Game } from "./game";
import { Obstacle } from "./obstacleManager";
import { Player } from "./player";

export class CollisionHandler {
    update(player: Player, obstacles: Obstacle[]) {
      throw new Error('Method not implemented.');
    }
    constructor(private game:Game) {}

}