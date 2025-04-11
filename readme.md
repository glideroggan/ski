# Description
Create a silly ski game
It is for kids and can be silly and fun
The game area should scroll itself and player controls the character to left and right
Can also increase their speed by pressing down

# BUGS
- put back heightmap rotation, so it looks more "bumpy"
- menu showing distance covered needs adjustments, we should calculate meter better
- menu showing number of crashes, which is not needed
- skiier left falling is offsetted badly in the sprite
- ✔️We should fix Obstacle interface, it should be a class
  or not exists at all, it could be an interface instead and each creation of an actual obstacle, could be the tree, snowman or rock, could be sharing the logic....
  Take a look at entityManager.ts:293
- UI Text is blurry
- wrong color of jacket on skier 2
- wrong color on hat and jacket on skier 3

# TODO
- ✔️Should start refactor skier.update.ts, becoming big
- switch to use shaders and webGL
- fix the little face in the corner that can react to things happening in the game
  - need to generate the faces
    - idle
    - happy
    - sad
    - angry
    - surprised
    - scared
- choose between silly characters
  - image up to the left corner of the screen
    - should react to different things happening in the game
- obstacles
    - other skiers
    - other things 
      - poop
      - yellow snow
- rewards


# To implement
## better physics
- ✔️Introduce gravity
  today we move around the visualWOrldPosY based of the heightmap of the background, but we could instead add a variable to the skier, isOnGround. We still adjust the visualWorldPosY based on the heightmap.
  the calculation can be based on the heightmap.
  with gravity we reduce the visualWorldPosY by <gravity> and then we check if we are at the same or over the value, if that is the case, then isGrounded is true, otherwise isGrounded is false.
  and if we are not grounded, then we are technically falling/flying and we can apply the shadow and remove control of the skier.
  
## other skiiers
- ✔️ai controlled skier that runs at a constant speed (for now) that doges the obstacles (including the player)
- ✔️later we could make a more complex ai that could work and do same things as a player
- ✔️They show up just like obstacles
  - ✔️a faster skier would start behind you and then pass you
  - ✔️a slower skier would start in front of you and then you would pass them
  - ✔️some of them are going more horizontal so that they are more of a risk to hit
  

# Improvements to weather changes
Advanced Implementation Ideas
Weather Zones: Create regions on the map with different typical weather patterns
Weather Warning System: Visual/audio cues before weather changes
🔧Weather-Specific Obstacles: Snowdrifts that only appear during heavy snow
  - snowdrifts
    - ✔️fix an asset for it
    - ✔️generate an heightmap for it (dymamically/procedurally)
      - ✔️went with a procedural generation of the heightmap, so that it is not a static image, but a dynamic one
    - ✔️change the heightmap system, so that you can plug in the snowdrift heightmap when sampling over the collision box
    - ✔️fix logic so that skiers visualGroundposY is only forced when the Y-axis go down (up the screen), and is only changed by gravity in the other direction (down the screen, positive Y-axis)
    - ✔️also remember that when heightmap and visualGroundPosY are not the same, then skiier is not grounded, and we should apply the shadow and remove control of the skiier
  - ✔️changed to appear not only during heavy snow
  - ✔️will make the skiier jump
  - ✔️in flying state skier have no control
Special Equipment: Allow player to find and use items like goggles to improve visibility in storms

## FEATURES


## IDEAS
### Map progression
- once you finsh the first slope on the mountain, you will see a map of your progression, which will show additional slopes...
  - 🔧develop the idea
### Gameplay Mechanics
Ski Jump Ramps: Allow players to perform jumps and tricks for bonus points
Different Snow Types: Add ice patches (faster, less control) and deep powder (slower, more control)
Multiple Paths: Fork the ski run into easy/hard paths with different rewards
### Progression & Variety
Increasing Difficulty: Start with simple obstacles, gradually add more complex patterns
Day/Night Cycles: Skiing at night requires lanterns or glowing obstacles
Mountain Zones: Different themed areas (forest, village, mountain peak)
Difficulty Scaling: Weather could change more frequently as the game progresses, increasing the challenge
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
- obstacle sprites
  - ✔️snowman
  - ✔️tree
  - ✔️rock
  - ✔️other skiers
  - other things 
    - poop
    - yellow snow
  - rewards
    - points for collecting items


## Tech
- ✔️p5.js
  - ✔️will use a spritesheet with the character animations
  - ✔️can probably use a different sheet for all the obstacles
- ✔️typescript