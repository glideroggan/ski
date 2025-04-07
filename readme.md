# BUGS
- the snowman needs a shadow

# TODO
- fix the little face in the corner that can react to things happening in the game
  - need to generate the faces
    - idle
    - happy
    - sad
    - angry
    - surprised
    - scared
- ✔️fix depth checks, so that we can render characters in front of the obstacles
- choose between silly characters
  - image up to the left corner of the screen
    - should react to different things happening in the game
- obstacles
    - ✔️snowman
    - other skiers
    - other things 
      - poop
      - yellow snow
- rewards
Create a silly ski game
It is for kids and can be silly and fun
The game area should scroll itself and player controls the character to left and right
Can also increase their speed by pressing down

# To implement
## Weather Changes: Occasional snowstorms that reduce visibility
### Visual Effects
- Progressive Visibility Reduction: A semi-transparent white gradient overlay that gets more opaque toward the bottom of the screen
- Particle System: Varying densities of snowflakes based on storm intensity
- Screen Shake: Subtle camera shake during intense blizzard conditions
### Gameplay Mechanics
- Visibility Range: During storms, obstacles would only become visible when closer to the player
- Weather Progression:
  - Clear conditions → Light snow → Heavy snow → Blizzard
- Weather could change gradually or suddenly (surprise blizzards!)
Difficulty Scaling: Weather could change more frequently as the game progresses, increasing the challenge

## IDEAS
### Gameplay Mechanics
Ski Jump Ramps: Allow players to perform jumps and tricks for bonus points
Different Snow Types: Add ice patches (faster, less control) and deep powder (slower, more control)
Multiple Paths: Fork the ski run into easy/hard paths with different rewards
### Progression & Variety
Increasing Difficulty: Start with simple obstacles, gradually add more complex patterns
Day/Night Cycles: Skiing at night requires lanterns or glowing obstacles
Mountain Zones: Different themed areas (forest, village, mountain peak)
### Interactive Elements
#### Power-ups:
Hot chocolate: Speed boost
Helmet: Temporary protection from one collision
Magnet: Attracts nearby collectibles
#### Collectibles: Coins, stars, or silly items like lost mittens
### Fun Additions
Animal Friends: Birds that fly alongside or squirrels that cheer
Secret Easter Eggs: Hidden paths or surprise characters
Silly Physics: Exaggerated crash animations or bouncy snow piles
Avalanche Chase Scenes: Occasional "run from the avalanche" segments


## Later
- Concentrate on tablet mode first
  - thumb places for tablet mode



## Assets
- ✔️character sprites
- obstacle sprites
  - ✔️snowman
  - ✔️tree
  - ✔️rock
  - other skiers
  - other things 
    - poop
    - yellow snow
  - rewards
    - points for collecting items


## Tech
- p5.js
  - will use a spritesheet with the character animations
  - can probably use a different sheet for all the obstacles
- typescript