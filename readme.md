# Description
Create a silly ski game
It is for kids and can be silly and fun
The game area should scroll itself and player controls the character to left and right
Can also increase their speed by pressing down

# BUGS
- UI Text is blurry
- wrong color of jacket on skier 2
- wrong color on hat and jacket on skier 3

# TODO
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
## Difficulty
- ✔️variate the speed of the player.
  - ✔️different sections of the current "map/slope/level" could have different speeds
  - ✔️for now we could go with some set speeds, and then randomize between them
- ✔️variate the amount of obstacles
  - ✔️some sections could have more obstacles than others
  - ✔️some sections could have less obstacles than others
- ✔️Best is probably to do it as with visibility, that we have a difficulty slider
  100% is everything, blizzard, massive amount of obstacles and big slope so that player is going really fast
  0% is no obstacles, no slope, and no weather
  and then we increase the slider back and forth and get the different difficulty
- ✔️this means that 25% could be the same as fast speed with blizzard, as 25% could be slower speed with alot of obstacles and blizzard...
## other skiiers
- ai controlled skier that runs at a constant speed (for now) that doges the obstacles (including the player)
- later we could make a more complex ai that could work and do same things as a player
- They show up just like obstacles
  - a faster skier would start behind you and then pass you
  - a slower skier would start in front of you and then you would pass them
  - some of them are going more horizontal so that they are more of a risk to hit
  

# Improvements to weather changes
Advanced Implementation Ideas
Weather Zones: Create regions on the map with different typical weather patterns
Weather Warning System: Visual/audio cues before weather changes
Weather-Specific Obstacles: Snowdrifts that only appear during heavy snow
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